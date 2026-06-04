import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

import { env } from "../../config/env";
import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { creditsClient, type CreditAccountResponse, type CreditTransactionResponse } from "../billing/creditsClient";
import { getCurrentUserFromHeaders } from "../auth/authService";

export type EnterpriseCreditsMember = {
  id: string;
  username: string;
  displayName: string;
  memberRole: "owner" | "admin" | "member";
  creditsUserId: number | null;
  accountScope: "personal" | "tenant";
  creditsTenantId: number | null;
  isOwner: boolean;
};

export type EnterpriseCreditsTransaction = {
  id: number;
  txnType: string;
  points: string;
  balanceBefore: string;
  balanceAfter: string;
  bizType: string | null;
  bizId: string | null;
  remark: string | null;
  createdAt: string;
  operatorUserId: string;
  operatorName: string;
  operatorRole: "owner" | "admin" | "member";
  isOwner: boolean;
};

export type EnterpriseCreditsOverview = {
  team: {
    id: string;
    name: string;
  };
  account: CreditAccountResponse | null;
  members: EnterpriseCreditsMember[];
  transactions: EnterpriseCreditsTransaction[];
};

type OperatorIdentity = {
  id: string;
  displayName: string;
  memberRole: "owner" | "admin" | "member";
  isOwner: boolean;
};

interface TaskOperatorRow extends RowDataPacket {
  id: string;
  subscription_user_key: string | null;
}

interface EnterpriseCreditsMemberRow extends RowDataPacket {
  id: string;
  username: string;
  display_name: string;
  member_role: string;
  credits_user_id: number | null;
  account_scope: "personal" | "tenant";
  credits_tenant_id: number | null;
}

interface CreditsAccountRow extends RowDataPacket {
  id: number;
  tenant_id: number | null;
  user_id: number | null;
  account_scope: "personal" | "tenant";
  total_balance: string;
  locked_balance: string;
  available_balance: string;
  currency: string;
  status: string;
}

let creditsPool: Pool | null = null;

function getCreditsPool() {
  if (!creditsPool) {
    creditsPool = mysql.createPool({
      host: env.credits.mysql.host,
      port: env.credits.mysql.port,
      database: env.credits.mysql.database,
      user: env.credits.mysql.user,
      password: env.credits.mysql.password,
      waitForConnections: true,
      connectionLimit: env.credits.mysql.connectionLimit,
      namedPlaceholders: true,
    });
  }
  return creditsPool;
}

const transactionTime = (transaction: CreditTransactionResponse) =>
  new Date(transaction.createdAt).getTime() || 0;

function normalizeMemberRole(value: string | null | undefined): "owner" | "admin" | "member" {
  if (value === "owner" || value === "admin") return value;
  return "member";
}

function pickActiveAccount(
  accounts: CreditAccountResponse[],
  identity: { accountScope: "personal" | "tenant"; tenantId?: number | null },
) {
  return (
    accounts.find(
      (account) =>
        account.accountScope === identity.accountScope &&
        (identity.accountScope !== "tenant" ||
          identity.tenantId == null ||
          account.tenantId === identity.tenantId),
    ) ??
    accounts.find((account) => account.status === "active") ??
    null
  );
}

async function loadFallbackAccount(identity: {
  userId: number;
  accountScope: "personal" | "tenant";
  tenantId?: number | null;
}) {
  const creditsPool = getCreditsPool();
  const [rows] = await creditsPool.query<CreditsAccountRow[]>(
    `SELECT
      id,
      tenant_id,
      user_id,
      account_scope,
      total_balance,
      locked_balance,
      available_balance,
      currency,
      status
    FROM credit_accounts
    WHERE user_id = :userId
      AND account_scope = :accountScope
      AND (
        :accountScope <> 'tenant'
        OR :tenantId IS NULL
        OR tenant_id = :tenantId
      )
    ORDER BY
      FIELD(status, 'active') DESC,
      id ASC
    LIMIT 1`,
    {
      userId: identity.userId,
      accountScope: identity.accountScope,
      tenantId: identity.tenantId ?? null,
    },
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    accountScope: row.account_scope,
    totalBalance: row.total_balance,
    lockedBalance: row.locked_balance,
    availableBalance: row.available_balance,
    currency: row.currency,
    status: row.status,
  } satisfies CreditAccountResponse;
}

async function loadTaskOperators(taskIds: string[]) {
  if (!taskIds.length) return new Map<string, string>();

  const [rows] = await pool.query<TaskOperatorRow[]>(
    `SELECT id, subscription_user_key
     FROM generation_tasks
     WHERE id IN (:taskIds)`,
    { taskIds },
  );

  const operators = new Map<string, string>();
  for (const row of rows) {
    if (row.subscription_user_key) {
      operators.set(row.id, row.subscription_user_key);
    }
  }
  return operators;
}

async function loadBatchItemOperators(itemIds: string[]) {
  if (!itemIds.length) return new Map<string, string>();

  const [rows] = await pool.query<TaskOperatorRow[]>(
    `SELECT bti.id, gt.subscription_user_key
     FROM batch_task_items bti
     JOIN generation_tasks gt ON gt.id = bti.generation_task_id
     WHERE bti.id IN (:itemIds)`,
    { itemIds },
  );

  const operators = new Map<string, string>();
  for (const row of rows) {
    if (row.subscription_user_key) {
      operators.set(row.id, row.subscription_user_key);
    }
  }
  return operators;
}

