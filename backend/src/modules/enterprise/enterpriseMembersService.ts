import type { RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { getCurrentUserFromHeaders } from "../auth/authService";

export type EnterpriseChildMember = {
  id: string;
  username: string;
  displayName: string;
  memberRole: string;
  creditsUserId: number | null;
  accountScope: "personal" | "tenant";
  creditsTenantId: number | null;
};

interface EnterpriseMemberRow extends RowDataPacket {
  id: string;
  username: string;
  display_name: string;
  member_role: string;
  credits_user_id: number | null;
  account_scope: "personal" | "tenant";
  credits_tenant_id: number | null;
}

interface ChildCreditsIdentityRow extends RowDataPacket {
  credits_user_id: number | null;
  account_scope: "personal" | "tenant";
  credits_tenant_id: number | null;
}

export async function listEnterpriseChildMembers(
  headers?: Record<string, string | string[] | undefined>,
): Promise<EnterpriseChildMember[]> {
  const current = await getCurrentUserFromHeaders(headers);
  if (!current) {
    throw errors.unauthorized("login is required");
  }

  if (!current.user.canViewEnterpriseChildren || !current.user.enterpriseTenantId) {
    return [];
  }

  const [rows] = await pool.query<EnterpriseMemberRow[]>(
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
      AND u.id <> :ownerUserId
      AND u.status = 'active'
    ORDER BY
      FIELD(em.member_role, 'admin', 'member'),
      u.display_name ASC`,
    {
      tenantId: current.user.enterpriseTenantId,
      ownerUserId: current.user.id,
    },
  );

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    memberRole: row.member_role,
    creditsUserId: row.credits_user_id,
    accountScope: row.account_scope === "tenant" ? "tenant" : "personal",
    creditsTenantId: row.credits_tenant_id,
  }));
}

export async function resolveChildCreditsIdentity(
  headers: Record<string, string | string[] | undefined> | undefined,
  targetCreditsUserId: number,
): Promise<{
  userId: number;
  accountScope: "personal" | "tenant";
  tenantId?: number;
}> {
  const current = await getCurrentUserFromHeaders(headers);
  if (!current) {
    throw errors.unauthorized("login is required");
  }

  if (!current.user.canViewEnterpriseChildren || !current.user.enterpriseTenantId) {
    throw errors.forbidden("not allowed to query child account credits");
  }

  if (targetCreditsUserId === current.user.creditsUserId) {
    return {
      userId: current.user.creditsUserId as number,
      accountScope: current.user.accountScope,
      tenantId:
        current.user.accountScope === "tenant"
          ? current.user.creditsTenantId ?? undefined
          : undefined,
    };
  }

  const [rows] = await pool.query<ChildCreditsIdentityRow[]>(
    `SELECT u.credits_user_id, u.account_scope, u.credits_tenant_id
     FROM enterprise_members em
     JOIN app_users u ON u.id = em.user_id
     WHERE em.tenant_id = :tenantId
       AND em.status = 'active'
       AND u.credits_user_id = :targetCreditsUserId
       AND u.id <> :ownerUserId
     LIMIT 1`,
    {
      tenantId: current.user.enterpriseTenantId,
      targetCreditsUserId,
      ownerUserId: current.user.id,
    },
  );

  if (!rows.length || !rows[0]?.credits_user_id) {
    throw errors.forbidden("target child account is not in current enterprise tenant");
  }

  const row = rows[0];
  const accountScope = row.account_scope === "tenant" ? "tenant" : "personal";

  return {
    userId: row.credits_user_id as number,
    accountScope,
    tenantId: accountScope === "tenant" ? row.credits_tenant_id ?? undefined : undefined,
  };
}
