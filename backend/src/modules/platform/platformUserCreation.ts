import { createHash, pbkdf2Sync, randomBytes } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import type { AuthenticatedUser, SubscriptionPlanCode, UserRole } from "../auth/authTypes";
import { BACK_OFFICE_PERMISSION } from "../auth/rbac";
import { ensurePersonalCreditsAccount } from "../billing/creditsAccountLinkService";
import type { AccountCreationTargetRole, AccountCreationTargetScope } from "./accountCreationPolicyDefaults";
import { accountCreationPolicyService } from "./accountCreationPolicyService";

export type PlatformUserCreationTargetRole = AccountCreationTargetRole;

export type PlatformUserCreationInput = {
  username?: unknown;
  password?: unknown;
  displayName?: unknown;
  phone?: unknown;
  email?: unknown;
  targetRole?: unknown;
  applicationCode?: unknown;
  accountScope?: unknown;
  planCode?: unknown;
  initialPoints?: unknown;
  idempotencyKey?: unknown;
};

export type NormalizedPlatformUserCreationInput = {
  username: string;
  password: string;
  displayName: string;
  phone: string | null;
  email: string;
  targetRole: PlatformUserCreationTargetRole;
  applicationCode: string;
  accountScope: AccountCreationTargetScope;
  planCode: SubscriptionPlanCode;
  initialPoints: number;
  idempotencyKey: string;
};

export type PlatformUserCreationResponse = {
  idempotentReplay?: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    phone: string | null;
    role: UserRole;
    creditsUserId: number;
    accountScope: AccountCreationTargetScope;
  };
  creditsAccount: {
    userId: number;
    accountId: number;
    totalBalance: string;
    availableBalance: string;
  };
  applicationLink: {
    id: string;
    applicationCode: string;
    userId: string;
  };
  agentRelation: {
    id: string;
    agentUserId: string;
    customerUserId: string;
  } | null;
  policyDecision: {
    allowed: boolean;
    reason: string;
  };
};

type IdempotencyRow = RowDataPacket & {
  id: string;
  request_hash: string;
  response_json: string | null;
  status: string;
};

const DEFAULT_APPLICATION_CODE = "used-car-platform";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUsername(value: unknown) {
  const username = normalizeString(value).toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    throw errors.invalidParameter("username must be 3-32 lowercase letters, numbers, or underscores");
  }
  return username;
}

function normalizePassword(value: unknown) {
  const password = typeof value === "string" ? value : "";
  if (password.length < 6) {
    throw errors.invalidParameter("password must be at least 6 characters");
  }
  return password;
}

function normalizeTargetRole(value: unknown): PlatformUserCreationTargetRole {
  if (value === "admin" || value === "agent" || value === "user") return value;
  throw errors.invalidParameter("targetRole must be admin, agent, or user");
}

function normalizeApplicationCode(value: unknown) {
  const applicationCode = normalizeString(value) || DEFAULT_APPLICATION_CODE;
  if (!/^[a-z0-9][a-z0-9_-]{1,78}[a-z0-9]$/.test(applicationCode)) {
    throw errors.invalidParameter("applicationCode must be 3-80 lowercase letters, numbers, hyphens, or underscores");
  }
  return applicationCode;
}

function normalizeAccountScope(value: unknown): AccountCreationTargetScope {
  if (value === undefined || value === null || value === "" || value === "personal") return "personal";
  if (value === "tenant") {
    throw errors.invalidParameter("tenant account creation is not wired in Phase 4 yet");
  }
  throw errors.invalidParameter("accountScope must be personal or tenant");
}

function normalizePlanCode(value: unknown, targetRole: PlatformUserCreationTargetRole): SubscriptionPlanCode {
  if (value === "basic" || value === "team" || value === "flagship") return value;
  if (targetRole === "admin") return "flagship";
  if (targetRole === "agent") return "team";
  return "basic";
}

function normalizeInitialPoints(value: unknown) {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw errors.invalidParameter("initialPoints must be a non-negative number");
  }
  return parsed;
}

