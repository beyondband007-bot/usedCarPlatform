import { env } from "../../config/env";
import { pool } from "../../db/mysql";
import type { RowDataPacket } from "mysql2";
import type { BillingIdentity } from "./billingIdentity";
import {
  creditsClient,
  type CreditTransactionResponse,
  type CreditTransactionWithApplicationResponse,
  type CreditsApplicationResponse,
  type CreditsFunctionResponse,
} from "./creditsClient";
import { getCreditsPool } from "./creditsAccountLookupService";
import { classifyAgentCustomerUserType } from "../platform/agentOperationsService";
import { listAgentDepositBalances } from "../platform/agentDepositService";

const transactionTime = (transaction: CreditTransactionResponse) =>
  new Date(transaction.createdAt).getTime() || 0;

type CustomerUserTypeCode = "active" | "potential" | "low_frequency";

type CustomerProfileRow = RowDataPacket & {
  id: string;
  application_code: string;
  user_id: string;
  username: string;
  display_name: string;
  phone: string | null;
  role_code: string | null;
  credits_user_id: number;
  account_scope: "personal" | "tenant";
  credits_tenant_id: number | null;
  enterprise_tenant_id: string | null;
  enterprise_tenant_name: string | null;
  enterprise_member_role: "owner" | "admin" | "member" | null;
  enterprise_owner_user_id: string | null;
  enterprise_owner_username: string | null;
  enterprise_owner_display_name: string | null;
  enterprise_subscription_user_id: string | null;
  created_by_user_id: string;
  created_by_username: string | null;
  created_by_display_name: string | null;
  created_by_role_code: string;
  status: string;
  created_at: Date;
};

type CustomerUsageStatsRow = RowDataPacket & {
  account_key: string;
  total_top_up_credits: string | number;
  total_consumed_credits: string | number;
  consumption_transaction_count: string | number;
  last_consumed_at: Date | null;
  last_top_up_at: Date | null;
};

type CustomerUsageStats = {
  totalTopUpCredits: number;
  totalConsumedCredits: number;
  consumptionTransactionCount: number;
  lastConsumedAt: string | null;
  lastTopUpAt: string | null;
  userType: {
    code: CustomerUserTypeCode;
    label: string;
  };
};

const FALLBACK_APPLICATIONS: CreditsApplicationResponse[] = [
  {
    id: 0,
    code: env.credits.applicationCode,
    name: "usedCarPlatform",
    description: "Current used car image generation application",
    status: "active",
  },
  {
    id: -1,
    code: "clothing_ai",
    name: "clothing_ai",
    description: "Planned clothing AI application",
    status: "planned",
  },
];

const customerUserTypeDefinitions: Record<CustomerUserTypeCode, string> = {
  active: "活跃用户",
  potential: "潜力用户",
  low_frequency: "低频用户",
};

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

function userTypeLabel(code: CustomerUserTypeCode) {
  return customerUserTypeDefinitions[code] ?? customerUserTypeDefinitions.low_frequency;
}

function customerUsageKey(row: Pick<CustomerProfileRow, "account_scope" | "credits_tenant_id" | "credits_user_id">) {
  if (row.account_scope === "tenant" && row.credits_tenant_id) {
    return `tenant:${row.credits_tenant_id}`;
  }
  return `user:${row.credits_user_id}`;
}

