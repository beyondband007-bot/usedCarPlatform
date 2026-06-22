import type { RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { getCreditsPool } from "../billing/creditsAccountLookupService";

type AppCreditsIdentityRow = RowDataPacket & {
  id: string;
  credits_user_id: number | null;
};

type CreditsRelationRow = RowDataPacket & {
  id: number;
  agent_user_id: number;
  referred_user_id: number;
  tenant_id: number | null;
  relation_type: "direct" | "indirect";
  commission_rate: string;
  status: string;
  created_at: Date;
};

type CustomerApplicationRow = RowDataPacket & {
  application_link_id: string;
  application_code: string;
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

export type CanonicalAgentCustomerRow = {
  id: string;
  application_code: string;
  relation_type: "direct" | "indirect";
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

async function getAppCreditsUserId(appUserId: string) {
  const [rows] = await pool.query<AppCreditsIdentityRow[]>(
    `SELECT id, credits_user_id
     FROM app_users
     WHERE id = :appUserId
       AND status = 'active'
     LIMIT 1`,
    { appUserId },
  );
  return rows[0]?.credits_user_id ?? null;
}

async function listCreditsRelationsForAgent(agentCreditsUserId: number) {
  const [rows] = await getCreditsPool().query<CreditsRelationRow[]>(
    `SELECT relation.id,
            relation.agent_user_id,
            relation.referred_user_id,
            relation.tenant_id,
            relation.relation_type,
            relation.commission_rate,
            relation.status,
            relation.created_at
     FROM agent_relations relation
     JOIN users agent
       ON agent.id = relation.agent_user_id
      AND agent.status = 'active'
     JOIN agent_profiles profile
       ON profile.user_id = relation.agent_user_id
      AND profile.status = 'approved'
     WHERE relation.agent_user_id = :agentCreditsUserId
       AND relation.relation_type = 'direct'
       AND relation.status = 'active'
     ORDER BY relation.created_at DESC, relation.id DESC`,
    { agentCreditsUserId },
  );
  return rows;
}

export async function listCanonicalAgentCustomers(agentAppUserId: string) {
  const agentCreditsUserId = await getAppCreditsUserId(agentAppUserId);
  if (!agentCreditsUserId) return [];

  const relations = await listCreditsRelationsForAgent(agentCreditsUserId);
  const referredUserIds = Array.from(new Set(relations.map((row) => row.referred_user_id)));
  if (!referredUserIds.length) return [];

  const [customers] = await pool.query<CustomerApplicationRow[]>(
    `SELECT
       acl.id application_link_id,
       acl.application_code,
       acl.created_by_user_id,
       creator.username created_by_username,
       creator.display_name created_by_display_name,
       acl.created_by_role_code,
       customer.id customer_user_id,
       customer.username customer_username,
       customer.display_name customer_display_name,
       customer.phone customer_phone,
       customer.credits_user_id customer_credits_user_id,
       customer.account_scope customer_account_scope,
       customer.credits_tenant_id customer_credits_tenant_id
     FROM application_customer_links acl
     JOIN app_users customer
       ON customer.id = acl.user_id
      AND customer.status = 'active'
     LEFT JOIN app_users creator ON creator.id = acl.created_by_user_id
     WHERE customer.credits_user_id IN (:referredUserIds)
       AND acl.status = 'active'
     ORDER BY acl.created_at DESC`,
    { referredUserIds },
  );

  const customersByCreditsUserId = new Map<number, CustomerApplicationRow[]>();
  for (const customer of customers) {
    const values = customersByCreditsUserId.get(customer.customer_credits_user_id) ?? [];
    values.push(customer);
    customersByCreditsUserId.set(customer.customer_credits_user_id, values);
  }

  return relations.flatMap((relation): CanonicalAgentCustomerRow[] =>
    (customersByCreditsUserId.get(relation.referred_user_id) ?? [])
      .filter(
        (customer) =>
          relation.tenant_id === null ||
          relation.tenant_id === customer.customer_credits_tenant_id,
      )
      .map((customer) => ({
        id: String(relation.id),
        application_code: customer.application_code,
        relation_type: relation.relation_type,
        status: relation.status,
        created_at: relation.created_at,
        created_by_user_id: customer.created_by_user_id,
        created_by_username: customer.created_by_username,
        created_by_display_name: customer.created_by_display_name,
        created_by_role_code: customer.created_by_role_code,
        customer_user_id: customer.customer_user_id,
        customer_username: customer.customer_username,
        customer_display_name: customer.customer_display_name,
        customer_phone: customer.customer_phone,
        customer_credits_user_id: customer.customer_credits_user_id,
        customer_account_scope: customer.customer_account_scope,
        customer_credits_tenant_id: customer.customer_credits_tenant_id,
      })),
  );
}

export async function findCanonicalAgentCustomer(
  agentAppUserId: string,
  relationId: string,
) {
  const rows = await listCanonicalAgentCustomers(agentAppUserId);
  return rows.find((row) => row.id === relationId) ?? null;
}

export async function hasCanonicalAgentCustomerRelation(
  agentAppUserId: string,
  customerAppUserId: string,
) {
  const [agentCreditsUserId, customerCreditsUserId] = await Promise.all([
    getAppCreditsUserId(agentAppUserId),
    getAppCreditsUserId(customerAppUserId),
  ]);
  if (!agentCreditsUserId || !customerCreditsUserId) return false;

  const [rows] = await getCreditsPool().query<Array<RowDataPacket & { id: number }>>(
    `SELECT relation.id
     FROM agent_relations relation
     JOIN agent_profiles profile
       ON profile.user_id = relation.agent_user_id
      AND profile.status = 'approved'
     WHERE relation.agent_user_id = :agentCreditsUserId
       AND relation.referred_user_id = :customerCreditsUserId
       AND relation.relation_type = 'direct'
       AND relation.status = 'active'
     LIMIT 1`,
    { agentCreditsUserId, customerCreditsUserId },
  );
  return rows.length > 0;
}

export async function upsertCanonicalAgentCustomerRelation(input: {
  agentAppUserId: string;
  customerCreditsUserId: number;
  creditsTenantId?: number | null;
  commissionRate?: number | string;
}) {
  const agentCreditsUserId = await getAppCreditsUserId(input.agentAppUserId);
  if (!agentCreditsUserId) {
    throw errors.invalidParameter("agent is not linked to the Credits Platform");
  }

  let commissionRate = input.commissionRate;
  if (commissionRate === undefined) {
    const [policyRows] = await pool.query<Array<RowDataPacket & { commission_rate: string | number }>>(
      `SELECT commission_rate
       FROM back_office_agent_policy_overrides
       WHERE agent_user_id = :agentAppUserId
       LIMIT 1`,
      { agentAppUserId: input.agentAppUserId },
    );
    commissionRate = policyRows[0]?.commission_rate ?? 0.1;
  }

  const credits = getCreditsPool();
  await credits.query(
    `INSERT IGNORE INTO agent_profiles
      (user_id, status, applied_at, approved_at)
     VALUES
      (:agentCreditsUserId, 'approved', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
    { agentCreditsUserId },
  );

  const [existingRows] = await credits.query<Array<RowDataPacket & { id: number }>>(
    `SELECT id
     FROM agent_relations
     WHERE agent_user_id = :agentCreditsUserId
       AND referred_user_id = :customerCreditsUserId
       AND tenant_id <=> :creditsTenantId
       AND relation_type = 'direct'
     ORDER BY FIELD(status, 'active') DESC, id ASC
     LIMIT 1`,
    {
      agentCreditsUserId,
      customerCreditsUserId: input.customerCreditsUserId,
      creditsTenantId: input.creditsTenantId ?? null,
    },
  );

  const existing = existingRows[0];
  if (existing) {
    await credits.query(
      `UPDATE agent_relations
       SET commission_rate = :commissionRate,
           status = 'active',
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = :id`,
      { id: existing.id, commissionRate },
    );
    return String(existing.id);
  }

  const [result] = await credits.query<any>(
    `INSERT INTO agent_relations
      (agent_user_id, referred_user_id, tenant_id, relation_type, commission_rate, status)
     VALUES
      (:agentCreditsUserId, :customerCreditsUserId, :creditsTenantId, 'direct', :commissionRate, 'active')`,
    {
      agentCreditsUserId,
      customerCreditsUserId: input.customerCreditsUserId,
      creditsTenantId: input.creditsTenantId ?? null,
      commissionRate,
    },
  );
  return String(result.insertId);
}

export async function deactivateCanonicalAgentRelations(input: {
  agentCreditsUserId?: number | null;
  customerCreditsUserId?: number | null;
}) {
  if (!input.agentCreditsUserId && !input.customerCreditsUserId) return;
  const conditions: string[] = ["status = 'active'"];
  const params: Record<string, number> = {};
  if (input.agentCreditsUserId) {
    conditions.push("agent_user_id = :agentCreditsUserId");
    params.agentCreditsUserId = input.agentCreditsUserId;
  }
  if (input.customerCreditsUserId) {
    conditions.push("referred_user_id = :customerCreditsUserId");
    params.customerCreditsUserId = input.customerCreditsUserId;
  }
  await getCreditsPool().query(
    `UPDATE agent_relations
     SET status = 'inactive', updated_at = CURRENT_TIMESTAMP(3)
     WHERE ${conditions.join(" AND ")}`,
    params,
  );
}

export async function suspendCanonicalAgent(agentCreditsUserId: number) {
  await Promise.all([
    deactivateCanonicalAgentRelations({ agentCreditsUserId }),
    getCreditsPool().query(
      `UPDATE agent_profiles
       SET status = 'suspended', updated_at = CURRENT_TIMESTAMP(3)
       WHERE user_id = :agentCreditsUserId
         AND status = 'approved'`,
      { agentCreditsUserId },
    ),
  ]);
}