function normalizeIdempotencyKey(value: unknown) {
  const key = normalizeString(value);
  if (!key || key.length > 160) {
    throw errors.invalidParameter("idempotencyKey is required and must be 1-160 characters");
  }
  return key;
}

export function normalizePlatformUserCreationInput(
  input: PlatformUserCreationInput,
): NormalizedPlatformUserCreationInput {
  const username = normalizeUsername(input.username);
  const password = normalizePassword(input.password);
  const targetRole = normalizeTargetRole(input.targetRole);
  const displayName = normalizeString(input.displayName) || username;
  const phone = normalizeString(input.phone) || null;
  const email = normalizeString(input.email) || `${username}@used-car.local`;
  const applicationCode = normalizeApplicationCode(input.applicationCode);

  return {
    username,
    password,
    displayName,
    phone,
    email,
    targetRole,
    applicationCode,
    accountScope: normalizeAccountScope(input.accountScope),
    planCode: normalizePlanCode(input.planCode, targetRole),
    initialPoints: normalizeInitialPoints(input.initialPoints),
    idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, child]) => key !== "idempotencyKey" && child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
}

export function platformUserCreationRequestHash(input: NormalizedPlatformUserCreationInput) {
  return createHash("sha256").update(JSON.stringify(canonicalize(input))).digest("hex");
}

function hashPassword(password: string) {
  const iterations = 120_000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

function targetRoleToAppRole(targetRole: PlatformUserCreationTargetRole): UserRole {
  return targetRole === "user" ? "enterprise" : targetRole;
}

async function reserveIdempotency(operator: AuthenticatedUser, idempotencyKey: string, requestHash: string) {
  const id = createId("puci");
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT IGNORE INTO platform_user_creation_idempotency
      (id, operator_user_id, idempotency_key, request_hash, status)
     VALUES
      (:id, :operatorUserId, :idempotencyKey, :requestHash, 'pending')`,
    {
      id,
      operatorUserId: operator.id,
      idempotencyKey,
      requestHash,
    },
  );

  if (result.affectedRows === 1) return { id, replay: null as PlatformUserCreationResponse | null };

  const [rows] = await pool.query<IdempotencyRow[]>(
    `SELECT id, request_hash, response_json, status
     FROM platform_user_creation_idempotency
     WHERE operator_user_id = :operatorUserId
       AND idempotency_key = :idempotencyKey
     LIMIT 1`,
    { operatorUserId: operator.id, idempotencyKey },
  );
  const row = rows[0];
  if (!row) throw errors.conflict("idempotency reservation is unavailable");
  if (row.request_hash !== requestHash) {
    throw errors.conflict("idempotencyKey was already used with a different request");
  }
  if (row.status === "completed" && row.response_json) {
    return {
      id: row.id,
      replay: {
        ...(JSON.parse(row.response_json) as PlatformUserCreationResponse),
        idempotentReplay: true,
      },
    };
  }
  throw errors.conflict("idempotent request is already pending or failed", {
    idempotencyKey,
    status: row.status,
  });
}

async function completeIdempotency(id: string, response: PlatformUserCreationResponse) {
  await pool.query(
    `UPDATE platform_user_creation_idempotency
     SET status = 'completed',
         response_json = :responseJson
     WHERE id = :id`,
    { id, responseJson: JSON.stringify(response) },
  );
}

async function failIdempotency(id: string) {
  await pool.query(
    `UPDATE platform_user_creation_idempotency
     SET status = 'failed'
     WHERE id = :id
       AND status = 'pending'`,
    { id },
  );
}

async function usernameOrPhoneExists(username: string, phone: string | null) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id
     FROM app_users
     WHERE username = :username
        OR (:phone IS NOT NULL AND phone = :phone)
     LIMIT 1`,
    { username, phone },
  );
  return rows.length > 0;
}

