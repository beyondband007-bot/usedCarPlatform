import type { Request } from "express";
import type { RowDataPacket } from "mysql2";
import mysql, { type Pool } from "mysql2/promise";

import { env } from "../../config/env";
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
  customer_account_scope: "personal" | "tenant";
  customer_credits_tenant_id: number | null;
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

type EnterpriseMemberIdentityRow = RowDataPacket & {
  credits_user_id: number | null;
  username: string;
  display_name: string;
  member_role: "owner" | "admin" | "member";
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

type CustomerTopUpRow = RowDataPacket & {
  user_id?: number;
  tenant_id?: number;
  total_amount: string | number;
};

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
       acr.customer_credits_user_id,
       u.account_scope customer_account_scope,
       u.credits_tenant_id customer_credits_tenant_id
     FROM agent_customer_relations acr
     JOIN app_users u ON u.id = acr.customer_user_id
     WHERE acr.agent_user_id = :agentUserId
     ORDER BY acr.created_at DESC
     LIMIT 100`,
    { agentUserId },
  );

  const totalTopUpAmountByCustomer = await listCustomerTopUpAmounts(rows);

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
    totalTopUpAmount:
      totalTopUpAmountByCustomer.get(customerTopUpKey(row)) ?? 0,
  }));
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

async function loadEnterpriseMemberIdentityByCreditsUserId(tenantId: string | null) {
  if (!tenantId) return new Map<number, EnterpriseMemberIdentityRow>();
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
  memberByCreditsUserId: Map<number, EnterpriseMemberIdentityRow>,
) {
  if (customer.customer_account_scope !== "tenant") return "客户";

  const member = memberByCreditsUserId.get(transaction.user_id);
  if (transaction.user_id === customer.enterprise_owner_credits_user_id) return "主账号";
  if (member?.member_role === "owner") return "主账号";
  if (member) return "子账号";
  return "团队成员";
}

async function listLedgerTransactions(input: {
  accountId: number;
  customer: AgentCustomerLedgerRow;
}) {
  const creditsDb = getCreditsPool();
  const memberByCreditsUserId = await loadEnterpriseMemberIdentityByCreditsUserId(
    input.customer.enterprise_tenant_id,
  );

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

  return rows.map((row) => {
    const member = memberByCreditsUserId.get(row.user_id);
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
      remark: row.remark,
      actorUsername: member?.username ?? null,
      actorDisplayName: member?.display_name ?? null,
      actorIdentityLabel: identityLabelForTransaction(row, input.customer, memberByCreditsUserId),
      createdAt: row.created_at.toISOString(),
    };
  });
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

export async function getAgentCustomerLedger(req: Request, relationId: string) {
  const agent = await resolveAgentUser(req, req.query.agentUserId);
  const customer = await loadAgentCustomerForLedger(agent.id, relationId);
  if (!customer) throw errors.invalidParameter("agent customer is not available");

  const account = await loadCreditsAccountForCustomer(customer);
  if (!account) {
    return {
      customer: {
        id: customer.id,
        applicationCode: customer.application_code,
        relationType: customer.relation_type,
        status: customer.status,
        customerUserId: customer.customer_user_id,
        customerUsername: customer.customer_username,
        customerDisplayName: customer.customer_display_name,
        customerPhone: customer.customer_phone,
        customerCreditsUserId: customer.customer_credits_user_id,
        accountScope: customer.customer_account_scope,
        creditsTenantId: customer.customer_credits_tenant_id,
        enterpriseAccountRole: customer.customer_account_scope === "tenant" ? "team" : "personal",
      },
      account: null,
      transactions: [],
    };
  }

  return {
    customer: {
      id: customer.id,
      applicationCode: customer.application_code,
      relationType: customer.relation_type,
      status: customer.status,
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
    },
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
