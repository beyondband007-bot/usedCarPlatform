import { pbkdf2Sync, randomBytes } from "node:crypto";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

import { env } from "../../config/env";
import { configureMysqlChinaTimezone, MYSQL_CHINA_TIME_ZONE } from "../../db/mysqlTimezone";
import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import type { AuthenticatedUser, UserRole } from "../auth/authTypes";
import {
  resolvePlatformCreditsAccountIdentity,
  type PlatformCreditsAccountIdentity,
} from "./platformCreditsAccountIdentity";
import {
  deactivateCanonicalAgentRelations,
  hasCanonicalAgentCustomerRelation,
  suspendCanonicalAgent,
} from "./creditsAgentRelationsService";

type MatrixTargetRole = "admin" | "agent" | "user";

type PlatformAccountRow = RowDataPacket & {
  id: string;
  username: string;
  display_name: string;
  phone: string | null;
  status: string;
  credits_user_id: number | null;
  credits_tenant_id: number | null;
  account_scope: string | null;
  role_code: string | null;
};

type SubscriptionPlanLookupRow = RowDataPacket & {
  code: string;
  application_code: string;
  name: string;
  status: string;
};

type ApplicationLinkRow = RowDataPacket & {
  application_code: string;
};

type ApplicationCodeRow = RowDataPacket & {
  application_code: string | null;
};

type CreditsAccountRow = RowDataPacket & {
  id: number;
  tenant_id: number | null;
  user_id: number | null;
  account_scope: "personal" | "tenant";
  total_balance: string;
  locked_balance: string;
  available_balance: string;
  status: string;
};

let creditsPool: Pool | null = null;