async function writeDeniedAudit(input: {
  operator: AuthenticatedUser;
  targetRole: PlatformUserCreationTargetRole;
  applicationCode: string;
  policySnapshot: unknown;
  reason: string;
  idempotencyKey: string;
  requestHash: string;
  accountScope: AccountCreationTargetScope;
}) {
  await pool.query(
    `INSERT INTO account_creation_audit_logs
      (id, operator_user_id, operator_role_code, target_user_id, target_role_code,
       application_code, action_code, policy_snapshot_json, decision, reason,
       idempotency_key, request_hash, metadata_json)
     VALUES
      (:id, :operatorUserId, :operatorRoleCode, NULL, :targetRoleCode,
       :applicationCode, 'account:create', :policySnapshotJson, 'denied', :reason,
       :idempotencyKey, :requestHash, :metadataJson)`,
    {
      id: createId("acal"),
      operatorUserId: input.operator.id,
      operatorRoleCode: input.operator.role,
      targetRoleCode: input.targetRole,
      applicationCode: input.applicationCode,
      policySnapshotJson: JSON.stringify(input.policySnapshot),
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      metadataJson: JSON.stringify({ accountScope: input.accountScope }),
    },
  );
}

export async function createPlatformUser(
  req: Parameters<typeof getRequiredCurrentUser>[0],
  payload: PlatformUserCreationInput,
): Promise<PlatformUserCreationResponse> {
  const current = getRequiredCurrentUser(req);
  if (!current.user.permissions.includes(BACK_OFFICE_PERMISSION)) {
    throw errors.forbidden("back office permission is required");
  }

  const input = normalizePlatformUserCreationInput(payload);
  const requestHash = platformUserCreationRequestHash(input);
  const reservation = await reserveIdempotency(current.user, input.idempotencyKey, requestHash);
  if (reservation.replay) return reservation.replay;

  try {
    const policyDecision = await accountCreationPolicyService.canCreateAccount(
      { userId: current.user.id, roleCode: current.user.role },
      input.targetRole,
      input.accountScope,
    );
    if (!policyDecision.allowed) {
      await writeDeniedAudit({
        operator: current.user,
        targetRole: input.targetRole,
        applicationCode: input.applicationCode,
        policySnapshot: policyDecision.snapshot,
        reason: policyDecision.reason,
        idempotencyKey: input.idempotencyKey,
        requestHash,
        accountScope: input.accountScope,
      });
      throw errors.forbidden("account creation policy denied this request", {
        reason: policyDecision.reason,
        targetRole: input.targetRole,
      });
    }

    if (await usernameOrPhoneExists(input.username, input.phone)) {
      throw errors.conflict("username or phone already exists");
    }

    const credits = await ensurePersonalCreditsAccount({
      email: input.email,
      initialPoints: input.initialPoints,
    });

    const appUserId = createId("user");
    const appRole = targetRoleToAppRole(input.targetRole);
    const applicationLinkId = createId("acl");
    const agentRelationId = current.user.role === "agent" && input.targetRole === "user" ? createId("acr") : null;

    const response = await pool.getConnection().then(async (connection) => {
      try {
        await connection.beginTransaction();

        await connection.query(
          `INSERT INTO app_users
            (id, username, phone, password_hash, display_name, status, credits_user_id, account_scope)
           VALUES
            (:id, :username, :phone, :passwordHash, :displayName, 'active', :creditsUserId, :accountScope)`,
          {
            id: appUserId,
            username: input.username,
            phone: input.phone,
            passwordHash: hashPassword(input.password),
            displayName: input.displayName,
            creditsUserId: credits.userId,
            accountScope: input.accountScope,
          },
        );

        await connection.query(
          `INSERT INTO app_user_roles (user_id, role_code)
           VALUES (:userId, :roleCode)`,
          { userId: appUserId, roleCode: appRole },
        );

        await connection.query(
          `INSERT INTO user_subscriptions (user_id, plan_code, status)
           VALUES (:userId, :planCode, 'active')`,
          { userId: appUserId, planCode: input.planCode },
        );

        if (input.targetRole === "admin" || input.targetRole === "agent") {
          await connection.query(
            `INSERT INTO back_office_role_assignments
              (id, user_id, role_code, assigned_by_user_id, status, scope_json)
             VALUES
              (:id, :userId, :roleCode, :assignedByUserId, 'active', :scopeJson)`,
            {
              id: createId("boa"),
              userId: appUserId,
              roleCode: input.targetRole,
              assignedByUserId: current.user.id,
              scopeJson: JSON.stringify({ applicationCode: input.applicationCode }),
            },
          );
        }

        await connection.query(
          `INSERT INTO application_customer_links
            (id, application_code, user_id, credits_user_id, account_scope, credits_tenant_id,
             created_by_user_id, created_by_role_code, status, metadata_json)
           VALUES
            (:id, :applicationCode, :userId, :creditsUserId, :accountScope, NULL,
             :createdByUserId, :createdByRoleCode, 'active', :metadataJson)`,
          {
            id: applicationLinkId,
            applicationCode: input.applicationCode,
            userId: appUserId,
            creditsUserId: credits.userId,
            accountScope: input.accountScope,
            createdByUserId: current.user.id,
            createdByRoleCode: current.user.role,
            metadataJson: JSON.stringify({ targetRole: input.targetRole }),
          },
        );

        if (agentRelationId) {
          await connection.query(
            `INSERT INTO agent_customer_relations
              (id, agent_user_id, customer_user_id, customer_credits_user_id,
               application_code, relation_type, status, metadata_json)
             VALUES
              (:id, :agentUserId, :customerUserId, :customerCreditsUserId,
               :applicationCode, 'direct', 'active', :metadataJson)`,
            {
              id: agentRelationId,
              agentUserId: current.user.id,
              customerUserId: appUserId,
              customerCreditsUserId: credits.userId,
              applicationCode: input.applicationCode,
              metadataJson: JSON.stringify({ source: "platform-user-creation" }),
            },
          );
        }

        const result: PlatformUserCreationResponse = {
          user: {
            id: appUserId,
            username: input.username,
            displayName: input.displayName,
            phone: input.phone,
            role: appRole,
            creditsUserId: credits.userId,
            accountScope: input.accountScope,
          },
          creditsAccount: {
            userId: credits.userId,
            accountId: credits.accountId,
            totalBalance: credits.totalBalance,
            availableBalance: credits.availableBalance,
          },
          applicationLink: {
            id: applicationLinkId,
            applicationCode: input.applicationCode,
            userId: appUserId,
          },
          agentRelation: agentRelationId
            ? {
                id: agentRelationId,
                agentUserId: current.user.id,
                customerUserId: appUserId,
              }
            : null,
          policyDecision: {
            allowed: policyDecision.allowed,
            reason: policyDecision.reason,
          },
        };

        await connection.query(
          `INSERT INTO account_creation_audit_logs
            (id, operator_user_id, operator_role_code, target_user_id, target_role_code,
             application_code, action_code, policy_snapshot_json, decision, reason,
             idempotency_key, request_hash, metadata_json)
           VALUES
            (:id, :operatorUserId, :operatorRoleCode, :targetUserId, :targetRoleCode,
             :applicationCode, 'account:create', :policySnapshotJson, 'allowed', :reason,
             :idempotencyKey, :requestHash, :metadataJson)`,
          {
            id: createId("acal"),
            operatorUserId: current.user.id,
            operatorRoleCode: current.user.role,
            targetUserId: appUserId,
            targetRoleCode: input.targetRole,
            applicationCode: input.applicationCode,
            policySnapshotJson: JSON.stringify(policyDecision.snapshot),
            reason: policyDecision.reason,
            idempotencyKey: input.idempotencyKey,
            requestHash,
            metadataJson: JSON.stringify({ accountScope: input.accountScope }),
          },
        );

        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    });

    await completeIdempotency(reservation.id, response);
    return response;
  } catch (error) {
    await failIdempotency(reservation.id);
    throw error;
  }
}
