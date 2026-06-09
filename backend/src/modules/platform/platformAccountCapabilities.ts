import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

import { env } from "../../config/env";
import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import type { AuthenticatedUser, UserRole } from "../auth/authTypes";

type MatrixTargetRole = "admin" | "agent" | "user";

type PlatformAccountRow = RowDataPacket & {
  id: string;
  username: string;
  display_name: string;
  status: string;
  credits_user_id: number | null;
  role_code: UserRole | null;
};

type CreditsAccountRow = RowDataPacket & {
  id: number;
  tenant_id: number | null;
  user_id: number;
  total_balance: string;
  locked_balance: string;
  available_balance: string;
  status: string;
};

let creditsPool: Pool | null = null;

const getCreditsPool = () => {
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
};

function normalizeText(value: unknown, maxLength: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.slice(0, maxLength);
}

function normalizePoints(value: unknown) {
  const points = Number(value);
  if (!Number.isFinite(points) || points === 0) {
    throw errors.invalidParameter("points must be a non-zero number");
  }
  return Number(points.toFixed(4));
}

function matrixRole(role: UserRole | null): MatrixTargetRole | "developer" | null {
  if (role === "admin" || role === "agent" || role === "developer") return role;
  if (role === "enterprise") return "user";
  return null;
}

function canAdjustTarget(operator: AuthenticatedUser, targetRole: MatrixTargetRole | "developer" | null) {
  if (targetRole === "developer" || !targetRole) return false;
  if (operator.role === "developer") return targetRole === "admin" || targetRole === "agent" || targetRole === "user";
  return false;
}

function canDeleteTarget(operator: AuthenticatedUser, targetRole: MatrixTargetRole | "developer" | null) {
  if (targetRole === "developer" || !targetRole) return false;
  if (operator.role === "developer") return targetRole === "admin" || targetRole === "agent" || targetRole === "user";
  if (operator.role === "admin") return targetRole === "agent";
  return false;
}

async function findTargetUser(targetUserId: unknown) {
  const userId = normalizeText(targetUserId, 64);
  if (!userId) throw errors.invalidParameter("targetUserId is required");

  const [rows] = await pool.query<PlatformAccountRow[]>(
    `SELECT
       u.id,
       u.username,
       u.display_name,
       u.status,
       u.credits_user_id,
       COALESCE(boa.role_code, aur.role_code) role_code
     FROM app_users u
     LEFT JOIN back_office_role_assignments boa
       ON boa.user_id = u.id
      AND boa.status = 'active'
      AND boa.role_code IN ('developer', 'admin', 'agent')
     LEFT JOIN app_user_roles aur ON aur.user_id = u.id
     WHERE u.id = :userId
     ORDER BY
       CASE COALESCE(boa.role_code, aur.role_code)
         WHEN 'developer' THEN 4
         WHEN 'admin' THEN 3
         WHEN 'agent' THEN 2
         WHEN 'enterprise' THEN 1
         ELSE 0
       END DESC
     LIMIT 1`,
    { userId },
  );

  const target = rows[0];
  if (!target || target.status === "deleted") {
    throw errors.invalidParameter("target user not found");
  }
  return target;
}

function requireMutationAllowed(
  operator: AuthenticatedUser,
  target: PlatformAccountRow,
  permission: string,
  canMutate: (operator: AuthenticatedUser, targetRole: MatrixTargetRole | "developer" | null) => boolean,
) {
  if (!operator.permissions.includes(permission)) {
    throw errors.forbidden("permission is required", { permission });
  }
  if (operator.id === target.id) {
    throw errors.forbidden("operators cannot mutate their own back-office account");
  }

  const targetRole = matrixRole(target.role_code);
  if (!canMutate(operator, targetRole)) {
    throw errors.forbidden("role capability matrix denied this target", {
      operatorRole: operator.role,
      targetRole,
    });
  }

  return targetRole as MatrixTargetRole;
}

async function findPersonalCreditsAccount(creditsUserId: number) {
  const [rows] = await getCreditsPool().query<CreditsAccountRow[]>(
    `SELECT id, tenant_id, user_id, total_balance, locked_balance, available_balance, status
     FROM credit_accounts
     WHERE user_id = :creditsUserId
       AND tenant_id IS NULL
       AND account_scope = 'personal'
       AND status = 'active'
     ORDER BY id
     LIMIT 1`,
    { creditsUserId },
  );

  const account = rows[0];
  if (!account) throw errors.invalidParameter("target credits account not found");
  return account;
}

