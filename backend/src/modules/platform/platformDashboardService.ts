import type { Request } from "express";
import type { RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { getRequiredCurrentUser } from "../auth/authMiddleware";

type CountRow = RowDataPacket & {
  count: number | string;
};

type ApplicationRow = RowDataPacket & {
  application_code: string;
};

const countFromRows = (rows: CountRow[]) => Number(rows[0]?.count ?? 0);

const countRows = async (sql: string, params?: any) => {
  const [rows] = await pool.query<CountRow[]>(sql, params);
  return countFromRows(rows);
};

const listApplicationsForGlobalScope = async () => {
  const [rows] = await pool.query<ApplicationRow[]>(
    `SELECT application_code
     FROM application_customer_links
     WHERE status = 'active'
     UNION
     SELECT application_code
     FROM agent_leads
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

async function getGlobalMetrics() {
  const [
    linkedCustomerCount,
    activeAgentCount,
    activeLeadCount,
    openTicketCount,
    draftSettlementCount,
    applications,
  ] = await Promise.all([
    countRows(
      `SELECT COUNT(*) count
       FROM application_customer_links
       WHERE status = 'active'`,
    ),
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
    listApplicationsForGlobalScope(),
  ]);

  return {
    linkedCustomerCount,
    activeAgentCount,
    activeLeadCount,
    openTicketCount,
    draftSettlementCount,
    applicationCount: applications.length,
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
  ]);

  return {
    linkedCustomerCount,
    activeAgentCount: 1,
    activeLeadCount,
    openTicketCount,
    draftSettlementCount,
    applicationCount: applications.length,
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

  return {
    role,
    scope,
    generatedAt: new Date().toISOString(),
    metrics,
    sections: buildSections(role),
    sourceOfTruth: buildSourceOfTruth(),
    notes: [
      "Points are shared across applications through one Reusable Credits Platform balance.",
      "The console does not accept cumulative recharge or consumption totals from form input.",
    ],
  };
}
