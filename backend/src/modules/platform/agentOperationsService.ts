import type { Request } from "express";
import type { RowDataPacket } from "mysql2";
import mysql, { type Pool } from "mysql2/promise";

import { env } from "../../config/env";
import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import { listAgentDepositBalances } from "./agentDepositService";
import { getCommissionPolicy } from "./commissionPolicyService";
import { creditsBalanceKey, listCreditsBalances } from "./creditsBalanceLookup";

type AgentUserRow = RowDataPacket & {
  id: string;
  username: string;
  display_name: string;
};

type AgentCustomerRow = RowDataPacket & {
  id: string;
  application_code: string;
  relation_type: string;
  status: string;
  created_at: Date;
  created_by_user_id: string | null;
  created_by_username: string | null;
  created_by_display_name: string | null;
  created_by_role_code: string | null;
  customer_user_id: string;
  customer_username: string;
  customer_display_name: string;
  customer_phone: string | null;
  customer_credits_user_id: number;
  customer_account_scope: "personal" | "tenant";
  customer_credits_tenant_id: number | null;
};

type AgentCustomerUserType = "active" | "potential" | "low_frequency";

type AgentCustomerUsageStatsRow = RowDataPacket & {
  account_key: string;
  total_consumed_credits: string | number;
  consumption_transaction_count: string | number;
  last_consumed_at: Date | null;
  last_top_up_at: Date | null;
};

type AgentCustomerUsageStats = {
  totalConsumedCredits: number;
  consumptionTransactionCount: number;
  lastConsumedAt: string | null;
  lastTopUpAt: string | null;
  userType: {
    code: AgentCustomerUserType;
    label: string;
  };
};

type AgentCustomerLedgerRow = AgentCustomerRow & {
  enterprise_tenant_id: string | null;
  enterprise_tenant_name: string | null;
  enterprise_owner_user_id: string | null;
  enterprise_owner_credits_user_id: number | null;
};

type CreditsAccountRow = RowDataPacket & {
  id: number;
  tenant_id: number | null;
  user_id: number | null;
  account_scope: "personal" | "tenant";
  total_balance: string | number;
  locked_balance: string | number;
  available_balance: string | number;
  currency: string;
  status: string;
};

type CreditsTransactionRow = RowDataPacket & {
  id: number;
  tenant_id: number | null;
  user_id: number;
  account_id: number;
  billing_task_id: number | null;
  payment_order_id: number | null;
  application_id: number | null;
  application_code: string | null;
  application_name: string | null;
  function_id: number | null;
  function_code: string | null;
  function_name: string | null;
  txn_type: string;
  points: string | number;
  balance_before: string | number;
  balance_after: string | number;
  biz_type: string | null;
  biz_id: string | null;
  remark: string | null;
  created_at: Date;
};

type EnterpriseMemberIdentity = {
  credits_user_id: number | null;
  username: string;
  display_name: string;
  member_role: "owner" | "admin" | "member";
};

type EnterpriseMemberIdentityRow = RowDataPacket & EnterpriseMemberIdentity;

type BackOfficeOperatorRow = RowDataPacket & {
  id: string;
  username: string;
  display_name: string;
  role_code: string | null;
};

type BackOfficeAdjustmentRemark = {
  reason?: string;
  operatorUserId?: string;
  operatorRole?: string;
};

