import type { Request } from "express";
import type { RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import { getCreditsPool } from "../billing/creditsAccountLookupService";
import { creditsClient, type CreditTransactionResponse } from "../billing/creditsClient";

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
  const [rows] = await pool.query<ApplicationRow[]>(
    `SELECT application_code
     FROM agent_customer_relations
     WHERE agent_user_id = :agentUserId
       AND status = 'active'
     UNION
     SELECT application_code
     FROM agent_leads
     WHERE agent_user_id = :agentUserId
       AND status = 'active'
     ORDER BY application_code ASC`,
    { agentUserId },
  );
  return rows.map((row) => row.application_code);
};

const buildSourceOfTruth = () => ({
  reusableCreditsPlatform: [
    "credit accounts",
    "credit balances",
    "credit transactions",
    "recharge products",
    "recharge/payment orders",
    "billing tasks",
  ],
  usedCarPlatformMvpBackend: [
    "back-office role sessions",
    "application customer links",
    "agent-customer relations",
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
  const [rows] = await pool.query<CreditsUserRow[]>(
    role === "agent"
      ? `SELECT DISTINCT u.credits_user_id
         FROM app_users u
         WHERE u.credits_user_id IS NOT NULL
           AND u.id IN (
             SELECT acr.customer_user_id
             FROM agent_customer_relations acr
             WHERE acr.agent_user_id = :agentUserId
               AND acr.status = 'active'
           )`
      : `SELECT DISTINCT credits_user_id
         FROM app_users
         WHERE credits_user_id IS NOT NULL`,
    { agentUserId },
  );

  return rows
    .map((row) => Number(row.credits_user_id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

async function listScopedCreditsTenantIds(role: string, agentUserId: string) {
  const [rows] = await pool.query<CreditsTenantRow[]>(
    role === "agent"
      ? `SELECT DISTINCT u.credits_tenant_id
         FROM app_users u
         WHERE u.credits_tenant_id IS NOT NULL
           AND u.id IN (
             SELECT acr.customer_user_id
             FROM agent_customer_relations acr
             WHERE acr.agent_user_id = :agentUserId
               AND acr.status = 'active'
           )`
      : `SELECT DISTINCT credits_tenant_id
         FROM app_users
         WHERE credits_tenant_id IS NOT NULL`,
    { agentUserId },
  );

  return rows
    .map((row) => Number(row.credits_tenant_id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function transactionToTrendEvent(transaction: CreditTransactionResponse) {
  if (transaction.txnType === "recharge") {
    return {
      metric: "recharge" as const,
      occurredAt: transaction.createdAt,
      value: Math.abs(Number(transaction.points ?? 0)),
    };
  }

  if (transaction.txnType === "settle") {
    return {
      metric: "consume" as const,
      occurredAt: transaction.createdAt,
      value: Math.abs(Number(transaction.points ?? 0)),
    };
  }

  return null;
}

async function listTrendEvents(role: string, agentUserId: string) {
  const creditsUserIds = await listScopedCreditsUserIds(role, agentUserId);
  const seenTransactionKeys = new Set<string>();
  const events: Array<{ metric: "recharge" | "consume"; occurredAt: string; value: number }> = [];
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  await Promise.all(
    creditsUserIds.map(async (creditsUserId) => {
      const accounts = await creditsClient.listAccounts({ userId: creditsUserId });
      await Promise.all(
        accounts.accounts.map(async (account) => {
          const result = await creditsClient.listAccountTransactions({
            accountId: account.id,
            userId: creditsUserId,
            limit: 100,
          });

          for (const transaction of result.transactions) {
            const time = new Date(transaction.createdAt).getTime();
            if (!Number.isFinite(time) || time < cutoff) continue;

            const event = transactionToTrendEvent(transaction);
            if (!event) continue;

            const key = `${transaction.id}:${event.metric}`;
            if (seenTransactionKeys.has(key)) continue;
            seenTransactionKeys.add(key);
            events.push(event);
          }
        }),
      );
    }),
  );

  return events.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
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

async function sumTodayOrderAmount(role: string, agentUserId: string) {
  if (role !== "agent") {
    return sumCreditsRows(
      `SELECT COALESCE(SUM(amount), 0) total
       FROM payment_orders
       WHERE status = 'paid'
         AND DATE(COALESCE(paid_at, created_at)) = CURRENT_DATE()`,
    );
  }

  const userIds = await listScopedCreditsUserIds(role, agentUserId);
  const tenantIds = await listScopedCreditsTenantIds(role, agentUserId);
  if (!userIds.length && !tenantIds.length) return 0;

  return sumCreditsRows(
    `SELECT COALESCE(SUM(amount), 0) total
     FROM payment_orders
     WHERE status = 'paid'
       AND DATE(COALESCE(paid_at, created_at)) = CURRENT_DATE()
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
    todayOrderAmount,
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
    sumTodayOrderAmount("developer", ""),
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
    todayOrderAmount,
    todayConsumedCredits,
    applications,
  };
}

async function getAgentMetrics(agentUserId: string) {
  const [
    linkedCustomerCount,
    activeLeadCount,
    openTicketCount,
    draftSettlementCount,
    applications,
    todayOrderAmount,
    todayConsumedCredits,
  ] = await Promise.all([
    countRows(
      `SELECT COUNT(*) count
       FROM agent_customer_relations
       WHERE agent_user_id = :agentUserId
         AND status = 'active'`,
      { agentUserId },
    ),
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
    sumTodayOrderAmount("agent", agentUserId),
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
    todayOrderAmount,
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

  return {
    role,
    scope,
    generatedAt: new Date().toISOString(),
    metrics,
    trends,
    sections: buildSections(role),
    sourceOfTruth: buildSourceOfTruth(),
    notes: [
      "Points are shared across applications through one Reusable Credits Platform balance.",
      "The console does not accept cumulative recharge or consumption totals from form input.",
    ],
  };
}
