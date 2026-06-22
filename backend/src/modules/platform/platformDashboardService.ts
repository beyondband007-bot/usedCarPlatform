import type { Request } from "express";
import type { RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import { getCreditsPool } from "../billing/creditsAccountLookupService";
import { listCanonicalAgentCustomers } from "./creditsAgentRelationsService";

type CountRow = RowDataPacket & {
  count: number | string;
};

type ApplicationRow = RowDataPacket & {
  application_code: string;
};

type CreditsUserRow = RowDataPacket & {
  credits_user_id: number | string | null;
};

type CreditsTenantRow = RowDataPacket & {
  credits_tenant_id: number | string | null;
};

type SumRow = RowDataPacket & {
  total: number | string | null;
};

type TrendTransactionRow = RowDataPacket & {
  id: number | string;
  tenant_id: number | null;
  user_id: number | null;
  application_code: string | null;
  txn_type: string;
  points: number | string;
  created_at: Date | string;
};

type CustomerApplicationLinkRow = RowDataPacket & {
  credits_user_id: number;
  credits_tenant_id: number | null;
  application_code: string;
};

type PlanDistributionRow = RowDataPacket & {
  application_code: string;
  plan_code: string;
  plan_name: string;
  count: number | string;
};

const countFromRows = (rows: CountRow[]) => Number(rows[0]?.count ?? 0);

const countRows = async (sql: string, params?: any) => {
  const [rows] = await pool.query<CountRow[]>(sql, params);
  return countFromRows(rows);
};

const sumFromRows = (rows: SumRow[]) => Number(rows[0]?.total ?? 0);

const sumCreditsRows = async (sql: string, params?: any) => {
  const [rows] = await getCreditsPool().query<SumRow[]>(sql, params);
  return sumFromRows(rows);
};

const listPlatformApplications = async () => {
  const [rows] = await getCreditsPool().query<ApplicationRow[]>(
    `SELECT code application_code
     FROM applications
     WHERE status = 'active'
     ORDER BY application_code ASC`,
  );
  return rows.map((row) => row.application_code);
};

const listApplicationsForAgentScope = async (agentUserId: string) => {
  const customers = await listCanonicalAgentCustomers(agentUserId);
  const [rows] = await pool.query<ApplicationRow[]>(
    `SELECT application_code
     FROM agent_leads
     WHERE agent_user_id = :agentUserId
       AND status = 'active'
     ORDER BY application_code ASC`,
    { agentUserId },
  );
  return Array.from(new Set([
    ...customers.map((customer) => customer.application_code),
    ...rows.map((row) => row.application_code),
  ])).sort();
};

const buildSourceOfTruth = () => ({
  reusableCreditsPlatform: [
    "credit accounts",
    "credit balances",
    "credit transactions",
    "recharge products",
    "recharge/payment orders",
    "billing tasks",
    "agent profiles and relations",
  ],
  usedCarPlatformMvpBackend: [
    "back-office role sessions",
    "application customer links",
    "agent leads",
    "agent support tickets",
    "settlement workflow records",
  ],
});

const buildSections = (role: string) => [
  {
    code: "dashboard",
    label: role === "agent" ? "Agent workbench" : "System overview",
    source: "usedCarPlatformMvpBackend",
    access: role === "agent" ? "own_agent_scope" : "global_back_office_scope",
  },
  {
    code: "users_and_accounts",
    label: "Users and account links",
    source: "usedCarPlatformMvpBackend",
    access: role === "agent" ? "created_users_only" : "global_back_office_scope",
  },
  {
    code: "credits_ledger",
    label: "Balances and transactions",
    source: "reusableCreditsPlatform",
    access: role === "agent" ? "created_users_only" : "global_back_office_scope",
  },
  {
    code: "recharge",
    label: "Recharge products and orders",
    source: "reusableCreditsPlatform",
    access: role === "developer" ? "manage" : "read",
  },
  {
    code: "agent_operations",
    label: "Leads, tickets, commissions, settlements",
    source: "usedCarPlatformMvpBackend",
    access: role === "agent" ? "own_agent_scope" : "global_back_office_scope",
  },
];

async function listScopedCreditsUserIds(role: string, agentUserId: string) {
  if (role === "agent") {
    return Array.from(new Set(
      (await listCanonicalAgentCustomers(agentUserId)).map((row) => row.customer_credits_user_id),
    ));
  }
  const [rows] = await pool.query<CreditsUserRow[]>(
    `SELECT DISTINCT credits_user_id
     FROM app_users
     WHERE credits_user_id IS NOT NULL`,
    { agentUserId },
  );

  return rows
    .map((row) => Number(row.credits_user_id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

async function listScopedCreditsTenantIds(role: string, agentUserId: string) {
  if (role === "agent") {
    return Array.from(new Set(
      (await listCanonicalAgentCustomers(agentUserId))
        .map((row) => row.customer_credits_tenant_id)
        .filter((id): id is number => Boolean(id)),
    ));
  }
  const [rows] = await pool.query<CreditsTenantRow[]>(
    `SELECT DISTINCT credits_tenant_id
     FROM app_users
     WHERE credits_tenant_id IS NOT NULL`,
    { agentUserId },
  );

  return rows
    .map((row) => Number(row.credits_tenant_id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function transactionToTrendEvent(transaction: TrendTransactionRow) {
  const occurredAt = transaction.created_at instanceof Date
    ? transaction.created_at.toISOString()
    : new Date(transaction.created_at).toISOString();

  if (transaction.txn_type === "recharge") {
    return {
      metric: "recharge" as const,
      applicationCode: transaction.application_code,
      occurredAt,
      value: Math.abs(Number(transaction.points ?? 0)),
    };
  }

  if (transaction.txn_type === "settle") {
    return {
      metric: "consume" as const,
      applicationCode: transaction.application_code,
      occurredAt,
      value: Math.abs(Number(transaction.points ?? 0)),
    };
  }

  return null;
}

function trendAccountKey(input: { user_id: number | null; tenant_id: number | null }) {
  return input.tenant_id ? `tenant:${input.tenant_id}` : `user:${input.user_id ?? 0}`;
}

async function loadApplicationCodeByCreditsAccount(rows: TrendTransactionRow[]) {
  const result = new Map<string, string>();
  const personalUserIds = Array.from(
    new Set(
      rows
        .filter((row) => !row.application_code && !row.tenant_id && row.user_id)
        .map((row) => row.user_id as number),
    ),
  );
  const tenantIds = Array.from(
    new Set(
      rows
        .filter((row) => !row.application_code && row.tenant_id)
        .map((row) => row.tenant_id as number),
    ),
  );

  if (!personalUserIds.length && !tenantIds.length) return result;

  const clauses: string[] = [];
  const params: any = {};
  if (personalUserIds.length) {
    clauses.push("(credits_tenant_id IS NULL AND credits_user_id IN (:personalUserIds))");
    params.personalUserIds = personalUserIds;
  }
  if (tenantIds.length) {
    clauses.push("credits_tenant_id IN (:tenantIds)");
    params.tenantIds = tenantIds;
  }

  const [linkRows] = await pool.query<CustomerApplicationLinkRow[]>(
    `SELECT
       credits_user_id,
       credits_tenant_id,
       MIN(application_code) application_code
     FROM application_customer_links
     WHERE status = 'active'
       AND (${clauses.join(" OR ")})
     GROUP BY credits_user_id, credits_tenant_id`,
    params,
  );

  for (const row of linkRows) {
    result.set(
      row.credits_tenant_id ? `tenant:${row.credits_tenant_id}` : `user:${row.credits_user_id}`,
      row.application_code,
    );
  }

  return result;
}

async function listTrendEvents(role: string, agentUserId: string) {
  const creditsUserIds = await listScopedCreditsUserIds(role, agentUserId);
  const creditsTenantIds = await listScopedCreditsTenantIds(role, agentUserId);
  if (role === "agent" && !creditsUserIds.length && !creditsTenantIds.length) return [];

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const scopeSql = role === "agent"
    ? `AND (
         (:hasUserIds = 1 AND ct.user_id IN (:userIds))
         OR (:hasTenantIds = 1 AND ct.tenant_id IN (:tenantIds))
       )`
    : "";

  const [rows] = await getCreditsPool().query<TrendTransactionRow[]>(
    `SELECT
       ct.id,
       ct.tenant_id,
       ct.user_id,
       app.code application_code,
       ct.txn_type,
       ct.points,
       ct.created_at
     FROM credit_transactions ct
     LEFT JOIN applications app ON app.id = ct.application_id
     WHERE ct.txn_type IN ('recharge', 'settle')
       AND ct.created_at >= :cutoff
       ${scopeSql}
     ORDER BY ct.created_at ASC`,
    {
      cutoff,
      hasUserIds: creditsUserIds.length ? 1 : 0,
      userIds: creditsUserIds.length ? creditsUserIds : [0],
      hasTenantIds: creditsTenantIds.length ? 1 : 0,
      tenantIds: creditsTenantIds.length ? creditsTenantIds : [0],
    },
  );
  const applicationCodeByAccount = await loadApplicationCodeByCreditsAccount(rows);

  return rows
    .map((row) => ({
      ...row,
      application_code: row.application_code ?? applicationCodeByAccount.get(trendAccountKey(row)) ?? null,
    }))
    .map(transactionToTrendEvent)
    .filter((event): event is {
      metric: "recharge" | "consume";
      applicationCode: string | null;
      occurredAt: string;
      value: number;
    } => Boolean(event))
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}

async function listPlanDistribution(role: string, agentUserId: string) {
  const agentCustomerUserIds = role === "agent"
    ? Array.from(new Set(
        (await listCanonicalAgentCustomers(agentUserId)).map((row) => row.customer_user_id),
      ))
    : [];
  if (role === "agent" && !agentCustomerUserIds.length) return [];
  const scopeSql = role === "agent"
    ? "AND us.user_id IN (:agentCustomerUserIds)"
    : `AND NOT EXISTS (
         SELECT 1
         FROM back_office_role_assignments boa
         WHERE boa.user_id = us.user_id
           AND boa.role_code IN ('developer', 'admin')
           AND boa.status = 'active'
       )`;

  const [rows] = await pool.query<PlanDistributionRow[]>(
    `SELECT
       us.application_code,
       us.plan_code,
       sp.name plan_name,
       COUNT(DISTINCT us.user_id) count
     FROM user_subscriptions us
     JOIN app_users u ON u.id = us.user_id
     JOIN subscription_plans sp
       ON sp.application_code = us.application_code
      AND sp.code = us.plan_code
     WHERE us.status = 'active'
       AND u.status = 'active'
       ${scopeSql}
     GROUP BY us.application_code, us.plan_code, sp.name
     ORDER BY count DESC, us.application_code ASC, sp.name ASC`,
    { agentUserId, agentCustomerUserIds },
  );

  return rows.map((row) => ({
    applicationCode: row.application_code,
    planCode: row.plan_code,
    planName: row.plan_name,
    count: Number(row.count ?? 0),
  }));
}

async function countPlatformCustomerAccounts() {
  return countRows(
    `SELECT COUNT(DISTINCT u.id) count
     FROM app_users u
     WHERE u.status = 'active'
       AND NOT EXISTS (
         SELECT 1
         FROM back_office_role_assignments restricted_boa
         WHERE restricted_boa.user_id = u.id
           AND restricted_boa.role_code IN ('developer', 'admin')
           AND restricted_boa.status = 'active'
       )
       AND (
         EXISTS (
           SELECT 1
           FROM back_office_role_assignments agent_boa
           WHERE agent_boa.user_id = u.id
             AND agent_boa.role_code = 'agent'
             AND agent_boa.status = 'active'
         )
         OR EXISTS (
           SELECT 1
           FROM app_user_roles aur
           WHERE aur.user_id = u.id
             AND aur.role_code IN ('agent', 'enterprise', 'user')
         )
         OR EXISTS (
           SELECT 1
           FROM application_customer_links acl
           WHERE acl.user_id = u.id
             AND acl.status = 'active'
         )
       )`,
  );
}

async function sumTodayRechargedCredits(role: string, agentUserId: string) {
  if (role !== "agent") {
    return sumCreditsRows(
      `SELECT COALESCE(SUM(points), 0) total
       FROM credit_transactions
       WHERE points > 0
         AND txn_type IN ('recharge', 'bonus')
         AND DATE(created_at) = CURRENT_DATE()`,
    );
  }

  const userIds = await listScopedCreditsUserIds(role, agentUserId);
  const tenantIds = await listScopedCreditsTenantIds(role, agentUserId);
  if (!userIds.length && !tenantIds.length) return 0;

  return sumCreditsRows(
    `SELECT COALESCE(SUM(points), 0) total
     FROM credit_transactions
     WHERE points > 0
       AND txn_type IN ('recharge', 'bonus')
       AND DATE(created_at) = CURRENT_DATE()
       AND (
         (:hasUserIds = 1 AND user_id IN (:userIds))
         OR (:hasTenantIds = 1 AND tenant_id IN (:tenantIds))
       )`,
    {
      hasUserIds: userIds.length ? 1 : 0,
      userIds: userIds.length ? userIds : [0],
      hasTenantIds: tenantIds.length ? 1 : 0,
      tenantIds: tenantIds.length ? tenantIds : [0],
    },
  );
}

async function sumTodayConsumedCredits(role: string, agentUserId: string) {
  if (role !== "agent") {
    return sumCreditsRows(
      `SELECT COALESCE(SUM(ABS(points)), 0) total
       FROM credit_transactions
       WHERE txn_type = 'settle'
         AND DATE(created_at) = CURRENT_DATE()`,
    );
  }

  const userIds = await listScopedCreditsUserIds(role, agentUserId);
  const tenantIds = await listScopedCreditsTenantIds(role, agentUserId);
  if (!userIds.length && !tenantIds.length) return 0;

  return sumCreditsRows(
    `SELECT COALESCE(SUM(ABS(points)), 0) total
     FROM credit_transactions
     WHERE txn_type = 'settle'
       AND DATE(created_at) = CURRENT_DATE()
       AND (
         (:hasUserIds = 1 AND user_id IN (:userIds))
         OR (:hasTenantIds = 1 AND tenant_id IN (:tenantIds))
       )`,
    {
      hasUserIds: userIds.length ? 1 : 0,
      userIds: userIds.length ? userIds : [0],
      hasTenantIds: tenantIds.length ? 1 : 0,
      tenantIds: tenantIds.length ? tenantIds : [0],
    },
  );
}

async function getGlobalMetrics() {
  const [
    linkedCustomerCount,
    customerAccountCount,
    activeAgentCount,
    activeLeadCount,
    openTicketCount,
    draftSettlementCount,
    applications,
    todayRechargedCredits,
    todayConsumedCredits,
  ] = await Promise.all([
    countRows(
      `SELECT COUNT(*) count
       FROM application_customer_links
       WHERE status = 'active'`,
    ),
    countPlatformCustomerAccounts(),
    countRows(
      `SELECT COUNT(DISTINCT boa.user_id) count
       FROM back_office_role_assignments boa
       JOIN app_users u ON u.id = boa.user_id
       WHERE boa.role_code = 'agent'
         AND boa.status = 'active'
         AND u.status = 'active'`,
    ),
    countRows(
      `SELECT COUNT(*) count
       FROM agent_leads
       WHERE status = 'active'`,
    ),
    countRows(
      `SELECT COUNT(*) count
       FROM agent_support_tickets
       WHERE status <> 'closed'`,
    ),
    countRows(
      `SELECT COUNT(*) count
       FROM agent_settlement_bills
       WHERE status = 'draft'`,
    ),
    listPlatformApplications(),
    sumTodayRechargedCredits("developer", ""),
    sumTodayConsumedCredits("developer", ""),
  ]);

  return {
    linkedCustomerCount,
    customerAccountCount,
    activeAgentCount,
    activeLeadCount,
    openTicketCount,
    draftSettlementCount,
    pendingSettlementCount: draftSettlementCount,
    applicationCount: applications.length,
    platformApplicationCount: applications.length,
    todayRechargedCredits,
    todayOrderAmount: todayRechargedCredits,
    todayConsumedCredits,
    applications,
  };
}

async function getAgentMetrics(agentUserId: string) {
  const canonicalCustomers = await listCanonicalAgentCustomers(agentUserId);
  const [
    linkedCustomerCount,
    activeLeadCount,
    openTicketCount,
    draftSettlementCount,
    applications,
    todayRechargedCredits,
    todayConsumedCredits,
  ] = await Promise.all([
    Promise.resolve(new Set(canonicalCustomers.map((row) => row.customer_user_id)).size),
    countRows(
      `SELECT COUNT(*) count
       FROM agent_leads
       WHERE agent_user_id = :agentUserId
         AND status = 'active'`,
      { agentUserId },
    ),
    countRows(
      `SELECT COUNT(*) count
       FROM agent_support_tickets
       WHERE agent_user_id = :agentUserId
         AND status <> 'closed'`,
      { agentUserId },
    ),
    countRows(
      `SELECT COUNT(*) count
       FROM agent_settlement_bills
       WHERE agent_user_id = :agentUserId
         AND status = 'draft'`,
      { agentUserId },
    ),
    listApplicationsForAgentScope(agentUserId),
    sumTodayRechargedCredits("agent", agentUserId),
    sumTodayConsumedCredits("agent", agentUserId),
  ]);

  return {
    linkedCustomerCount,
    customerAccountCount: linkedCustomerCount,
    activeAgentCount: 1,
    activeLeadCount,
    openTicketCount,
    draftSettlementCount,
    pendingSettlementCount: draftSettlementCount,
    applicationCount: applications.length,
    platformApplicationCount: applications.length,
    todayRechargedCredits,
    todayOrderAmount: todayRechargedCredits,
    todayConsumedCredits,
    applications,
  };
}

export async function getPlatformDashboard(req: Request) {
  const current = getRequiredCurrentUser(req);
  const role = current.user.role;

  if (role !== "developer" && role !== "admin" && role !== "agent") {
    throw errors.forbidden("back-office dashboard requires Developer, Admin, or Agent role");
  }

  const scope = role === "agent" ? "own_agent_scope" : "global_back_office_scope";
  const metrics = role === "agent"
    ? await getAgentMetrics(current.user.id)
    : await getGlobalMetrics();
  const trends = await listTrendEvents(role, current.user.id);
  const planDistribution = await listPlanDistribution(role, current.user.id);

  return {
    role,
    scope,
    generatedAt: new Date().toISOString(),
    metrics,
    trends,
    planDistribution,
    sections: buildSections(role),
    sourceOfTruth: buildSourceOfTruth(),
    notes: [
      "Points are shared across applications through one Reusable Credits Platform balance.",
      "The console does not accept cumulative recharge or consumption totals from form input.",
    ],
  };
}
