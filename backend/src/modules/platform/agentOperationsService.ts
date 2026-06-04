import type { Request } from "express";
import type { RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { getRequiredCurrentUser } from "../auth/authMiddleware";

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
  customer_user_id: string;
  customer_username: string;
  customer_display_name: string;
  customer_phone: string | null;
  customer_credits_user_id: number;
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

type AgentSettlementRow = RowDataPacket & {
  id: string;
  period: string;
  total_commission_points: string | number;
  status: string;
  confirmed_at: Date | null;
  paid_at: Date | null;
  created_at: Date;
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

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
       u.id customer_user_id,
       u.username customer_username,
       u.display_name customer_display_name,
       u.phone customer_phone,
       acr.customer_credits_user_id
     FROM agent_customer_relations acr
     JOIN app_users u ON u.id = acr.customer_user_id
     WHERE acr.agent_user_id = :agentUserId
     ORDER BY acr.created_at DESC
     LIMIT 100`,
    { agentUserId },
  );

  return rows.map((row) => ({
    id: row.id,
    applicationCode: row.application_code,
    relationType: row.relation_type,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    customerUserId: row.customer_user_id,
    customerUsername: row.customer_username,
    customerDisplayName: row.customer_display_name,
    customerPhone: row.customer_phone,
    customerCreditsUserId: row.customer_credits_user_id,
  }));
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

async function listAgentCommissionPreviews(agentUserId: string) {
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

  return rows.map((row) => ({
    id: row.id,
    applicationCode: row.application_code,
    period: row.period,
    consumedPoints: toNumber(row.consumed_points),
    commissionRate: toNumber(row.commission_rate),
    commissionPoints: toNumber(row.commission_points),
    status: row.status,
    settlementId: row.settlement_id,
    customerUserId: row.customer_user_id,
    customerUsername: row.customer_username,
    customerDisplayName: row.customer_display_name,
    createdAt: row.created_at.toISOString(),
  }));
}

async function listAgentSettlementBills(agentUserId: string) {
  const [rows] = await pool.query<AgentSettlementRow[]>(
    `SELECT id, period, total_commission_points, status, confirmed_at, paid_at, created_at
     FROM agent_settlement_bills
     WHERE agent_user_id = :agentUserId
     ORDER BY period DESC
     LIMIT 50`,
    { agentUserId },
  );

  return rows.map((row) => ({
    id: row.id,
    period: row.period,
    totalCommissionPoints: toNumber(row.total_commission_points),
    status: row.status,
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

export async function getAgentOperationsOverview(req: Request) {
  const agent = await resolveAgentUser(req, req.query.agentUserId);
  const [customers, leads, commissionPreviews, settlementBills, materials, tickets] =
    await Promise.all([
      listAgentCustomers(agent.id),
      listAgentLeads(agent.id),
      listAgentCommissionPreviews(agent.id),
      listAgentSettlementBills(agent.id),
      listAgentMaterials(),
      listAgentTickets(agent.id),
    ]);

  return {
    agent: {
      userId: agent.id,
      username: agent.username,
      displayName: agent.display_name,
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
    leads,
    commissionPreviews,
    settlementBills,
    materials,
    tickets,
  };
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

export async function confirmAgentSettlement(req: Request, settlementId: string) {
  const agent = await resolveAgentUser(req, req.query.agentUserId);
  const [result] = await pool.query<any>(
    `UPDATE agent_settlement_bills
     SET status = 'confirmed',
         confirmed_at = COALESCE(confirmed_at, CURRENT_TIMESTAMP(3))
     WHERE id = :settlementId
       AND agent_user_id = :agentUserId
       AND status = 'draft'`,
    { settlementId, agentUserId: agent.id },
  );

  if (!result.affectedRows) {
    throw errors.invalidParameter("settlement bill is not available for confirmation");
  }

  return { id: settlementId, agentUserId: agent.id, status: "confirmed" };
}