function resolveOperatorUserId(
  transaction: CreditTransactionResponse,
  ownerUserId: string,
  taskOperators: Map<string, string>,
  batchItemOperators: Map<string, string>,
) {
  if (transaction.bizType === "batch_item" && transaction.bizId) {
    return batchItemOperators.get(transaction.bizId) ?? ownerUserId;
  }
  if (transaction.bizId) {
    return taskOperators.get(transaction.bizId) ?? ownerUserId;
  }
  return ownerUserId;
}

async function buildEnterpriseRoster(
  headers?: Record<string, string | string[] | undefined>,
) {
  const current = await getCurrentUserFromHeaders(headers);
  if (!current) {
    throw errors.unauthorized("login is required");
  }

  if (!current.user.canViewEnterpriseChildren || !current.user.enterpriseTenantId) {
    throw errors.forbidden("not allowed to view enterprise credits overview");
  }

  const [rows] = await pool.query<EnterpriseCreditsMemberRow[]>(
    `SELECT
      u.id,
      u.username,
      u.display_name,
      em.member_role,
      u.credits_user_id,
      u.account_scope,
      u.credits_tenant_id
    FROM enterprise_members em
    JOIN app_users u ON u.id = em.user_id
    WHERE em.tenant_id = :tenantId
      AND em.status = 'active'
      AND u.status = 'active'
    ORDER BY
      FIELD(em.member_role, 'owner', 'admin', 'member'),
      u.display_name ASC`,
    {
      tenantId: current.user.enterpriseTenantId,
    },
  );

  const members: EnterpriseCreditsMember[] = rows.map((row) => {
    const memberRole = normalizeMemberRole(row.member_role);
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      memberRole,
      creditsUserId: row.credits_user_id,
      accountScope: row.account_scope === "tenant" ? "tenant" : "personal",
      creditsTenantId: row.credits_tenant_id,
      isOwner: memberRole === "owner",
    };
  });

  const memberMap = new Map<string, EnterpriseCreditsMember>();
  for (const member of members) {
    memberMap.set(member.id, member);
  }

  const owner = memberMap.get(current.user.id);
  if (!owner) {
    members.unshift({
      id: current.user.id,
      username: current.user.username,
      displayName: current.user.displayName,
      memberRole: "owner",
      creditsUserId: current.user.creditsUserId as number | null,
      accountScope: current.user.accountScope,
      creditsTenantId: current.user.creditsTenantId ?? null,
      isOwner: true,
    });
  }

  return {
    current,
    members,
  };
}

export async function getEnterpriseCreditsOverview(
  headers?: Record<string, string | string[] | undefined>,
): Promise<EnterpriseCreditsOverview> {
  const { current, members } = await buildEnterpriseRoster(headers);
  const teamId = current.user.enterpriseTenantId;

  if (!teamId) {
    throw errors.invalidParameter("enterprise tenant is required for credits overview", {
      userId: current.user.id,
    });
  }

  if (!current.user.creditsUserId) {
    throw errors.invalidParameter("current user is not linked to a credits account", {
      userId: current.user.id,
    });
  }

  const identity = {
    userId: current.user.creditsUserId,
    accountScope: current.user.accountScope,
    tenantId: current.user.accountScope === "tenant" ? current.user.creditsTenantId ?? null : null,
  } as const;

  const accountsResult = await creditsClient.listAccounts({ userId: identity.userId });
  const account =
    pickActiveAccount(accountsResult.accounts, identity) ?? (await loadFallbackAccount(identity));

  if (!account) {
    throw errors.invalidParameter("credit account not found for enterprise overview", {
      userId: identity.userId,
      accountScope: identity.accountScope,
      tenantId: identity.tenantId,
    });
  }

  const transactionResult = await creditsClient.listAccountTransactions({
    accountId: account.id,
    userId: identity.userId,
    limit: 100,
  });

  const transactions = transactionResult.transactions
    .slice()
    .sort((a, b) => transactionTime(b) - transactionTime(a));

  const taskIds = Array.from(
    new Set(
      transactions
        .filter((item) => item.bizType !== "batch_item" && item.bizId)
        .map((item) => item.bizId as string),
    ),
  );
  const batchItemIds = Array.from(
    new Set(
      transactions
        .filter((item) => item.bizType === "batch_item" && item.bizId)
        .map((item) => item.bizId as string),
    ),
  );

  const [taskOperators, batchItemOperators] = await Promise.all([
    loadTaskOperators(taskIds),
    loadBatchItemOperators(batchItemIds),
  ]);

  const operatorMap = new Map<string, OperatorIdentity>();
  for (const member of members) {
    operatorMap.set(member.id, {
      id: member.id,
      displayName: member.displayName,
      memberRole: member.memberRole,
      isOwner: member.isOwner,
    });
  }

  const enrichedTransactions: EnterpriseCreditsTransaction[] = transactions.map((transaction) => {
    const operatorUserId = resolveOperatorUserId(
      transaction,
      current.user.id,
      taskOperators,
      batchItemOperators,
    );
    const operator =
      operatorMap.get(operatorUserId) ??
      ({
        id: current.user.id,
        displayName: current.user.displayName,
        memberRole: "owner",
        isOwner: true,
      } satisfies OperatorIdentity);

    return {
      id: transaction.id,
      txnType: transaction.txnType,
      points: transaction.points,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      bizType: transaction.bizType,
      bizId: transaction.bizId,
      remark: transaction.remark,
      createdAt: transaction.createdAt,
      operatorUserId: operator.id,
      operatorName: operator.displayName,
      operatorRole: operator.memberRole,
      isOwner: operator.isOwner,
    };
  });

  return {
    team: {
      id: teamId,
      name: current.user.enterpriseTenantName ?? "企业团队",
    },
    account,
    members,
    transactions: enrichedTransactions,
  };
}