export async function adjustPlatformUserCredits(
  req: Parameters<typeof getRequiredCurrentUser>[0],
  payload: Record<string, unknown>,
) {
  const current = getRequiredCurrentUser(req);
  const target = await findTargetUser(payload.targetUserId);
  const targetRole = requireMutationAllowed(
    current.user,
    target,
    "credits:points:adjust",
    canAdjustTarget,
  );
  if (!target.credits_user_id) throw errors.invalidParameter("target user is not linked to credits");

  const points = normalizePoints(payload.points);
  const reason = normalizeText(payload.reason, 240) || "back-office manual adjustment";
  const idempotencyKey = normalizeText(payload.idempotencyKey, 160);
  const account = await findPersonalCreditsAccount(target.credits_user_id);
  const balanceBefore = Number(account.total_balance);
  const balanceAfter = Number((balanceBefore + points).toFixed(4));

  if (balanceAfter < Number(account.locked_balance)) {
    throw errors.invalidParameter("adjustment would make total balance lower than locked balance", {
      lockedBalance: account.locked_balance,
      requestedBalanceAfter: balanceAfter.toFixed(4),
    });
  }

  const connection = await getCreditsPool().getConnection();
  try {
    await connection.beginTransaction();

    const [lockedRows] = await connection.query<CreditsAccountRow[]>(
      `SELECT id, tenant_id, user_id, total_balance, locked_balance, available_balance, status
       FROM credit_accounts
       WHERE id = :accountId
       FOR UPDATE`,
      { accountId: account.id },
    );
    const locked = lockedRows[0];
    if (!locked || locked.status !== "active") {
      throw errors.invalidParameter("target credits account not found");
    }

    const lockedBalanceBefore = Number(locked.total_balance);
    const lockedBalanceAfter = Number((lockedBalanceBefore + points).toFixed(4));
    if (lockedBalanceAfter < Number(locked.locked_balance)) {
      throw errors.invalidParameter("adjustment would make total balance lower than locked balance", {
        lockedBalance: locked.locked_balance,
        requestedBalanceAfter: lockedBalanceAfter.toFixed(4),
      });
    }

    await connection.query(
      `UPDATE credit_accounts
       SET total_balance = :balanceAfter,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = :accountId`,
      {
        accountId: locked.id,
        balanceAfter: lockedBalanceAfter.toFixed(4),
      },
    );

    const [transactionResult] = await connection.query<any>(
      `INSERT INTO credit_transactions (
         tenant_id, user_id, account_id, billing_task_id, payment_order_id,
         application_id, function_id, txn_type, points, balance_before,
         balance_after, biz_type, biz_id, ref_txn_id, remark
       )
       VALUES (
         :tenantId, :creditsUserId, :accountId, NULL, NULL,
         NULL, NULL, 'adjustment', :points, :balanceBefore,
         :balanceAfter, 'back-office-adjustment', :bizId, NULL, :remark
       )`,
      {
        tenantId: locked.tenant_id,
        creditsUserId: locked.user_id,
        accountId: locked.id,
        points: points.toFixed(4),
        balanceBefore: lockedBalanceBefore.toFixed(4),
        balanceAfter: lockedBalanceAfter.toFixed(4),
        bizId: idempotencyKey || createId("adjust"),
        remark: JSON.stringify({
          reason,
          operatorUserId: current.user.id,
          operatorRole: current.user.role,
          targetAppUserId: target.id,
          targetRole,
        }),
      },
    );

    await connection.commit();

    return {
      targetUser: {
        id: target.id,
        username: target.username,
        displayName: target.display_name,
        role: targetRole,
        creditsUserId: target.credits_user_id,
      },
      adjustment: {
        transactionId: Number(transactionResult.insertId),
        points,
        balanceBefore: lockedBalanceBefore.toFixed(4),
        balanceAfter: lockedBalanceAfter.toFixed(4),
        reason,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deletePlatformUserByCapability(
  req: Parameters<typeof getRequiredCurrentUser>[0],
  targetUserId: unknown,
  payload: Record<string, unknown>,
) {
  const current = getRequiredCurrentUser(req);
  const target = await findTargetUser(targetUserId);
  const targetRole = requireMutationAllowed(
    current.user,
    target,
    `account:delete:${matrixRole(target.role_code)}`,
    canDeleteTarget,
  );
  const reason = normalizeText(payload.reason, 240) || "back-office account deletion";

  await pool.query(
    `UPDATE app_users
     SET status = 'deleted',
         updated_at = CURRENT_TIMESTAMP(3)
     WHERE id = :targetUserId`,
    { targetUserId: target.id },
  );

  await pool.query(
    `UPDATE back_office_role_assignments
     SET status = 'revoked',
         updated_at = CURRENT_TIMESTAMP(3)
     WHERE user_id = :targetUserId`,
    { targetUserId: target.id },
  );

  await pool.query(
    `UPDATE application_customer_links
     SET status = 'deleted',
         updated_at = CURRENT_TIMESTAMP(3)
     WHERE user_id = :targetUserId`,
    { targetUserId: target.id },
  );

  await pool.query(
    `UPDATE agent_customer_relations
     SET status = 'deleted',
         updated_at = CURRENT_TIMESTAMP(3)
     WHERE agent_user_id = :targetUserId
        OR customer_user_id = :targetUserId`,
    { targetUserId: target.id },
  );

  await pool.query(
    `INSERT INTO account_creation_audit_logs
      (id, operator_user_id, operator_role_code, target_user_id, target_role_code,
       application_code, action_code, policy_snapshot_json, decision, reason, metadata_json)
     VALUES
      (:id, :operatorUserId, :operatorRoleCode, :targetUserId, :targetRoleCode,
       NULL, 'account:delete', JSON_OBJECT(), 'allowed', :reason, :metadataJson)`,
    {
      id: createId("acal"),
      operatorUserId: current.user.id,
      operatorRoleCode: current.user.role,
      targetUserId: target.id,
      targetRoleCode: targetRole,
      reason,
      metadataJson: JSON.stringify({
        username: target.username,
        creditsUserId: target.credits_user_id,
      }),
    },
  );

  return {
    deleted: true,
    user: {
      id: target.id,
      username: target.username,
      displayName: target.display_name,
      role: targetRole,
    },
  };
}

export async function disablePlatformAgentByCapability(
  req: Parameters<typeof getRequiredCurrentUser>[0],
  targetUserId: unknown,
  payload: Record<string, unknown>,
) {
  const current = getRequiredCurrentUser(req);
  const target = await findTargetUser(targetUserId);
  const targetRole = requireMutationAllowed(
    current.user,
    target,
    "account:delete:agent",
    canDeleteTarget,
  );
  if (targetRole !== "agent") {
    throw errors.invalidParameter("target user is not an active Agent");
  }
  if (target.status !== "active") {
    throw errors.invalidParameter("target Agent account is not active");
  }

  const reason = normalizeText(payload.reason, 240) || "back-office agent disabled";
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE back_office_role_assignments
       SET status = 'revoked',
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE user_id = :targetUserId
         AND role_code = 'agent'
         AND status = 'active'`,
      { targetUserId: target.id },
    );

    await connection.query(
      `INSERT INTO app_user_roles (user_id, role_code)
       VALUES (:targetUserId, 'enterprise')
       ON DUPLICATE KEY UPDATE role_code = VALUES(role_code)`,
      { targetUserId: target.id },
    );

    await connection.query(
      `DELETE FROM app_user_roles
       WHERE user_id = :targetUserId
         AND role_code = 'agent'`,
      { targetUserId: target.id },
    );

    await connection.query(
      `DELETE FROM back_office_agent_policy_overrides
       WHERE agent_user_id = :targetUserId`,
      { targetUserId: target.id },
    );

    await connection.query(
      `INSERT INTO account_creation_audit_logs
        (id, operator_user_id, operator_role_code, target_user_id, target_role_code,
         application_code, action_code, policy_snapshot_json, decision, reason, metadata_json)
       VALUES
        (:id, :operatorUserId, :operatorRoleCode, :targetUserId, 'agent',
         NULL, 'account:disable-agent', JSON_OBJECT(), 'allowed', :reason, :metadataJson)`,
      {
        id: createId("acal"),
        operatorUserId: current.user.id,
        operatorRoleCode: current.user.role,
        targetUserId: target.id,
        reason,
        metadataJson: JSON.stringify({
          username: target.username,
          creditsUserId: target.credits_user_id,
          revertedToRole: "user",
        }),
      },
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    disabled: true,
    user: {
      id: target.id,
      username: target.username,
      displayName: target.display_name,
      role: "user",
      creditsUserId: target.credits_user_id,
      status: target.status,
    },
  };
}
