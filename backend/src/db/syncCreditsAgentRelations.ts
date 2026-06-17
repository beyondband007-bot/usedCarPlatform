import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "./mysql";
import { getCreditsPool } from "../modules/billing/creditsAccountLookupService";

type SourceRelationRow = RowDataPacket & {
  agent_credits_user_id: number;
  referred_credits_user_id: number;
  credits_tenant_id: number | null;
  commission_rate: string;
};

type ExistingRelationRow = RowDataPacket & { id: number };

export async function syncCreditsAgentRelations() {
  const [tableRows] = await pool.query<RowDataPacket[]>(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'agent_customer_relations'
     LIMIT 1`,
  );
  if (!tableRows.length) {
    return { sourceRelations: 0, profilesCreated: 0, relationsCreated: 0, relationsUpdated: 0 };
  }

  const [sourceRows] = await pool.query<SourceRelationRow[]>(
    `SELECT DISTINCT
       agent.credits_user_id agent_credits_user_id,
       customer.credits_user_id referred_credits_user_id,
       customer.credits_tenant_id,
       COALESCE(policy.commission_rate, 0.1000) commission_rate
     FROM agent_customer_relations relation_source
     JOIN app_users agent
       ON agent.id = relation_source.agent_user_id
      AND agent.status = 'active'
      AND agent.credits_user_id IS NOT NULL
     JOIN back_office_role_assignments agent_role
       ON agent_role.user_id = agent.id
      AND agent_role.role_code = 'agent'
      AND agent_role.status = 'active'
     JOIN app_users customer
       ON customer.id = relation_source.customer_user_id
      AND customer.status = 'active'
      AND customer.credits_user_id IS NOT NULL
     LEFT JOIN back_office_agent_policy_overrides policy
       ON policy.agent_user_id = agent.id
     WHERE relation_source.status = 'active'
     ORDER BY agent.credits_user_id, customer.credits_user_id, customer.credits_tenant_id`,
  );

  const creditsConnection = await getCreditsPool().getConnection();
  let profilesCreated = 0;
  let relationsCreated = 0;
  let relationsUpdated = 0;

  try {
    await creditsConnection.beginTransaction();

    for (const source of sourceRows) {
      const [profileResult] = await creditsConnection.query<ResultSetHeader>(
        `INSERT IGNORE INTO agent_profiles
          (user_id, status, applied_at, approved_at)
         VALUES
          (:agentUserId, 'approved', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
        { agentUserId: source.agent_credits_user_id },
      );
      if (profileResult.affectedRows === 1) profilesCreated += 1;

      const [existingRows] = await creditsConnection.query<ExistingRelationRow[]>(
        `SELECT id
         FROM agent_relations
         WHERE agent_user_id = :agentUserId
           AND referred_user_id = :referredUserId
           AND tenant_id <=> :tenantId
           AND relation_type = 'direct'
         ORDER BY FIELD(status, 'active') DESC, id ASC
         LIMIT 1
         FOR UPDATE`,
        {
          agentUserId: source.agent_credits_user_id,
          referredUserId: source.referred_credits_user_id,
          tenantId: source.credits_tenant_id,
        },
      );

      const existing = existingRows[0];
      if (existing) {
        await creditsConnection.query(
          `UPDATE agent_relations
           SET commission_rate = :commissionRate,
               status = 'active',
               updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = :id`,
          { id: existing.id, commissionRate: source.commission_rate },
        );
        relationsUpdated += 1;
      } else {
        await creditsConnection.query(
          `INSERT INTO agent_relations
            (agent_user_id, referred_user_id, tenant_id, relation_type, commission_rate, status)
           VALUES
            (:agentUserId, :referredUserId, :tenantId, 'direct', :commissionRate, 'active')`,
          {
            agentUserId: source.agent_credits_user_id,
            referredUserId: source.referred_credits_user_id,
            tenantId: source.credits_tenant_id,
            commissionRate: source.commission_rate,
          },
        );
        relationsCreated += 1;
      }
    }

    await creditsConnection.commit();
  } catch (error) {
    await creditsConnection.rollback();
    throw error;
  } finally {
    creditsConnection.release();
  }

  return {
    sourceRelations: sourceRows.length,
    profilesCreated,
    relationsCreated,
    relationsUpdated,
  };
}

if (require.main === module) {
  void syncCreditsAgentRelations()
    .then(async (result) => {
      console.log(JSON.stringify(result));
      await pool.end();
      await getCreditsPool().end();
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