function emptyCustomerUsageStats(): CustomerUsageStats {
  const code = classifyAgentCustomerUserType({});
  return {
    totalTopUpCredits: 0,
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

const PLANNED_FUNCTIONS: CreditsFunctionResponse[] = [
  {
    id: -101,
    applicationId: -1,
    applicationCode: "clothing_ai",
    applicationName: "clothing_ai",
    code: "model_generate",
    name: "Model Generate",
    description: "Planned model generation function",
    chargeMode: "estimate_required",
    defaultPoints: "0",
    status: "planned",
  },
  {
    id: -102,
    applicationId: -1,
    applicationCode: "clothing_ai",
    applicationName: "clothing_ai",
    code: "try_on_generate",
    name: "Try-on Generate",
    description: "Planned try-on generation function",
    chargeMode: "estimate_required",
    defaultPoints: "0",
    status: "planned",
  },
  {
    id: -103,
    applicationId: -1,
    applicationCode: "clothing_ai",
    applicationName: "clothing_ai",
    code: "lifestyle_photo",
    name: "Lifestyle Photo",
    description: "Planned lifestyle product photo function",
    chargeMode: "estimate_required",
    defaultPoints: "0",
    status: "planned",
  },
];

function mergeApplications(applications: CreditsApplicationResponse[]) {
  const byCode = new Map<string, CreditsApplicationResponse>();
  for (const application of FALLBACK_APPLICATIONS) {
    byCode.set(application.code, application);
  }
  for (const application of applications) {
    byCode.set(application.code, application);
  }
  return [...byCode.values()].sort((left, right) => left.code.localeCompare(right.code));
}

async function listFunctionsForApplications(applications: CreditsApplicationResponse[]) {
  const functionGroups = await Promise.all(
    applications
      .filter((application) => application.status !== "planned")
      .map(async (application) => {
        try {
          const result = await creditsClient.listFunctions(application.code);
          return result.functions.map((item) => ({
            ...item,
            applicationCode: application.code,
            applicationName: application.name,
          }));
        } catch {
          return [] as CreditsFunctionResponse[];
        }
      }),
  );

  const functions = functionGroups.flat();
  const hasClothingAi = applications.some((application) => application.code === "clothing_ai");
  return hasClothingAi ? [...functions, ...PLANNED_FUNCTIONS] : functions;
}

function normalizeBackOfficeCustomerRole(roleCode: string | null) {
  return roleCode === "enterprise" || !roleCode ? "user" : roleCode;
}

function resolveEnterpriseAccountRole(row: CustomerProfileRow) {
  if (!row.enterprise_tenant_id) return "standalone";
  return row.user_id === row.enterprise_owner_user_id ||
    row.user_id === row.enterprise_subscription_user_id
    ? "mother"
    : "child";
}

function enrichTransactions(
  transactions: CreditTransactionResponse[],
  applications: CreditsApplicationResponse[],
  functions: CreditsFunctionResponse[],
): CreditTransactionWithApplicationResponse[] {
  const applicationsById = new Map(applications.map((item) => [item.id, item]));
  const functionsById = new Map(functions.map((item) => [item.id, item]));

  return transactions.map((transaction) => {
    const application = transaction.applicationId ? applicationsById.get(transaction.applicationId) : null;
    const fn = transaction.functionId ? functionsById.get(transaction.functionId) : null;
    return {
      ...transaction,
      applicationCode: application?.code ?? fn?.applicationCode ?? null,
      applicationName: application?.name ?? fn?.applicationName ?? null,
      functionCode: fn?.code ?? null,
      functionName: fn?.name ?? null,
    };
  });
}

async function listCustomerUsageStats(rows: CustomerProfileRow[]) {
  const result = new Map<string, CustomerUsageStats>();
  const personalCreditsUserIds = Array.from(
    new Set(
      rows
        .filter((row) => row.account_scope !== "tenant")
        .map((row) => row.credits_user_id)
        .filter(Boolean),
    ),
  );
  const tenantIds = Array.from(
    new Set(
      rows
        .filter((row) => row.account_scope === "tenant" && row.credits_tenant_id)
        .map((row) => row.credits_tenant_id as number),
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

  const [statsRows] = await getCreditsPool().query<CustomerUsageStatsRow[]>(
    `SELECT
       CASE
         WHEN ct.tenant_id IS NOT NULL THEN CONCAT('tenant:', ct.tenant_id)
         ELSE CONCAT('user:', ct.user_id)
       END account_key,
       COALESCE(SUM(CASE
         WHEN ct.txn_type IN (:topUpTxnTypes) AND ct.points > 0 THEN ct.points
         ELSE 0
       END), 0) total_top_up_credits,
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
      totalTopUpCredits: toNumber(row.total_top_up_credits),
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

async function listCustomerProfiles() {
  const [rows] = await pool.query<CustomerProfileRow[]>(
    `SELECT
       acl.id,
       acl.application_code,
       acl.user_id,
       u.username,
       u.display_name,
       u.phone,
       MIN(aur.role_code) role_code,
       acl.credits_user_id,
       acl.account_scope,
       acl.credits_tenant_id,
       MAX(em.tenant_id) enterprise_tenant_id,
       MAX(et.name) enterprise_tenant_name,
       MAX(em.member_role) enterprise_member_role,
       MAX(et.owner_user_id) enterprise_owner_user_id,
       MAX(owner.username) enterprise_owner_username,
       MAX(owner.display_name) enterprise_owner_display_name,
       MAX(et.subscription_user_id) enterprise_subscription_user_id,
       acl.created_by_user_id,
       creator.username created_by_username,
       creator.display_name created_by_display_name,
       acl.created_by_role_code,
       acl.status,
       acl.created_at
     FROM application_customer_links acl
     JOIN app_users u ON u.id = acl.user_id
     LEFT JOIN app_user_roles aur ON aur.user_id = u.id
     LEFT JOIN enterprise_members em
       ON em.user_id = u.id
      AND em.status = 'active'
     LEFT JOIN enterprise_tenants et
       ON et.id = em.tenant_id
      AND et.status = 'active'
     LEFT JOIN app_users owner ON owner.id = et.owner_user_id
     LEFT JOIN app_users creator ON creator.id = acl.created_by_user_id
     GROUP BY acl.id, acl.application_code, acl.user_id, u.username, u.display_name,
              u.phone, acl.credits_user_id, acl.account_scope, acl.credits_tenant_id,
              acl.created_by_user_id, creator.username, creator.display_name,
              acl.created_by_role_code, acl.status, acl.created_at
     ORDER BY acl.created_at DESC
     LIMIT 100`,
  );

  const balanceByCreditsUserId = new Map<number, {
    totalBalance: string;
    availableBalance: string;
    currency: string;
  }>();
  await Promise.all(
    Array.from(new Set(rows.map((row) => row.credits_user_id).filter(Boolean))).map(async (creditsUserId) => {
      try {
        const result = await creditsClient.listAccounts({ userId: creditsUserId });
        const linkedRows = rows.filter((row) => row.credits_user_id === creditsUserId);
        const linkedRow = linkedRows.find((row) => row.account_scope === "tenant") ?? linkedRows[0];
        const matchingAccount =
          linkedRow?.account_scope === "tenant"
            ? result.accounts.find(
                (account) =>
                  account.accountScope === "tenant" &&
                  account.tenantId === linkedRow.credits_tenant_id,
              )
            : result.accounts.find((account) => account.accountScope === "personal" && account.tenantId === null);
        const account = matchingAccount ?? result.accounts[0];
        if (account) {
          balanceByCreditsUserId.set(creditsUserId, {
            totalBalance: account.totalBalance,
            availableBalance: account.availableBalance,
            currency: account.currency,
          });
        }
      } catch {
        // Keep customer profiles visible even if a linked credits account cannot be read.
      }
    }),
  );
  const usageStatsByCustomer = await listCustomerUsageStats(rows);
  const depositBalances = await listAgentDepositBalances(rows.map((row) => row.user_id));

  return rows.map((row) => {
    const usageStats = usageStatsByCustomer.get(customerUsageKey(row)) ?? emptyCustomerUsageStats();
    const depositBalance = depositBalances.get(row.user_id);
    return {
      id: row.id,
      applicationCode: row.application_code,
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      phone: row.phone,
      role: normalizeBackOfficeCustomerRole(row.role_code),
      creditsUserId: row.credits_user_id,
      creditsTotalBalance: balanceByCreditsUserId.get(row.credits_user_id)?.totalBalance ?? null,
      creditsAvailableBalance: balanceByCreditsUserId.get(row.credits_user_id)?.availableBalance ?? null,
      creditsCurrency: balanceByCreditsUserId.get(row.credits_user_id)?.currency ?? null,
      depositBalance: depositBalance?.balance ?? 0,
      depositCurrency: depositBalance?.currency ?? "CNY",
      accountScope: row.account_scope,
      creditsTenantId: row.credits_tenant_id,
      enterpriseTenantId: row.enterprise_tenant_id,
      enterpriseTenantName: row.enterprise_tenant_name,
      enterpriseMemberRole: row.enterprise_member_role,
      enterpriseOwnerUserId: row.enterprise_owner_user_id,
      enterpriseOwnerUsername: row.enterprise_owner_username,
      enterpriseOwnerDisplayName: row.enterprise_owner_display_name,
      enterpriseAccountRole: resolveEnterpriseAccountRole(row),
      totalTopUpCredits: usageStats.totalTopUpCredits,
      totalConsumedCredits: usageStats.totalConsumedCredits,
      consumptionTransactionCount: usageStats.consumptionTransactionCount,
      lastConsumedAt: usageStats.lastConsumedAt,
      lastTopUpAt: usageStats.lastTopUpAt,
      userType: usageStats.userType,
      createdByUserId: row.created_by_user_id,
      createdByUsername: row.created_by_username,
      createdByDisplayName: row.created_by_display_name,
      createdByRole: row.created_by_role_code,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    };
  });
}

export const getCreditsAdminOverview = async (identity: BillingIdentity) => {
  const [applicationResult, accounts, products, customerProfiles] = await Promise.all([
    creditsClient.listApplications(),
    creditsClient.listAccounts({ userId: identity.userId }),
    creditsClient.listRechargeProducts(),
    listCustomerProfiles(),
  ]);
  const applications = mergeApplications(applicationResult.applications);
  const functions = await listFunctionsForApplications(applications);

  const transactionResults = await Promise.all(
    accounts.accounts.map((account) =>
      creditsClient.listAccountTransactions({
        accountId: account.id,
        userId: identity.userId,
        limit: 20,
      }),
    ),
  );

  const transactions = enrichTransactions(
    transactionResults
      .flatMap((result) => result.transactions)
      .sort((a, b) => transactionTime(b) - transactionTime(a))
      .slice(0, 50),
    applications,
    functions,
  );

  return {
    identity,
    application:
      applications.find((application) => application.code === env.credits.applicationCode) ??
      applications[0] ??
      null,
    applications,
    functions,
    accounts: accounts.accounts,
    transactions,
    rechargeProducts: products.products,
    customerProfiles,
  };
};