const getCreditsPool = () => {
  if (!creditsPool) {
    creditsPool = configureMysqlChinaTimezone(mysql.createPool({
      host: env.credits.mysql.host,
      port: env.credits.mysql.port,
      database: env.credits.mysql.database,
      user: env.credits.mysql.user,
      password: env.credits.mysql.password,
      timezone: MYSQL_CHINA_TIME_ZONE,
      waitForConnections: true,
      connectionLimit: env.credits.mysql.connectionLimit,
      namedPlaceholders: true,
    }));
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

function normalizePassword(value: unknown) {
  const password = typeof value === "string" ? value : "";
  if (password.length < 6) {
    throw errors.invalidParameter("password must be at least 6 characters");
  }
  return password;
}

function hashPassword(password: string) {
  const iterations = 120_000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

function matrixRole(role: string | null): MatrixTargetRole | "developer" | null {
  if (role === "admin" || role === "agent" || role === "developer") return role;
  if (role === "enterprise" || role === "user") return "user";
  return null;
}

function normalizeApplicationCode(value: unknown) {
  const applicationCode = normalizeText(value, 80) || "used-car-platform";
  if (!/^[a-z0-9][a-z0-9_-]{1,78}[a-z0-9]$/.test(applicationCode)) {
    throw errors.invalidParameter("applicationCode must be 3-80 lowercase letters, numbers, hyphens, or underscores");
  }
  return applicationCode;
}

function normalizePlanCode(value: unknown) {
  const planCode = normalizeText(value, 32);
  if (!/^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$/.test(planCode)) {
    throw errors.invalidParameter("planCode must be 3-32 lowercase letters, numbers, hyphens, or underscores");
  }
  return planCode;
}

function canConnectApplicationTarget(
  operator: AuthenticatedUser,
  targetRole: MatrixTargetRole | "developer" | null,
) {
  if (operator.role !== "developer" && operator.role !== "admin" && operator.role !== "agent") return false;
  if (operator.role === "agent") return targetRole === "user";
  return targetRole === "agent" || targetRole === "user";
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

function canEditProfileTarget(operator: AuthenticatedUser, targetRole: MatrixTargetRole | "developer" | null) {
  if (targetRole === "developer" || !targetRole) return false;
  if (operator.role === "developer") return targetRole === "admin" || targetRole === "agent" || targetRole === "user";
  if (operator.role === "admin") return targetRole === "agent" || targetRole === "user";
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
       u.phone,
       u.status,
       u.credits_user_id,
       u.credits_tenant_id,
       u.account_scope,
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

function requireProfileEditAllowed(operator: AuthenticatedUser, target: PlatformAccountRow) {
  if (operator.id === target.id) {
    throw errors.forbidden("operators cannot edit their own back-office account profile here");
  }

  const targetRole = matrixRole(target.role_code);
  if (!canEditProfileTarget(operator, targetRole)) {
    throw errors.forbidden("role capability matrix denied this target", {
      operatorRole: operator.role,
      targetRole,
    });
  }

  return targetRole as MatrixTargetRole;
}

async function findCreditsAccount(identity: PlatformCreditsAccountIdentity) {
  const [rows] = await getCreditsPool().query<CreditsAccountRow[]>(
    `SELECT id, tenant_id, user_id, account_scope,
            total_balance, locked_balance, available_balance, status
     FROM credit_accounts
     WHERE account_scope = :accountScope
       AND (
         (:accountScope = 'tenant' AND tenant_id = :creditsTenantId AND user_id IS NULL)
         OR
         (:accountScope = 'personal' AND user_id = :creditsUserId AND tenant_id IS NULL)
       )
       AND status = 'active'
     ORDER BY id
     LIMIT 1`,
    identity,
  );

  const account = rows[0];
  if (!account) throw errors.invalidParameter("target credits account not found");
  return account;
}

async function assertAgentCanConnectCustomerApplication(
  operatorUserId: string,
  targetUserId: string,
  applicationCode: string,
) {
  const [grantRows] = await pool.query<Array<RowDataPacket & { application_code: string }>>(
    `SELECT application_code
     FROM application_customer_links
     WHERE user_id = :operatorUserId
       AND application_code = :applicationCode
       AND status = 'active'
     LIMIT 1`,
    { operatorUserId, applicationCode },
  );
  if (!grantRows.length) {
    throw errors.forbidden("Agent is not granted access to this application", {
      operatorUserId,
      applicationCode,
    });
  }

  if (!(await hasCanonicalAgentCustomerRelation(operatorUserId, targetUserId))) {
    throw errors.forbidden("Agent can only connect applications for bound customers", {
      operatorUserId,
      targetUserId,
    });
  }
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
  const creditsIdentity = resolvePlatformCreditsAccountIdentity({
    creditsUserId: target.credits_user_id,
    accountScope: target.account_scope,
    creditsTenantId: target.credits_tenant_id,
  });
  if (!creditsIdentity) throw errors.invalidParameter("target user is not linked to credits");

  const points = normalizePoints(payload.points);
  const reason = normalizeText(payload.reason, 240) || "back-office manual adjustment";
  const idempotencyKey = normalizeText(payload.idempotencyKey, 160);
  const classifyAsRecharge = payload.classifyAsRecharge === true && points > 0;
  const transactionType = classifyAsRecharge ? "recharge" : "adjustment";
  const bizType = classifyAsRecharge ? "back-office-recharge" : "back-office-adjustment";
  const account = await findCreditsAccount(creditsIdentity);
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
      `SELECT id, tenant_id, user_id, account_scope,
              total_balance, locked_balance, available_balance, status
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
         NULL, NULL, :transactionType, :points, :balanceBefore,
         :balanceAfter, :bizType, :bizId, NULL, :remark
       )`,
      {
        tenantId: locked.tenant_id,
        creditsUserId: creditsIdentity.creditsUserId,
        accountId: locked.id,
        transactionType,
        points: points.toFixed(4),
        balanceBefore: lockedBalanceBefore.toFixed(4),
        balanceAfter: lockedBalanceAfter.toFixed(4),
        bizType,
        bizId: idempotencyKey || createId("adjust"),
        remark: JSON.stringify({
          reason,
          operatorUserId: current.user.id,
          operatorRole: current.user.role,
          targetAppUserId: target.id,
          targetRole,
          classifyAsRecharge,
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
        txnType: transactionType,
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

export async function connectPlatformUserApplicationByCapability(
  req: Parameters<typeof getRequiredCurrentUser>[0],
  targetUserId: unknown,
  payload: Record<string, unknown>,
) {
  const current = getRequiredCurrentUser(req);
  const target = await findTargetUser(targetUserId);
  const targetRole = matrixRole(target.role_code);
  if (!canConnectApplicationTarget(current.user, targetRole)) {
    throw errors.forbidden("only Developer or Admin can connect applications for Agents and Users", {
      operatorRole: current.user.role,
      targetRole,
    });
  }
  if (current.user.id === target.id) {
    throw errors.forbidden("operators cannot mutate their own back-office account");
  }
  if (target.status !== "active") {
    throw errors.invalidParameter("target user account is not active");
  }
  if (!target.credits_user_id) {
    throw errors.invalidParameter("target user is not linked to credits");
  }

  const applicationCode = normalizeApplicationCode(payload.applicationCode);
  const planCode = normalizePlanCode(payload.planCode);
  const reason = normalizeText(payload.reason, 240) || "back-office application connection";
  if (current.user.role === "agent") {
    await assertAgentCanConnectCustomerApplication(current.user.id, target.id, applicationCode);
  }

  const [planRows] = await pool.query<SubscriptionPlanLookupRow[]>(
    `SELECT code, application_code, name, status
     FROM subscription_plans
     WHERE application_code = :applicationCode
       AND code = :planCode
       AND status = 'active'
     LIMIT 1`,
    { applicationCode, planCode },
  );
  const plan = planRows[0];
  if (!plan) {
    throw errors.invalidParameter("selected application plan is not active");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO user_subscriptions (user_id, application_code, plan_code, status)
       VALUES (:userId, :applicationCode, :planCode, 'active')
       ON DUPLICATE KEY UPDATE
         application_code = VALUES(application_code),
         plan_code = VALUES(plan_code),
         status = 'active',
         updated_at = CURRENT_TIMESTAMP(3)`,
      {
        userId: target.id,
        applicationCode,
        planCode,
      },
    );

    await connection.query(
      `INSERT INTO application_customer_links
        (id, application_code, user_id, credits_user_id, account_scope, credits_tenant_id,
         created_by_user_id, created_by_role_code, status, metadata_json)
       VALUES
        (:id, :applicationCode, :userId, :creditsUserId, :accountScope, :creditsTenantId,
         :createdByUserId, :createdByRoleCode, 'active', :metadataJson)
       ON DUPLICATE KEY UPDATE
         credits_user_id = VALUES(credits_user_id),
         account_scope = VALUES(account_scope),
         credits_tenant_id = VALUES(credits_tenant_id),
         created_by_user_id = VALUES(created_by_user_id),
         created_by_role_code = VALUES(created_by_role_code),
         status = 'active',
         metadata_json = VALUES(metadata_json),
         updated_at = CURRENT_TIMESTAMP(3)`,
      {
        id: createId("acl"),
        applicationCode,
        userId: target.id,
        creditsUserId: target.credits_user_id,
        accountScope: target.account_scope || "personal",
        creditsTenantId: target.credits_tenant_id,
        createdByUserId: current.user.id,
        createdByRoleCode: current.user.role,
        metadataJson: JSON.stringify({
          targetRole,
          planCode,
          source: current.user.role === "agent"
            ? "agent-customer-application-connect"
            : "back-office-application-connect",
        }),
      },
    );

    await connection.query(
      `INSERT INTO account_creation_audit_logs
        (id, operator_user_id, operator_role_code, target_user_id, target_role_code,
         application_code, action_code, policy_snapshot_json, decision, reason, metadata_json)
       VALUES
        (:id, :operatorUserId, :operatorRoleCode, :targetUserId, :targetRoleCode,
         :applicationCode, 'account:application:connect', JSON_OBJECT(), 'allowed', :reason, :metadataJson)`,
      {
        id: createId("acal"),
        operatorUserId: current.user.id,
        operatorRoleCode: current.user.role,
        targetUserId: target.id,
        targetRoleCode: targetRole,
        applicationCode,
        reason,
        metadataJson: JSON.stringify({
          username: target.username,
          creditsUserId: target.credits_user_id,
          planCode,
          planName: plan.name,
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

  const [applicationRows] = await pool.query<ApplicationLinkRow[]>(
    `SELECT application_code
     FROM application_customer_links
     WHERE user_id = :userId
       AND status = 'active'
     ORDER BY application_code ASC`,
    { userId: target.id },
  );

  return {
    updated: true,
    applicationCode,
    planCode,
    applications: applicationRows.map((row) => row.application_code),
    user: {
      id: target.id,
      username: target.username,
      displayName: target.display_name,
      role: targetRole,
      status: target.status,
    },
  };
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

  if (target.credits_user_id) {
    await deactivateCanonicalAgentRelations(
      targetRole === "agent"
        ? { agentCreditsUserId: target.credits_user_id }
        : { customerCreditsUserId: target.credits_user_id },
    );
  }

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

export async function resetPlatformUserPasswordByDeveloper(
  req: Parameters<typeof getRequiredCurrentUser>[0],
  targetUserId: unknown,
  payload: Record<string, unknown>,
) {
  const current = getRequiredCurrentUser(req);
  const target = await findTargetUser(targetUserId);
  const targetRole = matrixRole(target.role_code);
  if (!targetRole) {
    throw errors.invalidParameter("target user role is not available");
  }
  if (target.status !== "active") {
    throw errors.invalidParameter("target user account is not active");
  }
  const resetsSelf = current.user.id === target.id;
  if (current.user.role !== "developer" && !resetsSelf) {
    throw errors.forbidden("only Developer can reset other platform user passwords");
  }

  const password = normalizePassword(payload.password);
  const reason = normalizeText(payload.reason, 240) || (
    resetsSelf
      ? "back-office user reset own platform password"
      : "Developer reset platform user password"
  );

  await pool.query(
    `UPDATE app_users
     SET password_hash = :passwordHash,
         updated_at = CURRENT_TIMESTAMP(3)
     WHERE id = :targetUserId`,
    {
      targetUserId: target.id,
      passwordHash: hashPassword(password),
    },
  );

  await pool.query(
    `INSERT INTO account_creation_audit_logs
      (id, operator_user_id, operator_role_code, target_user_id, target_role_code,
       application_code, action_code, policy_snapshot_json, decision, reason, metadata_json)
     VALUES
      (:id, :operatorUserId, :operatorRoleCode, :targetUserId, :targetRoleCode,
       NULL, 'account:password:reset', JSON_OBJECT(), 'allowed', :reason, :metadataJson)`,
    {
      id: createId("acal"),
      operatorUserId: current.user.id,
      operatorRoleCode: current.user.role,
      targetUserId: target.id,
      targetRoleCode: targetRole,
      reason,
      metadataJson: JSON.stringify({
        username: target.username,
        resetSelf: resetsSelf,
      }),
    },
  );

  return {
    updated: true,
    user: {
      id: target.id,
      username: target.username,
      displayName: target.display_name,
      role: targetRole,
      status: target.status,
    },
  };
}

export async function updatePlatformUserProfileByCapability(
  req: Parameters<typeof getRequiredCurrentUser>[0],
  targetUserId: unknown,
  payload: Record<string, unknown>,
) {
  const current = getRequiredCurrentUser(req);
  const target = await findTargetUser(targetUserId);
  const targetRole = requireProfileEditAllowed(current.user, target);
  if (target.status !== "active") {
    throw errors.invalidParameter("target user account is not active");
  }

  const displayName = normalizeText(payload.displayName, 120);
  if (!displayName) {
    throw errors.invalidParameter("displayName is required");
  }
  const phone = normalizeText(payload.phone, 32) || null;
  const reason = normalizeText(payload.reason, 240) || "back-office profile update";

  if (phone) {
    const [duplicateRows] = await pool.query<Array<RowDataPacket & { id: string }>>(
      `SELECT id
       FROM app_users
       WHERE phone = :phone
         AND id <> :targetUserId
         AND status <> 'deleted'
       LIMIT 1`,
      { phone, targetUserId: target.id },
    );
    if (duplicateRows.length > 0) {
      throw errors.invalidParameter("phone is already used by another account");
    }
  }

  await pool.query(
    `UPDATE app_users
     SET display_name = :displayName,
         phone = :phone,
         updated_at = CURRENT_TIMESTAMP(3)
     WHERE id = :targetUserId`,
    {
      targetUserId: target.id,
      displayName,
      phone,
    },
  );

  await pool.query(
    `INSERT INTO account_creation_audit_logs
      (id, operator_user_id, operator_role_code, target_user_id, target_role_code,
       application_code, action_code, policy_snapshot_json, decision, reason, metadata_json)
     VALUES
      (:id, :operatorUserId, :operatorRoleCode, :targetUserId, :targetRoleCode,
       NULL, 'account:profile:update', JSON_OBJECT(), 'allowed', :reason, :metadataJson)`,
    {
      id: createId("acal"),
      operatorUserId: current.user.id,
      operatorRoleCode: current.user.role,
      targetUserId: target.id,
      targetRoleCode: targetRole,
      reason,
      metadataJson: JSON.stringify({
        username: target.username,
        previousDisplayName: target.display_name,
        previousPhone: target.phone,
        displayName,
        phone,
      }),
    },
  );

  return {
    updated: true,
    user: {
      id: target.id,
      username: target.username,
      displayName,
      phone,
      role: targetRole,
      status: target.status,
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
  if (!target.credits_user_id) {
    throw errors.invalidParameter("target Agent is not linked to credits");
  }

  const reason = normalizeText(payload.reason, 240) || "back-office agent disabled";
  const connection = await pool.getConnection();
  let convertedApplicationCodes: string[] = [];
  try {
    await connection.beginTransaction();

    const [applicationRows] = await connection.query<ApplicationCodeRow[]>(
      `SELECT DISTINCT application_code
       FROM (
         SELECT application_code
         FROM application_customer_links
         WHERE user_id = :targetUserId
         UNION
         SELECT application_code
         FROM agent_leads
         WHERE agent_user_id = :targetUserId
           AND status = 'active'
       ) inferred_apps
       WHERE application_code IS NOT NULL
         AND application_code <> ''
       ORDER BY application_code ASC`,
      { targetUserId: target.id },
    );
    convertedApplicationCodes = applicationRows
      .map((row) => row.application_code)
      .filter((code): code is string => Boolean(code));
    if (convertedApplicationCodes.length === 0) {
      convertedApplicationCodes = [env.credits.applicationCode];
    }

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

    for (const applicationCode of convertedApplicationCodes) {
      await connection.query(
        `INSERT INTO application_customer_links
          (id, application_code, user_id, credits_user_id, account_scope, credits_tenant_id,
           created_by_user_id, created_by_role_code, status, metadata_json)
         VALUES
          (:id, :applicationCode, :userId, :creditsUserId, :accountScope, :creditsTenantId,
           :createdByUserId, :createdByRoleCode, 'active', :metadataJson)
         ON DUPLICATE KEY UPDATE
           credits_user_id = VALUES(credits_user_id),
           account_scope = VALUES(account_scope),
           credits_tenant_id = VALUES(credits_tenant_id),
           created_by_user_id = VALUES(created_by_user_id),
           created_by_role_code = VALUES(created_by_role_code),
           status = 'active',
           metadata_json = VALUES(metadata_json),
           updated_at = CURRENT_TIMESTAMP(3)`,
        {
          id: createId("acl"),
          applicationCode,
          userId: target.id,
          creditsUserId: target.credits_user_id,
          accountScope: target.account_scope || "personal",
          creditsTenantId: target.credits_tenant_id,
          createdByUserId: current.user.id,
          createdByRoleCode: current.user.role,
          metadataJson: JSON.stringify({
            targetRole: "user",
            convertedFromRole: "agent",
            source: "back-office-disable-agent",
          }),
        },
      );
    }

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
          convertedApplicationCodes,
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

  await suspendCanonicalAgent(target.credits_user_id);

  return {
    disabled: true,
    user: {
      id: target.id,
      username: target.username,
      displayName: target.display_name,
      role: "user",
      creditsUserId: target.credits_user_id,
      status: target.status,
      applications: convertedApplicationCodes,
    },
  };
}