type AgentLeadRow = RowDataPacket & {
  id: string;
  application_code: string;
  customer_name: string;
  phone: string | null;
  source: string | null;
  stage: string;
  expected_points: string | number;
  note: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

type AgentCommissionRow = RowDataPacket & {
  id: string;
  application_code: string;
  period: string;
  consumed_points: string | number;
  commission_rate: string | number;
  commission_points: string | number;
  status: string;
  settlement_id: string | null;
  customer_user_id: string | null;
  customer_username: string | null;
  customer_display_name: string | null;
  created_at: Date;
};

type AgentCommissionTopUpRow = RowDataPacket & {
  id: number;
  tenant_id: number | null;
  user_id: number;
  account_id: number;
  payment_order_id: number | null;
  application_code: string | null;
  txn_type: string;
  points: string | number;
  biz_type: string | null;
  biz_id: string | null;
  remark: string | null;
  created_at: Date;
  period: string;
};

type AgentSettlementRow = RowDataPacket & {
  id: string;
  agent_user_id?: string;
  agent_username?: string;
  agent_display_name?: string;
  period: string;
  total_commission_points: string | number;
  status: string;
  requested_at: Date | null;
  approved_by_user_id?: string | null;
  approved_by_username?: string | null;
  approved_by_display_name?: string | null;
  approved_by_role_code?: string | null;
  confirmed_at: Date | null;
  paid_at: Date | null;
  created_at: Date;
};

type AgentCommissionTopUpTransaction = {
  id: number | string;
  createdAt: string;
  txnType: string;
  points: number;
  paymentOrderId: number | null;
  bizType: string | null;
  bizId: string | null;
  remark: string | null;
};

type AgentMaterialRow = RowDataPacket & {
  id: string;
  title: string;
  category: string;
  application_code: string | null;
  url: string;
  status: string;
  sort_order: number;
};

type AgentTicketRow = RowDataPacket & {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  last_message: string | null;
  created_at: Date;
  updated_at: Date;
};

type CustomerTopUpRow = RowDataPacket & {
  user_id?: number;
  tenant_id?: number;
  total_amount: string | number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const customerUserTypeDefinitions: Array<{
  code: AgentCustomerUserType;
  label: string;
  description: string;
}> = [
  {
    code: "active",
    label: "活跃用户",
    description: "1月内有充值且有积分消费的平台使用记录",
  },
  {
    code: "potential",
    label: "潜力用户",
    description: "1-3月内有充值，但近期消费/使用频率未达到活跃标准",
  },
  {
    code: "low_frequency",
    label: "低频用户",
    description: "6月内或更早曾充值/消费，但近期使用较少",
  },
];

let creditsPool: Pool | null = null;

function getCreditsPool() {
  if (!creditsPool) {
    creditsPool = mysql.createPool({
      host: env.credits.mysql.host,
      port: env.credits.mysql.port,
      database: env.credits.mysql.database,
      user: env.credits.mysql.user,
      password: env.credits.mysql.password,
      timezone: "Z",
      waitForConnections: true,
      connectionLimit: env.credits.mysql.connectionLimit,
      namedPlaceholders: true,
    });
  }
  return creditsPool;
}

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function toTimestamp(value: Date | string | null | undefined) {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function toIsoString(value: Date | string | null | undefined) {
  const time = toTimestamp(value);
  return time > 0 ? new Date(time).toISOString() : null;
}

export function classifyAgentCustomerUserType(input: {
  lastTopUpAt?: Date | string | null;
  lastConsumedAt?: Date | string | null;
  now?: Date;
}): AgentCustomerUserType {
  const now = input.now ?? new Date();
  const activeSince = now.getTime() - 30 * DAY_MS;
  const potentialSince = now.getTime() - 90 * DAY_MS;
  const lastTopUpTime = toTimestamp(input.lastTopUpAt);
  const lastConsumedTime = toTimestamp(input.lastConsumedAt);

  if (lastTopUpTime >= activeSince && lastConsumedTime >= activeSince) {
    return "active";
  }

  if (lastTopUpTime >= potentialSince) {
    return "potential";
  }

  return "low_frequency";
}

function userTypeLabel(code: AgentCustomerUserType) {
  return customerUserTypeDefinitions.find((item) => item.code === code)?.label ?? "低频用户";
}

const requiredText = (value: unknown, field: string, maxLength: number) => {
  if (typeof value !== "string") throw errors.invalidParameter(`${field} is required`);
  const normalized = value.trim();
  if (!normalized) throw errors.invalidParameter(`${field} is required`);
  if (normalized.length > maxLength) {
    throw errors.invalidParameter(`${field} is too long`, { field, maxLength });
  }
  return normalized;
};

const optionalText = (value: unknown, maxLength: number) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
};

async function getFirstActiveAgent() {
  const [rows] = await pool.query<AgentUserRow[]>(
    `SELECT u.id, u.username, u.display_name
     FROM back_office_role_assignments boa
     JOIN app_users u ON u.id = boa.user_id
     WHERE boa.role_code = 'agent'
       AND boa.status = 'active'
       AND u.status = 'active'
     ORDER BY boa.created_at ASC
     LIMIT 1`,
  );
  return rows[0] ?? null;
}

async function getAgentById(agentUserId: string) {
  const [rows] = await pool.query<AgentUserRow[]>(
    `SELECT u.id, u.username, u.display_name
     FROM back_office_role_assignments boa
     JOIN app_users u ON u.id = boa.user_id
     WHERE boa.user_id = :agentUserId
       AND boa.role_code = 'agent'
       AND boa.status = 'active'
       AND u.status = 'active'
     LIMIT 1`,
    { agentUserId },
  );
  return rows[0] ?? null;
}

async function resolveAgentUser(req: Request, requestedAgentUserId?: unknown) {
  const current = getRequiredCurrentUser(req);
  if (current.user.role === "agent") {
    return {
      id: current.user.id,
      username: current.user.username,
      display_name: current.user.displayName,
    };
  }

  if (current.user.role !== "developer" && current.user.role !== "admin") {
    throw errors.forbidden("agent operations require a back-office role");
  }

  const requested = optionalText(requestedAgentUserId, 64);
  const agent = requested ? await getAgentById(requested) : await getFirstActiveAgent();
  if (!agent) throw errors.invalidParameter("agent user is not available");
  return agent;
}

async function listAgentCustomers(agentUserId: string) {
  const [rows] = await pool.query<AgentCustomerRow[]>(
    `SELECT
       acr.id,
       acr.application_code,
       acr.relation_type,
       acr.status,
       acr.created_at,
       acl.created_by_user_id,
       creator.username created_by_username,
       creator.display_name created_by_display_name,
       acl.created_by_role_code,
       u.id customer_user_id,
       u.username customer_username,
       u.display_name customer_display_name,
       u.phone customer_phone,
       acr.customer_credits_user_id,
       u.account_scope customer_account_scope,
       u.credits_tenant_id customer_credits_tenant_id
     FROM agent_customer_relations acr
     JOIN app_users u ON u.id = acr.customer_user_id
     LEFT JOIN application_customer_links acl
       ON acl.user_id = acr.customer_user_id
      AND acl.application_code = acr.application_code
     LEFT JOIN app_users creator ON creator.id = acl.created_by_user_id
     WHERE acr.agent_user_id = :agentUserId
     ORDER BY acr.created_at DESC
     LIMIT 100`,
    { agentUserId },
  );

  const totalTopUpAmountByCustomer = await listCustomerTopUpAmounts(rows);
  const usageStatsByCustomer = await listAgentCustomerUsageStats(rows);
  const balances = await listCreditsBalances(
    rows.map((row) => ({
      creditsUserId: row.customer_credits_user_id,
      accountScope: row.customer_account_scope,
      creditsTenantId: row.customer_credits_tenant_id,
    })),
  );

  return rows.map((row) => {
    const balanceKey = creditsBalanceKey({
      creditsUserId: row.customer_credits_user_id,
      accountScope: row.customer_account_scope,
      creditsTenantId: row.customer_credits_tenant_id,
    }) ?? "";
    const usageStats = usageStatsByCustomer.get(customerTopUpKey(row)) ?? emptyCustomerUsageStats();

    return {
      id: row.id,
      applicationCode: row.application_code,
      relationType: row.relation_type,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      createdByUserId: row.created_by_user_id,
      createdByUsername: row.created_by_username,
      createdByDisplayName: row.created_by_display_name,
      createdByRole: row.created_by_role_code,
      customerUserId: row.customer_user_id,
      customerUsername: row.customer_username,
      customerDisplayName: row.customer_display_name,
      customerPhone: row.customer_phone,
      customerCreditsUserId: row.customer_credits_user_id,
      customerAccountScope: row.customer_account_scope,
      creditsTenantId: row.customer_credits_tenant_id,
      creditsAvailableBalance: balances.get(balanceKey)?.availableBalance ?? null,
      creditsTotalBalance: balances.get(balanceKey)?.totalBalance ?? null,
      totalTopUpAmount:
        totalTopUpAmountByCustomer.get(customerTopUpKey(row)) ?? 0,
      totalConsumedCredits: usageStats.totalConsumedCredits,
      consumptionTransactionCount: usageStats.consumptionTransactionCount,
      lastConsumedAt: usageStats.lastConsumedAt,
      lastTopUpAt: usageStats.lastTopUpAt,
      userType: usageStats.userType,
    };
  });
}

function customerTopUpKey(row: AgentCustomerRow) {
  if (row.customer_account_scope === "tenant" && row.customer_credits_tenant_id) {
    return `tenant:${row.customer_credits_tenant_id}`;
  }
  return `user:${row.customer_credits_user_id}`;
}

async function listCustomerTopUpAmounts(rows: AgentCustomerRow[]) {
  const result = new Map<string, number>();
  const personalCreditsUserIds = Array.from(
    new Set(
      rows
        .filter((row) => row.customer_account_scope !== "tenant")
        .map((row) => row.customer_credits_user_id)
        .filter(Boolean),
    ),
  );
  const tenantIds = Array.from(
    new Set(
      rows
        .filter((row) => row.customer_account_scope === "tenant" && row.customer_credits_tenant_id)
        .map((row) => row.customer_credits_tenant_id as number),
    ),
  );

  const creditsDb = getCreditsPool();

  if (personalCreditsUserIds.length) {
    const [personalRows] = await creditsDb.query<CustomerTopUpRow[]>(
      `SELECT user_id, COALESCE(SUM(amount), 0) total_amount
       FROM payment_orders
       WHERE status = 'paid'
         AND tenant_id IS NULL
         AND user_id IN (:userIds)
       GROUP BY user_id`,
      { userIds: personalCreditsUserIds },
    );
    for (const row of personalRows) {
      if (row.user_id) result.set(`user:${row.user_id}`, toNumber(row.total_amount));
    }
  }

  if (tenantIds.length) {
    const [tenantRows] = await creditsDb.query<CustomerTopUpRow[]>(
      `SELECT tenant_id, COALESCE(SUM(amount), 0) total_amount
       FROM payment_orders
       WHERE status = 'paid'
         AND tenant_id IN (:tenantIds)
       GROUP BY tenant_id`,
      { tenantIds },
    );
    for (const row of tenantRows) {
      if (row.tenant_id) result.set(`tenant:${row.tenant_id}`, toNumber(row.total_amount));
    }
  }

  return result;
}

function emptyCustomerUsageStats(): AgentCustomerUsageStats {
  const code = classifyAgentCustomerUserType({});
  return {
    totalConsumedCredits: 0,
    consumptionTransactionCount: 0,
    lastConsumedAt: null,
    lastTopUpAt: null,
    userType: {
      code,
      label: userTypeLabel(code),
    },
  };
}

async function listAgentCustomerUsageStats(rows: AgentCustomerRow[]) {
  const result = new Map<string, AgentCustomerUsageStats>();
  const personalCreditsUserIds = Array.from(
    new Set(
      rows
        .filter((row) => row.customer_account_scope !== "tenant")
        .map((row) => row.customer_credits_user_id)
        .filter(Boolean),
    ),
  );
  const tenantIds = Array.from(
    new Set(
      rows
        .filter((row) => row.customer_account_scope === "tenant" && row.customer_credits_tenant_id)
        .map((row) => row.customer_credits_tenant_id as number),
    ),
  );

  if (!personalCreditsUserIds.length && !tenantIds.length) return result;

  const clauses: string[] = [];
  const params: any = {
    insightTxnTypes: ["settle", "recharge", "bonus", "grant", "adjustment"],
    topUpTxnTypes: ["recharge", "bonus", "grant", "adjustment"],
  };

  if (personalCreditsUserIds.length) {
    clauses.push("(ct.tenant_id IS NULL AND ct.user_id IN (:personalCreditsUserIds))");
    params.personalCreditsUserIds = personalCreditsUserIds;
  }
  if (tenantIds.length) {
    clauses.push("ct.tenant_id IN (:tenantIds)");
    params.tenantIds = tenantIds;
  }

  const [statsRows] = await getCreditsPool().query<AgentCustomerUsageStatsRow[]>(
    `SELECT
       CASE
         WHEN ct.tenant_id IS NOT NULL THEN CONCAT('tenant:', ct.tenant_id)
         ELSE CONCAT('user:', ct.user_id)
       END account_key,
       COALESCE(SUM(CASE WHEN ct.txn_type = 'settle' THEN ABS(ct.points) ELSE 0 END), 0) total_consumed_credits,
       COALESCE(SUM(CASE WHEN ct.txn_type = 'settle' THEN 1 ELSE 0 END), 0) consumption_transaction_count,
       MAX(CASE WHEN ct.txn_type = 'settle' THEN ct.created_at ELSE NULL END) last_consumed_at,
       MAX(CASE
         WHEN ct.txn_type IN (:topUpTxnTypes) AND ct.points > 0 THEN ct.created_at
         ELSE NULL
       END) last_top_up_at
     FROM credit_transactions ct
     WHERE ct.txn_type IN (:insightTxnTypes)
       AND (${clauses.join(" OR ")})
     GROUP BY account_key`,
    params,
  );

  for (const row of statsRows) {
    const code = classifyAgentCustomerUserType({
      lastTopUpAt: row.last_top_up_at,
      lastConsumedAt: row.last_consumed_at,
    });
    result.set(row.account_key, {
      totalConsumedCredits: toNumber(row.total_consumed_credits),
      consumptionTransactionCount: toNumber(row.consumption_transaction_count),
      lastConsumedAt: toIsoString(row.last_consumed_at),
      lastTopUpAt: toIsoString(row.last_top_up_at),
      userType: {
        code,
        label: userTypeLabel(code),
      },
    });
  }

  return result;
}

async function loadAgentCustomerForLedger(agentUserId: string, relationId: string) {
  const [rows] = await pool.query<AgentCustomerLedgerRow[]>(
    `SELECT
       acr.id,
       acr.application_code,
       acr.relation_type,
       acr.status,
       acr.created_at,
       u.id customer_user_id,
       u.username customer_username,
       u.display_name customer_display_name,
       u.phone customer_phone,
       acr.customer_credits_user_id,
       u.account_scope customer_account_scope,
       u.credits_tenant_id customer_credits_tenant_id,
       em.tenant_id enterprise_tenant_id,
       et.name enterprise_tenant_name,
       et.owner_user_id enterprise_owner_user_id,
       owner.credits_user_id enterprise_owner_credits_user_id
     FROM agent_customer_relations acr
     JOIN app_users u ON u.id = acr.customer_user_id
     LEFT JOIN enterprise_members em
       ON em.user_id = u.id
      AND em.status = 'active'
     LEFT JOIN enterprise_tenants et
       ON et.id = em.tenant_id
      AND et.status = 'active'
     LEFT JOIN app_users owner ON owner.id = et.owner_user_id
     WHERE acr.id = :relationId
       AND acr.agent_user_id = :agentUserId
     LIMIT 1`,
    { agentUserId, relationId },
  );
  return rows[0] ?? null;
}

async function loadCustomerProfileForLedger(customerProfileId: string) {
  const [rows] = await pool.query<AgentCustomerLedgerRow[]>(
    `SELECT
       acl.id,
       acl.application_code,
       'direct' relation_type,
       acl.status,
       acl.created_at,
       u.id customer_user_id,
       u.username customer_username,
       u.display_name customer_display_name,
       u.phone customer_phone,
       acl.credits_user_id customer_credits_user_id,
       acl.account_scope customer_account_scope,
       acl.credits_tenant_id customer_credits_tenant_id,
       em.tenant_id enterprise_tenant_id,
       et.name enterprise_tenant_name,
       et.owner_user_id enterprise_owner_user_id,
       owner.credits_user_id enterprise_owner_credits_user_id
     FROM application_customer_links acl
     JOIN app_users u ON u.id = acl.user_id
     LEFT JOIN enterprise_members em
       ON em.user_id = u.id
      AND em.status = 'active'
     LEFT JOIN enterprise_tenants et
       ON et.id = em.tenant_id
      AND et.status = 'active'
     LEFT JOIN app_users owner ON owner.id = et.owner_user_id
     WHERE acl.id = :customerProfileId
     LIMIT 1`,
    { customerProfileId },
  );
  return rows[0] ?? null;
}

async function loadEnterpriseMemberIdentityByCreditsUserId(tenantId: string | null) {
  if (!tenantId) return new Map<number, EnterpriseMemberIdentity>();
  const [rows] = await pool.query<EnterpriseMemberIdentityRow[]>(
    `SELECT
       u.credits_user_id,
       u.username,
       u.display_name,
       em.member_role
     FROM enterprise_members em
     JOIN app_users u ON u.id = em.user_id
     WHERE em.tenant_id = :tenantId
       AND em.status = 'active'
       AND u.credits_user_id IS NOT NULL`,
    { tenantId },
  );
  return new Map(
    rows
      .filter((row) => row.credits_user_id)
      .map((row) => [row.credits_user_id as number, row]),
  );
}

async function loadCreditsAccountForCustomer(customer: AgentCustomerLedgerRow) {
  const creditsDb = getCreditsPool();
  const params =
    customer.customer_account_scope === "tenant" && customer.customer_credits_tenant_id
      ? {
          accountScope: "tenant",
          creditsUserId: null,
          creditsTenantId: customer.customer_credits_tenant_id,
        }
      : {
          accountScope: "personal",
          creditsUserId: customer.customer_credits_user_id,
          creditsTenantId: null,
        };

  const [rows] = await creditsDb.query<CreditsAccountRow[]>(
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
     WHERE account_scope = :accountScope
       AND (
         (:accountScope = 'tenant' AND tenant_id = :creditsTenantId AND user_id IS NULL)
         OR
         (:accountScope = 'personal' AND user_id = :creditsUserId AND tenant_id IS NULL)
       )
       AND status = 'active'
     ORDER BY id ASC
     LIMIT 1`,
    params,
  );

  return rows[0] ?? null;
}

function identityLabelForTransaction(
  transaction: CreditsTransactionRow,
  customer: AgentCustomerLedgerRow,
  memberByCreditsUserId: Map<number, EnterpriseMemberIdentity>,
) {
  if (customer.customer_account_scope !== "tenant") return "客户";

  const member = memberByCreditsUserId.get(transaction.user_id);
  if (transaction.user_id === customer.enterprise_owner_credits_user_id) return "主账号";
  if (member?.member_role === "owner") return "主账号";
  if (member) return "子账号";
  return "团队成员";
}

function roleIdentityLabel(role: string | null | undefined) {
  if (role === "developer") return "开发者";
  if (role === "admin") return "管理员";
  if (role === "agent") return "代理商";
  if (role === "user" || role === "enterprise") return "客户";
  return null;
}

function parseBackOfficeAdjustmentRemark(remark: string | null): BackOfficeAdjustmentRemark | null {
  if (!remark) return null;

  try {
    const parsed = JSON.parse(remark) as Record<string, unknown>;
    const operatorUserId =
      typeof parsed.operatorUserId === "string" ? parsed.operatorUserId : undefined;
    if (!operatorUserId) return null;

    return {
      operatorUserId,
      operatorRole: typeof parsed.operatorRole === "string" ? parsed.operatorRole : undefined,
      reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
    };
  } catch {
    return null;
  }
}

async function loadBackOfficeOperatorsByUserId(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const result = new Map<string, BackOfficeOperatorRow>();
  if (!uniqueIds.length) return result;

  const [rows] = await pool.query<BackOfficeOperatorRow[]>(
    `SELECT
       u.id,
       u.username,
       u.display_name,
       MAX(boa.role_code) role_code
     FROM app_users u
     LEFT JOIN back_office_role_assignments boa
       ON boa.user_id = u.id
      AND boa.status = 'active'
      AND boa.role_code IN ('developer', 'admin', 'agent')
     WHERE u.id IN (:userIds)
     GROUP BY u.id, u.username, u.display_name`,
    { userIds: uniqueIds },
  );

  for (const row of rows) result.set(row.id, row);
  return result;
}

function remarkTextForTransaction(row: CreditsTransactionRow) {
  const adjustmentRemark = parseBackOfficeAdjustmentRemark(row.remark);
  return adjustmentRemark?.reason ?? row.remark;
}

async function listLedgerTransactions(input: {
  accountId: number;
  customer: AgentCustomerLedgerRow;
}) {
  const creditsDb = getCreditsPool();
  const memberByCreditsUserId = await loadEnterpriseMemberIdentityByCreditsUserId(
    input.customer.enterprise_tenant_id,
  );
  if (
    input.customer.customer_account_scope !== "tenant" &&
    input.customer.customer_credits_user_id
  ) {
    memberByCreditsUserId.set(input.customer.customer_credits_user_id, {
      credits_user_id: input.customer.customer_credits_user_id,
      username: input.customer.customer_username,
      display_name: input.customer.customer_display_name,
      member_role: "member",
    });
  }

  const [rows] = await creditsDb.query<CreditsTransactionRow[]>(
    `SELECT
       ct.id,
       ct.tenant_id,
       ct.user_id,
       ct.account_id,
       ct.billing_task_id,
       ct.payment_order_id,
       ct.application_id,
       app.code application_code,
       app.name application_name,
       ct.function_id,
       fn.code function_code,
       fn.name function_name,
       ct.txn_type,
       ct.points,
       ct.balance_before,
       ct.balance_after,
       ct.biz_type,
       ct.biz_id,
       ct.remark,
       ct.created_at
     FROM credit_transactions ct
     LEFT JOIN applications app ON app.id = ct.application_id
     LEFT JOIN application_functions fn ON fn.id = ct.function_id
     WHERE ct.account_id = :accountId
     ORDER BY ct.created_at DESC, ct.id DESC
     LIMIT 100`,
    { accountId: input.accountId },
  );

  const operatorUserIds = rows
    .filter((row) => row.biz_type === "back-office-adjustment")
    .map((row) => parseBackOfficeAdjustmentRemark(row.remark)?.operatorUserId)
    .filter((userId): userId is string => Boolean(userId));
  const operatorByUserId = await loadBackOfficeOperatorsByUserId(operatorUserIds);

  return rows.map((row) => {
    const member = memberByCreditsUserId.get(row.user_id);
    const adjustmentRemark =
      row.biz_type === "back-office-adjustment"
        ? parseBackOfficeAdjustmentRemark(row.remark)
        : null;
    const operator = adjustmentRemark?.operatorUserId
      ? operatorByUserId.get(adjustmentRemark.operatorUserId)
      : null;
    const operatorUsername = operator?.username ?? adjustmentRemark?.operatorUserId ?? null;
    const operatorRoleLabel = adjustmentRemark
      ? roleIdentityLabel(adjustmentRemark.operatorRole ?? operator?.role_code)
      : null;

    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      accountId: row.account_id,
      billingTaskId: row.billing_task_id,
      paymentOrderId: row.payment_order_id,
      applicationId: row.application_id,
      applicationCode: row.application_code,
      applicationName: row.application_name,
      functionId: row.function_id,
      functionCode: row.function_code,
      functionName: row.function_name,
      txnType: row.txn_type,
      points: toNumber(row.points),
      balanceBefore: toNumber(row.balance_before),
      balanceAfter: toNumber(row.balance_after),
      bizType: row.biz_type,
      bizId: row.biz_id,
      remark: remarkTextForTransaction(row),
      actorUsername: operatorUsername ?? member?.username ?? null,
      actorDisplayName: operatorUsername ?? member?.display_name ?? null,
      actorIdentityLabel:
        operatorRoleLabel ?? identityLabelForTransaction(row, input.customer, memberByCreditsUserId),
      createdAt: row.created_at.toISOString(),
    };
  });
}

async function buildCustomerLedgerResponse(customer: AgentCustomerLedgerRow) {
  const account = await loadCreditsAccountForCustomer(customer);
  const profile = {
    id: customer.id,
    applicationCode: customer.application_code,
    relationType: customer.relation_type,
    status: customer.status,
    createdAt: customer.created_at.toISOString(),
    customerUserId: customer.customer_user_id,
    customerUsername: customer.customer_username,
    customerDisplayName: customer.customer_display_name,
    customerPhone: customer.customer_phone,
    customerCreditsUserId: customer.customer_credits_user_id,
    accountScope: customer.customer_account_scope,
    creditsTenantId: customer.customer_credits_tenant_id,
    enterpriseTenantId: customer.enterprise_tenant_id,
    enterpriseTenantName: customer.enterprise_tenant_name,
    enterpriseOwnerUserId: customer.enterprise_owner_user_id,
    enterpriseAccountRole: customer.customer_account_scope === "tenant" ? "team" : "personal",
  };

  if (!account) {
    return {
      customer: profile,
      account: null,
      transactions: [],
    };
  }

  return {
    customer: profile,
    account: {
      id: account.id,
      tenantId: account.tenant_id,
      userId: account.user_id,
      accountScope: account.account_scope,
      totalBalance: toNumber(account.total_balance),
      lockedBalance: toNumber(account.locked_balance),
      availableBalance: toNumber(account.available_balance),
      currency: account.currency,
      status: account.status,
    },
    transactions: await listLedgerTransactions({
      accountId: account.id,
      customer,
    }),
  };
}

export async function getAgentTransactionsLedger(req: Request) {
  const agent = await resolveAgentUser(req, req.query.agentUserId);
  const customers = (await listAgentCustomers(agent.id)).filter((customer) => customer.status === "active");
  const rows = await Promise.all(
    customers.map(async (customer) => {
      const ledgerCustomer = await loadAgentCustomerForLedger(agent.id, customer.id);
      if (!ledgerCustomer) return [];
      const account = await loadCreditsAccountForCustomer(ledgerCustomer);
      if (!account) return [];
      const transactions = await listLedgerTransactions({
        accountId: account.id,
        customer: ledgerCustomer,
      });
      return transactions.map((transaction) => ({
        ...transaction,
        relationId: customer.id,
        customerUserId: customer.customerUserId,
        customerUsername: customer.customerUsername,
        customerDisplayName: customer.customerDisplayName,
        customerPhone: customer.customerPhone,
        applicationCode: transaction.applicationCode ?? customer.applicationCode,
        accountScope: customer.customerAccountScope,
      }));
    }),
  );
  const transactions = rows
    .flat()
    .sort((a, b) => {
      const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return String(b.id).localeCompare(String(a.id));
    })
    .slice(0, 300);

  return {
    agent: {
      userId: agent.id,
      username: agent.username,
      displayName: agent.display_name,
    },
    transactions,
    transactionInsights: buildAgentTransactionInsights(transactions),
  };
}

type AgentLedgerTransactionItem = Awaited<ReturnType<typeof listLedgerTransactions>>[number] & {
  relationId?: string;
  customerUserId?: string;
  customerUsername?: string;
  customerDisplayName?: string;
  customerPhone?: string | null;
  accountScope?: string;
};

function buildAgentTransactionInsights(transactions: AgentLedgerTransactionItem[]) {
  const settledTransactions = transactions.filter((item) => item.txnType === "settle");
  const consumersByUserId = new Map<string, {
    relationId?: string;
    customerUserId: string;
    customerUsername: string | null;
    customerDisplayName: string | null;
    customerPhone: string | null;
    consumedCredits: number;
    transactionCount: number;
    lastConsumedAt: string | null;
  }>();
  const functionsByKey = new Map<string, {
    functionCode: string | null;
    functionName: string;
    usageCount: number;
    consumedCredits: number;
  }>();

  for (const transaction of settledTransactions) {
    const consumedCredits = Math.abs(toNumber(transaction.points));
    if (consumedCredits <= 0) continue;

    const customerUserId = String(transaction.customerUserId ?? transaction.userId);
    const consumer = consumersByUserId.get(customerUserId) ?? {
      relationId: transaction.relationId,
      customerUserId,
      customerUsername: transaction.customerUsername ?? null,
      customerDisplayName: transaction.customerDisplayName ?? null,
      customerPhone: transaction.customerPhone ?? null,
      consumedCredits: 0,
      transactionCount: 0,
      lastConsumedAt: null,
    };
    consumer.consumedCredits += consumedCredits;
    consumer.transactionCount += 1;
    if (!consumer.lastConsumedAt || transaction.createdAt > consumer.lastConsumedAt) {
      consumer.lastConsumedAt = transaction.createdAt;
    }
    consumersByUserId.set(customerUserId, consumer);

    const functionCode = transaction.functionCode ?? null;
    const functionName = transaction.functionName ?? functionCode ?? "未标记功能";
    const functionKey = functionCode ?? functionName;
    const functionUsage = functionsByKey.get(functionKey) ?? {
      functionCode,
      functionName,
      usageCount: 0,
      consumedCredits: 0,
    };
    functionUsage.usageCount += 1;
    functionUsage.consumedCredits += consumedCredits;
    functionsByKey.set(functionKey, functionUsage);
  }

  return {
    topCreditConsumers: Array.from(consumersByUserId.values())
      .sort((a, b) => {
        const consumedDiff = b.consumedCredits - a.consumedCredits;
        if (consumedDiff !== 0) return consumedDiff;
        return (b.lastConsumedAt ?? "").localeCompare(a.lastConsumedAt ?? "");
      })
      .slice(0, 5)
      .map((item) => ({
        ...item,
        consumedCredits: Number(item.consumedCredits.toFixed(4)),
      })),
    functionUsageDistribution: Array.from(functionsByKey.values())
      .sort((a, b) => {
        const countDiff = b.usageCount - a.usageCount;
        if (countDiff !== 0) return countDiff;
        return b.consumedCredits - a.consumedCredits;
      })
      .map((item) => ({
        ...item,
        consumedCredits: Number(item.consumedCredits.toFixed(4)),
      })),
    generatedAt: new Date().toISOString(),
  };
}

async function listAgentLeads(agentUserId: string) {
  const [rows] = await pool.query<AgentLeadRow[]>(
    `SELECT id, application_code, customer_name, phone, source, stage,
            expected_points, note, status, created_at, updated_at
     FROM agent_leads
     WHERE agent_user_id = :agentUserId
     ORDER BY updated_at DESC
     LIMIT 100`,
    { agentUserId },
  );

  return rows.map((row) => ({
    id: row.id,
    applicationCode: row.application_code,
    customerName: row.customer_name,
    phone: row.phone,
    source: row.source,
    stage: row.stage,
    expectedPoints: toNumber(row.expected_points),
    note: row.note,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

async function getEffectiveAgentCommissionRate(agentUserId: string) {
  const [rows] = await pool.query<Array<RowDataPacket & { commission_rate: string | number | null }>>(
    `SELECT commission_rate
     FROM back_office_agent_policy_overrides
     WHERE agent_user_id = :agentUserId
     LIMIT 1`,
    { agentUserId },
  );
  const overrideRate = rows[0]?.commission_rate;
  return overrideRate === null || overrideRate === undefined
    ? getCommissionPolicy().commissionRate
    : toNumber(overrideRate);
}

type AgentCustomerListItem = Awaited<ReturnType<typeof listAgentCustomers>>[number];

function commissionCustomerKey(customer: AgentCustomerListItem) {
  if (customer.customerAccountScope === "tenant" && customer.creditsTenantId) {
    return `tenant:${customer.creditsTenantId}`;
  }
  return `user:${customer.customerCreditsUserId}`;
}

function topUpTransactionKey(row: AgentCommissionTopUpRow) {
  if (row.tenant_id) return `tenant:${row.tenant_id}`;
  return `user:${row.user_id}`;
}

async function listCommissionTopUpTransactions(customers: AgentCustomerListItem[]) {
  const personalUserIds = Array.from(
    new Set(
      customers
        .filter((customer) => customer.status === "active" && customer.customerAccountScope !== "tenant")
        .map((customer) => customer.customerCreditsUserId)
        .filter(Boolean),
    ),
  );
  const tenantIds = Array.from(
    new Set(
      customers
        .filter((customer) => customer.status === "active" && customer.customerAccountScope === "tenant")
        .map((customer) => customer.creditsTenantId)
        .filter((tenantId): tenantId is number => Boolean(tenantId)),
    ),
  );

  if (!personalUserIds.length && !tenantIds.length) return [];

  const clauses: string[] = [];
  const params: any = {
    topUpTxnTypes: ["recharge", "bonus", "grant", "adjustment"],
  };

  if (personalUserIds.length) {
    clauses.push("(ct.tenant_id IS NULL AND ct.user_id IN (:personalUserIds))");
    params.personalUserIds = personalUserIds;
  }
  if (tenantIds.length) {
    clauses.push("ct.tenant_id IN (:tenantIds)");
    params.tenantIds = tenantIds;
  }

  const [rows] = await getCreditsPool().query<AgentCommissionTopUpRow[]>(
    `SELECT
       ct.id,
       ct.tenant_id,
       ct.user_id,
       ct.account_id,
       ct.payment_order_id,
       app.code application_code,
       ct.txn_type,
       ct.points,
       ct.biz_type,
       ct.biz_id,
       ct.remark,
       ct.created_at,
       DATE_FORMAT(ct.created_at, '%Y-%m') period
     FROM credit_transactions ct
     LEFT JOIN applications app ON app.id = ct.application_id
     WHERE ct.points > 0
       AND ct.txn_type IN (:topUpTxnTypes)
       AND (${clauses.join(" OR ")})
     ORDER BY ct.created_at DESC, ct.id DESC
     LIMIT 500`,
    params,
  );

  return rows;
}

async function loadAgentSettlementBills(agentUserId: string) {
  const [rows] = await pool.query<AgentSettlementRow[]>(
    `SELECT id, period, total_commission_points, status, requested_at, confirmed_at, paid_at, created_at
     FROM agent_settlement_bills
     WHERE agent_user_id = :agentUserId
     ORDER BY period DESC, created_at DESC
     LIMIT 200`,
    { agentUserId },
  );

  return rows;
}

function groupSettlementBillsByPeriod(rows: AgentSettlementRow[]) {
  const grouped = new Map<string, AgentSettlementRow[]>();
  for (const row of rows) {
    grouped.set(row.period, [...(grouped.get(row.period) ?? []), row]);
  }
  return grouped;
}

function settlementCutoffAt(row: AgentSettlementRow) {
  return row.requested_at ?? row.paid_at ?? row.confirmed_at ?? row.created_at;
}

function isTopUpCoveredBySubmittedSettlement(
  transaction: { period: string; created_at: Date },
  settlementsByPeriod: Map<string, AgentSettlementRow[]>,
) {
  const rows = settlementsByPeriod.get(transaction.period) ?? [];
  return rows
    .filter((row) => row.status !== "draft")
    .some((row) => transaction.created_at.getTime() <= settlementCutoffAt(row).getTime());
}

function latestDraftSettlementForPeriod(
  period: string,
  settlementsByPeriod: Map<string, AgentSettlementRow[]>,
) {
  return (settlementsByPeriod.get(period) ?? [])
    .filter((row) => row.status === "draft")
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] ?? null;
}

async function buildAgentCommissionPreviews(agentUserId: string) {
  const [commissionRate, customers] = await Promise.all([
    getEffectiveAgentCommissionRate(agentUserId),
    listAgentCustomers(agentUserId),
  ]);
  const customerByKey = new Map(customers.map((customer) => [commissionCustomerKey(customer), customer]));
  const transactions = await listCommissionTopUpTransactions(customers);
  const settlementRows = await loadAgentSettlementBills(agentUserId);
  const settlementsByPeriod = groupSettlementBillsByPeriod(settlementRows);
  const grouped = new Map<string, {
    applicationCode: string;
    period: string;
    customer: AgentCustomerListItem;
    topUpCredits: number;
    transactions: AgentCommissionTopUpTransaction[];
  }>();

  for (const transaction of transactions) {
    if (isTopUpCoveredBySubmittedSettlement(transaction, settlementsByPeriod)) continue;

    const customer = customerByKey.get(topUpTransactionKey(transaction));
    if (!customer) continue;
    const applicationCode = transaction.application_code ?? customer.applicationCode;
    const key = `${transaction.period}:${applicationCode}:${customer.customerUserId}`;
    const group = grouped.get(key) ?? {
      applicationCode,
      period: transaction.period,
      customer,
      topUpCredits: 0,
      transactions: [],
    };
    const points = toNumber(transaction.points);
    group.topUpCredits += points;
    group.transactions.push({
      id: transaction.id,
      createdAt: transaction.created_at.toISOString(),
      txnType: transaction.txn_type,
      points,
      paymentOrderId: transaction.payment_order_id,
      bizType: transaction.biz_type,
      bizId: transaction.biz_id,
      remark: parseBackOfficeAdjustmentRemark(transaction.remark)?.reason ?? transaction.remark,
    });
    grouped.set(key, group);
  }

  const computedPreviews = Array.from(grouped.values())
    .map((group) => {
      const topUpCredits = Number(group.topUpCredits.toFixed(4));
      const settlement = latestDraftSettlementForPeriod(group.period, settlementsByPeriod);
      return {
        id: `acp:${agentUserId}:${group.period}:${group.applicationCode}:${group.customer.customerUserId}`,
        applicationCode: group.applicationCode,
        period: group.period,
        consumedPoints: topUpCredits,
        topUpCredits,
        commissionRate,
        commissionPoints: Number((topUpCredits * commissionRate).toFixed(4)),
        status: settlement?.status ?? "preview",
        settlementId: settlement?.id ?? null,
        customerUserId: group.customer.customerUserId,
        customerUsername: group.customer.customerUsername,
        customerDisplayName: group.customer.customerDisplayName,
        topUpTransactions: group.transactions,
        createdAt: group.transactions[0]?.createdAt ?? new Date().toISOString(),
      };
    })
    .sort((a, b) => b.period.localeCompare(a.period) || b.createdAt.localeCompare(a.createdAt));

  const existingKeys = new Set(
    computedPreviews.map((preview) =>
      `${preview.period}:${preview.applicationCode}:${preview.customerUserId ?? ""}`,
    ),
  );
  const fallbackRows = await listStoredAgentCommissionPreviews(agentUserId, commissionRate, settlementsByPeriod);
  return [
    ...computedPreviews,
    ...fallbackRows.filter((preview) =>
      !existingKeys.has(`${preview.period}:${preview.applicationCode}:${preview.customerUserId ?? ""}`),
    ),
  ]
    .sort((a, b) => b.period.localeCompare(a.period) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}

async function listStoredAgentCommissionPreviews(
  agentUserId: string,
  commissionRate: number,
  settlementsByPeriod: Map<string, AgentSettlementRow[]>,
) {
  const [rows] = await pool.query<AgentCommissionRow[]>(
    `SELECT
       acp.id,
       acp.application_code,
       acp.period,
       acp.consumed_points,
       acp.commission_rate,
       acp.commission_points,
       acp.status,
       acp.settlement_id,
       acp.customer_user_id,
       u.username customer_username,
       u.display_name customer_display_name,
       acp.created_at
     FROM agent_commission_previews acp
     LEFT JOIN app_users u ON u.id = acp.customer_user_id
     WHERE acp.agent_user_id = :agentUserId
     ORDER BY acp.period DESC, acp.created_at DESC
     LIMIT 100`,
    { agentUserId },
  );

  return rows.map((row) => {
    const topUpCredits = toNumber(row.consumed_points);
    const effectiveRate = commissionRate;
    const settlement = latestDraftSettlementForPeriod(row.period, settlementsByPeriod);
    return {
      id: row.id,
      applicationCode: row.application_code,
      period: row.period,
      consumedPoints: topUpCredits,
      topUpCredits,
      commissionRate: effectiveRate,
      commissionPoints: Number((topUpCredits * effectiveRate).toFixed(4)),
      status: settlement?.status ?? row.status,
      settlementId: settlement?.id ?? row.settlement_id,
      customerUserId: row.customer_user_id,
      customerUsername: row.customer_username,
      customerDisplayName: row.customer_display_name,
      topUpTransactions: topUpCredits > 0
        ? [{
            id: row.id,
            createdAt: row.created_at.toISOString(),
            txnType: "commission_preview",
            points: topUpCredits,
            paymentOrderId: null,
            bizType: "stored_commission_preview",
            bizId: row.settlement_id,
            remark: "历史返佣预览汇总（无单笔充值流水）",
          }]
        : [],
      createdAt: row.created_at.toISOString(),
    };
  }).filter((preview) => {
    const createdAt = rows.find((row) => row.id === preview.id)?.created_at;
    if (!createdAt) return true;
    return !isTopUpCoveredBySubmittedSettlement(
      { period: preview.period, created_at: createdAt },
      settlementsByPeriod,
    );
  });
}

async function syncAgentSettlementBills(agentUserId: string, previews: Awaited<ReturnType<typeof buildAgentCommissionPreviews>>) {
  const totals = new Map<string, number>();
  for (const preview of previews) {
    totals.set(preview.period, (totals.get(preview.period) ?? 0) + preview.commissionPoints);
  }

  const connection = await pool.getConnection();
  const lockName = `agent_settlement_sync:${agentUserId}`;
  try {
    await connection.query(`SELECT GET_LOCK(:lockName, 5)`, { lockName });

    for (const [period, totalCommissionPoints] of totals) {
      const [draftRows] = await connection.query<AgentSettlementRow[]>(
        `SELECT id, period, total_commission_points, status, requested_at, confirmed_at, paid_at, created_at
         FROM agent_settlement_bills
         WHERE agent_user_id = :agentUserId
           AND period = :period
           AND status = 'draft'
         ORDER BY created_at DESC, id DESC`,
        { agentUserId, period },
      );

      const draft = draftRows[0];
      if (draft) {
        if (draftRows.length > 1) {
          await connection.query(
            `DELETE FROM agent_settlement_bills
             WHERE id IN (:duplicateIds)
               AND status = 'draft'`,
            { duplicateIds: draftRows.slice(1).map((row) => row.id) },
          );
        }

        await connection.query(
          `UPDATE agent_settlement_bills
           SET total_commission_points = :totalCommissionPoints
           WHERE id = :id
             AND status = 'draft'`,
          {
            id: draft.id,
            totalCommissionPoints: totalCommissionPoints.toFixed(4),
          },
        );
        continue;
      }

      await connection.query(
        `INSERT INTO agent_settlement_bills
          (id, agent_user_id, period, total_commission_points, status)
         VALUES
          (:id, :agentUserId, :period, :totalCommissionPoints, 'draft')`,
        {
          id: createId("asb"),
          agentUserId,
          period,
          totalCommissionPoints: totalCommissionPoints.toFixed(4),
        },
      );
    }
  } finally {
    try {
      await connection.query(`SELECT RELEASE_LOCK(:lockName)`, { lockName });
    } finally {
      connection.release();
    }
  }
}

async function listAgentCommissionPreviews(agentUserId: string) {
  const previews = await buildAgentCommissionPreviews(agentUserId);
  await syncAgentSettlementBills(agentUserId, previews);
  return buildAgentCommissionPreviews(agentUserId);
}

async function listAgentSettlementBills(agentUserId: string) {
  const previews = await buildAgentCommissionPreviews(agentUserId);
  await syncAgentSettlementBills(agentUserId, previews);
  const settlementRows = await loadAgentSettlementBills(agentUserId);
  return settlementRows.map((row) => ({
    id: row.id,
    period: row.period,
    totalCommissionPoints: toNumber(row.total_commission_points),
    status: row.status,
    requestedAt: row.requested_at?.toISOString() ?? null,
    confirmedAt: row.confirmed_at?.toISOString() ?? null,
    paidAt: row.paid_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  }));
}

async function listAgentMaterials() {
  const [rows] = await pool.query<AgentMaterialRow[]>(
    `SELECT id, title, category, application_code, url, status, sort_order
     FROM agent_materials
     WHERE status = 'active'
     ORDER BY sort_order ASC, created_at DESC
     LIMIT 100`,
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    applicationCode: row.application_code,
    url: row.url,
    status: row.status,
    sortOrder: row.sort_order,
  }));
}

async function listAgentTickets(agentUserId: string) {
  const [rows] = await pool.query<AgentTicketRow[]>(
    `SELECT id, subject, category, priority, status, last_message, created_at, updated_at
     FROM agent_support_tickets
     WHERE agent_user_id = :agentUserId
     ORDER BY updated_at DESC
     LIMIT 100`,
    { agentUserId },
  );

  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    status: row.status,
    lastMessage: row.last_message,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

type AgentCustomerOverviewItem = Awaited<ReturnType<typeof listAgentCustomers>>[number];

function buildAgentCustomerInsights(customers: AgentCustomerOverviewItem[]) {
  const activeCustomers = customers.filter((item) => item.status === "active");
  const distribution = customerUserTypeDefinitions.map((definition) => ({
    ...definition,
    count: activeCustomers.filter((item) => item.userType.code === definition.code).length,
  }));
  const topTopUpCustomers = activeCustomers
    .filter((item) => item.totalTopUpAmount > 0)
    .sort((a, b) => {
      const topUpDiff = b.totalTopUpAmount - a.totalTopUpAmount;
      if (topUpDiff !== 0) return topUpDiff;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, 5)
    .map((item) => ({
      relationId: item.id,
      customerUserId: item.customerUserId,
      customerUsername: item.customerUsername,
      customerDisplayName: item.customerDisplayName,
      customerPhone: item.customerPhone,
      applicationCode: item.applicationCode,
      totalTopUpAmount: item.totalTopUpAmount,
    }));

  return {
    topTopUpCustomers,
    userTypeDistribution: distribution,
    generatedAt: new Date().toISOString(),
  };
}

export async function getAgentOperationsOverview(req: Request) {
  const agent = await resolveAgentUser(req, req.query.agentUserId);
  const [customers, leads, commissionPreviews, settlementBills, materials, tickets, depositBalances] =
    await Promise.all([
      listAgentCustomers(agent.id),
      listAgentLeads(agent.id),
      listAgentCommissionPreviews(agent.id),
      listAgentSettlementBills(agent.id),
      listAgentMaterials(),
      listAgentTickets(agent.id),
      listAgentDepositBalances([agent.id]),
    ]);
  const depositBalance = depositBalances.get(agent.id);

  return {
    agent: {
      userId: agent.id,
      username: agent.username,
      displayName: agent.display_name,
      depositBalance: depositBalance?.balance ?? 0,
      depositCurrency: depositBalance?.currency ?? "CNY",
    },
    metrics: {
      customerCount: customers.filter((item) => item.status === "active").length,
      activeLeadCount: leads.filter((item) => item.status === "active").length,
      previewCommissionPoints: commissionPreviews
        .filter((item) => item.status === "preview")
        .reduce((sum, item) => sum + item.commissionPoints, 0),
      draftSettlementCount: settlementBills.filter((item) => item.status === "draft").length,
      openTicketCount: tickets.filter((item) => item.status !== "closed").length,
    },
    customers,
    customerInsights: buildAgentCustomerInsights(customers),
    leads,
    commissionPreviews,
    settlementBills,
    materials,
    tickets,
  };
}

export async function getAgentCustomerLedger(req: Request, relationId: string) {
  const agent = await resolveAgentUser(req, req.query.agentUserId);
  const customer = await loadAgentCustomerForLedger(agent.id, relationId);
  if (!customer) throw errors.invalidParameter("agent customer is not available");

  return buildCustomerLedgerResponse(customer);
}

export async function getPlatformCustomerLedger(req: Request, customerProfileId: string) {
  const current = getRequiredCurrentUser(req);
  if (current.user.role !== "developer" && current.user.role !== "admin") {
    throw errors.forbidden("customer ledger requires Developer or Admin role");
  }

  const customer = await loadCustomerProfileForLedger(customerProfileId);
  if (!customer) throw errors.invalidParameter("customer profile is not available");

  return buildCustomerLedgerResponse(customer);
}

export async function createAgentLead(req: Request, body: Record<string, unknown>) {
  const agent = await resolveAgentUser(req, body.agentUserId);
  const id = createId("lead");
  await pool.query(
    `INSERT INTO agent_leads
      (id, agent_user_id, application_code, customer_name, phone, source,
       stage, expected_points, note, status)
     VALUES
      (:id, :agentUserId, :applicationCode, :customerName, :phone, :source,
       :stage, :expectedPoints, :note, 'active')`,
    {
      id,
      agentUserId: agent.id,
      applicationCode: optionalText(body.applicationCode, 80) ?? "used-car-platform",
      customerName: requiredText(body.customerName, "customerName", 120),
      phone: optionalText(body.phone, 32),
      source: optionalText(body.source, 80),
      stage: optionalText(body.stage, 32) ?? "new",
      expectedPoints: toNumber(body.expectedPoints as string | number | null | undefined),
      note: optionalText(body.note, 500),
    },
  );

  return { id, agentUserId: agent.id };
}

export async function createAgentTicket(req: Request, body: Record<string, unknown>) {
  const agent = await resolveAgentUser(req, body.agentUserId);
  const id = createId("ticket");
  await pool.query(
    `INSERT INTO agent_support_tickets
      (id, agent_user_id, subject, category, priority, status, last_message)
     VALUES
      (:id, :agentUserId, :subject, :category, :priority, 'open', :lastMessage)`,
    {
      id,
      agentUserId: agent.id,
      subject: requiredText(body.subject, "subject", 160),
      category: optionalText(body.category, 80) ?? "general",
      priority: optionalText(body.priority, 24) ?? "normal",
      lastMessage: optionalText(body.message, 500),
    },
  );

  return { id, agentUserId: agent.id };
}

export async function applyAgentSettlement(req: Request, settlementId: string) {
  const agent = await resolveAgentUser(req, req.query.agentUserId);
  const [result] = await pool.query<any>(
    `UPDATE agent_settlement_bills
     SET status = 'requested',
         requested_at = COALESCE(requested_at, CURRENT_TIMESTAMP(3))
     WHERE id = :settlementId
       AND agent_user_id = :agentUserId
       AND status = 'draft'`,
    { settlementId, agentUserId: agent.id },
  );

  if (!result.affectedRows) {
    throw errors.invalidParameter("settlement bill is not available for application");
  }

  return { id: settlementId, agentUserId: agent.id, status: "requested" };
}

export async function approveSettlementPayment(req: Request, settlementId: string) {
  const current = getRequiredCurrentUser(req);
  if (current.user.role !== "developer" && current.user.role !== "admin") {
    throw errors.forbidden("settlement payment approval requires Admin or Developer role");
  }

  const [result] = await pool.query<any>(
    `UPDATE agent_settlement_bills
     SET status = 'paid',
         approved_by_user_id = :approvedByUserId,
         approved_by_role_code = :approvedByRoleCode,
         confirmed_at = COALESCE(confirmed_at, CURRENT_TIMESTAMP(3)),
         paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP(3))
     WHERE id = :settlementId
       AND status = 'requested'`,
    {
      settlementId,
      approvedByUserId: current.user.id,
      approvedByRoleCode: current.user.role,
    },
  );

  if (!result.affectedRows) {
    throw errors.invalidParameter("settlement application is not available for payment approval");
  }

  return {
    id: settlementId,
    agentUserId: "",
    status: "paid",
    approvedByUserId: current.user.id,
    approvedByUsername: current.user.username,
    approvedByDisplayName: current.user.displayName,
    approvedByRole: current.user.role,
  };
}

export async function listSettlementApplications(req: Request) {
  const current = getRequiredCurrentUser(req);
  if (current.user.role !== "developer" && current.user.role !== "admin") {
    throw errors.forbidden("settlement applications require Admin or Developer role");
  }

  const [rows] = await pool.query<AgentSettlementRow[]>(
    `SELECT
       asb.id,
       asb.agent_user_id,
       agent.username agent_username,
       agent.display_name agent_display_name,
       asb.period,
       asb.total_commission_points,
       asb.status,
       asb.requested_at,
       asb.approved_by_user_id,
       approver.username approved_by_username,
       approver.display_name approved_by_display_name,
       asb.approved_by_role_code,
       asb.confirmed_at,
       asb.paid_at,
       asb.created_at
     FROM agent_settlement_bills asb
     JOIN app_users agent ON agent.id = asb.agent_user_id
     LEFT JOIN app_users approver ON approver.id = asb.approved_by_user_id
     WHERE asb.status IN ('requested', 'paid')
     ORDER BY COALESCE(asb.requested_at, asb.created_at) DESC
     LIMIT 100`,
  );

  return {
    items: rows.map((row) => ({
      id: row.id,
      agentUserId: row.agent_user_id,
      agentUsername: row.agent_username,
      agentDisplayName: row.agent_display_name,
      period: row.period,
      totalCommissionPoints: toNumber(row.total_commission_points),
      status: row.status,
      requestedAt: row.requested_at?.toISOString() ?? null,
      approvedByUserId: row.approved_by_user_id ?? null,
      approvedByUsername: row.approved_by_username ?? null,
      approvedByDisplayName: row.approved_by_display_name ?? null,
      approvedByRole: row.approved_by_role_code ?? null,
      confirmedAt: row.confirmed_at?.toISOString() ?? null,
      paidAt: row.paid_at?.toISOString() ?? null,
    })),
  };
}
