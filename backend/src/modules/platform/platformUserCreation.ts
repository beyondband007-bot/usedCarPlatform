import { createHash, pbkdf2Sync, randomBytes } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { getRequiredCurrentUser } from "../auth/authMiddleware";
import type { AuthenticatedUser, SubscriptionPlanCode, UserRole } from "../auth/authTypes";
import { BACK_OFFICE_PERMISSION } from "../auth/rbac";
import {
  ensurePersonalCreditsAccount,
  ensureTenantCreditsBundle,
} from "../billing/creditsAccountLinkService";
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
    tenantId?: number | null;
    accountId: number;
    totalBalance: string;
    availableBalance: string;
  };
  childAccounts?: Array<{
    id: string;
    username: string;
    displayName: string;
    creditsUserId: number;
    accountScope: "tenant";
  }>;
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

export type PlatformUserPromotionResponse = {
  user: {
    id: string;
    username: string;
    displayName: string;
    phone: string | null;
    role: "agent";
    creditsUserId: number | null;
    accountScope: "personal" | "tenant";
  };
  backOfficeRoleAssignment: {
    id: string;
    userId: string;
    roleCode: "agent";
    status: "active";
  };
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

type PromotionTargetRow = RowDataPacket & {
  id: string;
  username: string;
  display_name: string;
  phone: string | null;
  status: string;
  credits_user_id: number | null;
  account_scope: "personal" | "tenant";
  roles_csv: string | null;
};

const DEFAULT_APPLICATION_CODE = "used-car-platform";
const defaultInitialPointsByPlan: Record<SubscriptionPlanCode, number> = {
  basic: 20_000,
  team: 100_000,
  flagship: 800_000,
};

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

function normalizeInitialPoints(value: unknown, defaultPoints: number) {
  if (value === undefined || value === null || value === "") return defaultPoints;
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
  const planCode = normalizePlanCode(input.planCode, targetRole);

  return {
    username,
    password,
    displayName,
    phone,
    email,
    targetRole,
    applicationCode,
    accountScope: normalizeAccountScope(input.accountScope),
    planCode,
    initialPoints: normalizeInitialPoints(input.initialPoints, defaultInitialPointsByPlan[planCode]),
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

function shouldCreateFlagshipTenant(input: NormalizedPlatformUserCreationInput) {
  return input.targetRole === "user" && input.planCode === "flagship";
}

function flagshipChildUsername(username: string, index: number) {
  return `${username.slice(0, 24)}_child_${index}`;
}

function buildFlagshipChildDrafts(input: NormalizedPlatformUserCreationInput) {
  return [1, 2, 3].map((index) => {
    const username = flagshipChildUsername(input.username, index);
    return {
      id: createId("user"),
      username,
      displayName: `${input.displayName} 子账号 ${index}`,
      email: `${username}@used-car.local`,
      memberRole: index === 1 ? "admin" : "member",
      creditsRole: index === 1 ? "admin" : "employee",
    } as const;
  });
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

async function usernamesOrPhoneExist(usernames: string[], phone: string | null) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id
     FROM app_users
     WHERE username IN (:usernames)
        OR (:phone IS NOT NULL AND phone = :phone)
     LIMIT 1`,
    { usernames, phone },
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

async function writePromotionAudit(input: {
  operator: AuthenticatedUser;
  targetUserId: string;
  applicationCode: string;
  policySnapshot: unknown;
  decision: "allowed" | "denied";
  reason: string;
}) {
  await pool.query(
    `INSERT INTO account_creation_audit_logs
      (id, operator_user_id, operator_role_code, target_user_id, target_role_code,
       application_code, action_code, policy_snapshot_json, decision, reason, metadata_json)
     VALUES
      (:id, :operatorUserId, :operatorRoleCode, :targetUserId, 'agent',
       :applicationCode, 'account:promote', :policySnapshotJson, :decision, :reason, :metadataJson)`,
    {
      id: createId("acal"),
      operatorUserId: input.operator.id,
      operatorRoleCode: input.operator.role,
      targetUserId: input.targetUserId,
      applicationCode: input.applicationCode,
      policySnapshotJson: JSON.stringify(input.policySnapshot),
      decision: input.decision,
      reason: input.reason,
      metadataJson: JSON.stringify({ source: "user-to-agent-promotion" }),
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
  const createsFlagshipTenant = shouldCreateFlagshipTenant(input);
  const effectiveAccountScope: AccountCreationTargetScope = createsFlagshipTenant ? "tenant" : input.accountScope;
  const requestHash = platformUserCreationRequestHash(input);
  const reservation = await reserveIdempotency(current.user, input.idempotencyKey, requestHash);
  if (reservation.replay) return reservation.replay;

  try {
    const policyDecision = await accountCreationPolicyService.canCreateAccount(
      { userId: current.user.id, roleCode: current.user.role },
      input.targetRole,
      effectiveAccountScope,
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
        accountScope: effectiveAccountScope,
      });
      throw errors.forbidden("account creation policy denied this request", {
        reason: policyDecision.reason,
        targetRole: input.targetRole,
      });
    }

    const childDrafts = createsFlagshipTenant ? buildFlagshipChildDrafts(input) : [];
    if (await usernamesOrPhoneExist([input.username, ...childDrafts.map((child) => child.username)], input.phone)) {
      throw errors.conflict("username or phone already exists");
    }

    const tenantCredits = createsFlagshipTenant
      ? await ensureTenantCreditsBundle({
          tenantName: `${input.username} 旗舰共享积分账户`,
          initialPoints: input.initialPoints,
          members: [
            { username: input.username, email: input.email, role: "owner" },
            ...childDrafts.map((child) => ({
              username: child.username,
              email: child.email,
              role: child.creditsRole,
            })),
          ],
        })
      : null;
    const credits =
      tenantCredits ??
      (await ensurePersonalCreditsAccount({
        username: input.username,
        email: input.email,
        initialPoints: input.initialPoints,
      }));
    const creditsTenantId = tenantCredits?.tenantId ?? null;
    const tenantMemberUserIds = tenantCredits?.memberUserIds ?? [];

    const appUserId = createId("user");
    const appTenantId = createsFlagshipTenant ? createId("tenant") : null;
    const appRole = targetRoleToAppRole(input.targetRole);
    const applicationLinkId = createId("acl");
    const agentRelationId = current.user.role === "agent" && input.targetRole === "user" ? createId("acr") : null;

    const response = await pool.getConnection().then(async (connection) => {
      try {
        await connection.beginTransaction();

        await connection.query(
          `INSERT INTO app_users
            (id, username, phone, password_hash, display_name, status,
             credits_user_id, credits_tenant_id, account_scope)
           VALUES
            (:id, :username, :phone, :passwordHash, :displayName, 'active',
             :creditsUserId, :creditsTenantId, :accountScope)`,
          {
            id: appUserId,
            username: input.username,
            phone: input.phone,
            passwordHash: hashPassword(input.password),
            displayName: input.displayName,
            creditsUserId: credits.userId,
            creditsTenantId,
            accountScope: effectiveAccountScope,
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
            (:id, :applicationCode, :userId, :creditsUserId, :accountScope, :creditsTenantId,
             :createdByUserId, :createdByRoleCode, 'active', :metadataJson)`,
          {
            id: applicationLinkId,
            applicationCode: input.applicationCode,
            userId: appUserId,
            creditsUserId: credits.userId,
            accountScope: effectiveAccountScope,
            creditsTenantId,
            createdByUserId: current.user.id,
            createdByRoleCode: current.user.role,
            metadataJson: JSON.stringify({
              targetRole: input.targetRole,
              enterpriseAccountRole: createsFlagshipTenant ? "mother" : "standalone",
            }),
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

        if (createsFlagshipTenant && appTenantId && tenantCredits) {
          await connection.query(
            `INSERT INTO enterprise_tenants
              (id, name, owner_user_id, subscription_user_id, status)
             VALUES
              (:id, :name, :ownerUserId, :subscriptionUserId, 'active')`,
            {
              id: appTenantId,
              name: `${input.username} 旗舰共享积分账户`,
              ownerUserId: appUserId,
              subscriptionUserId: appUserId,
            },
          );

          await connection.query(
            `INSERT INTO enterprise_members
              (id, tenant_id, user_id, member_role, status)
             VALUES
              (:id, :tenantId, :userId, 'owner', 'active')`,
            {
              id: createId("em"),
              tenantId: appTenantId,
              userId: appUserId,
            },
          );

          for (const [index, child] of childDrafts.entries()) {
            const childCreditsUserId = tenantMemberUserIds[index + 1];
            await connection.query(
              `INSERT INTO app_users
                (id, username, phone, password_hash, display_name, status,
                 credits_user_id, credits_tenant_id, account_scope)
               VALUES
                (:id, :username, NULL, :passwordHash, :displayName, 'active',
                 :creditsUserId, :creditsTenantId, 'tenant')`,
              {
                id: child.id,
                username: child.username,
                passwordHash: hashPassword(input.password),
                displayName: child.displayName,
                creditsUserId: childCreditsUserId,
                creditsTenantId,
              },
            );

            await connection.query(
              `INSERT INTO app_user_roles (user_id, role_code)
               VALUES (:userId, 'enterprise')`,
              { userId: child.id },
            );

            await connection.query(
              `INSERT INTO enterprise_members
                (id, tenant_id, user_id, member_role, status)
               VALUES
                (:id, :tenantId, :userId, :memberRole, 'active')`,
              {
                id: createId("em"),
                tenantId: appTenantId,
                userId: child.id,
                memberRole: child.memberRole,
              },
            );

            await connection.query(
              `INSERT INTO application_customer_links
                (id, application_code, user_id, credits_user_id, account_scope, credits_tenant_id,
                 created_by_user_id, created_by_role_code, status, metadata_json)
               VALUES
                (:id, :applicationCode, :userId, :creditsUserId, 'tenant', :creditsTenantId,
                 :createdByUserId, :createdByRoleCode, 'active', :metadataJson)`,
              {
                id: createId("acl"),
                applicationCode: input.applicationCode,
                userId: child.id,
                creditsUserId: childCreditsUserId,
                creditsTenantId,
                createdByUserId: current.user.id,
                createdByRoleCode: current.user.role,
                metadataJson: JSON.stringify({
                  targetRole: input.targetRole,
                  enterpriseAccountRole: "child",
                  parentUserId: appUserId,
                }),
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
                  id: createId("acr"),
                  agentUserId: current.user.id,
                  customerUserId: child.id,
                  customerCreditsUserId: childCreditsUserId,
                  applicationCode: input.applicationCode,
                  metadataJson: JSON.stringify({
                    source: "platform-user-creation",
                    parentUserId: appUserId,
                  }),
                },
              );
            }
          }
        }

        const result: PlatformUserCreationResponse = {
          user: {
            id: appUserId,
            username: input.username,
            displayName: input.displayName,
            phone: input.phone,
            role: appRole,
            creditsUserId: credits.userId,
            accountScope: effectiveAccountScope,
          },
          creditsAccount: {
            userId: credits.userId,
            tenantId: creditsTenantId,
            accountId: credits.accountId,
            totalBalance: credits.totalBalance,
            availableBalance: credits.availableBalance,
          },
          childAccounts: createsFlagshipTenant && tenantCredits
            ? childDrafts.map((child, index) => ({
                id: child.id,
                username: child.username,
                displayName: child.displayName,
                creditsUserId: tenantMemberUserIds[index + 1],
                accountScope: "tenant" as const,
              }))
            : undefined,
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
            metadataJson: JSON.stringify({
              accountScope: effectiveAccountScope,
              flagshipChildCount: childDrafts.length,
            }),
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

export async function promotePlatformUserToAgent(
  req: Parameters<typeof getRequiredCurrentUser>[0],
  userId: string,
  payload: { applicationCode?: unknown } = {},
): Promise<PlatformUserPromotionResponse> {
  const current = getRequiredCurrentUser(req);
  if (!current.user.permissions.includes(BACK_OFFICE_PERMISSION)) {
    throw errors.forbidden("back office permission is required");
  }

  const applicationCode = normalizeApplicationCode(payload.applicationCode);
  const policyDecision = await accountCreationPolicyService.canPromoteUserToAgent({
    userId: current.user.id,
    roleCode: current.user.role,
  });

  if (!policyDecision.allowed) {
    await writePromotionAudit({
      operator: current.user,
      targetUserId: userId,
      applicationCode,
      policySnapshot: policyDecision.snapshot,
      decision: "denied",
      reason: policyDecision.reason,
    });
    throw errors.forbidden("user-to-agent promotion policy denied this request", {
      reason: policyDecision.reason,
      targetUserId: userId,
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [users] = await connection.query<PromotionTargetRow[]>(
      `SELECT
         u.id,
         u.username,
         u.display_name,
         u.phone,
       u.status,
       u.credits_user_id,
       u.account_scope,
        (
          SELECT GROUP_CONCAT(DISTINCT aur.role_code ORDER BY aur.role_code SEPARATOR ',')
          FROM app_user_roles aur
          WHERE aur.user_id = u.id
        ) roles_csv
       FROM app_users u
       WHERE u.id = :userId
       LIMIT 1
       FOR UPDATE`,
      { userId },
    );
    const user = users[0];
    if (!user || user.status !== "active") {
      throw errors.invalidParameter("target user account not found or inactive");
    }
    if (user.id === current.user.id) {
      throw errors.invalidParameter("cannot promote the current operator account");
    }

    const roles = new Set((user.roles_csv ?? "enterprise").split(",").filter(Boolean));
    if (roles.has("developer") || roles.has("admin")) {
      throw errors.invalidParameter("Developer/Admin accounts cannot be promoted to Agent");
    }
    if (roles.has("agent")) {
      throw errors.conflict("target user is already an Agent");
    }

    await connection.query(
      `INSERT INTO app_user_roles (user_id, role_code)
       VALUES (:userId, 'agent')
       ON DUPLICATE KEY UPDATE role_code = VALUES(role_code)`,
      { userId },
    );

    const roleAssignmentId = createId("boa");
    await connection.query(
      `INSERT INTO back_office_role_assignments
        (id, user_id, role_code, assigned_by_user_id, status, scope_json)
       VALUES
        (:id, :userId, 'agent', :assignedByUserId, 'active', :scopeJson)
       ON DUPLICATE KEY UPDATE
        assigned_by_user_id = VALUES(assigned_by_user_id),
        status = 'active',
        scope_json = VALUES(scope_json)`,
      {
        id: roleAssignmentId,
        userId,
        assignedByUserId: current.user.id,
        scopeJson: JSON.stringify({ applicationCode, promotedFromUser: true }),
      },
    );

    await connection.query(
      `INSERT INTO account_creation_audit_logs
        (id, operator_user_id, operator_role_code, target_user_id, target_role_code,
         application_code, action_code, policy_snapshot_json, decision, reason, metadata_json)
       VALUES
        (:id, :operatorUserId, :operatorRoleCode, :targetUserId, 'agent',
         :applicationCode, 'account:promote', :policySnapshotJson, 'allowed', :reason, :metadataJson)`,
      {
        id: createId("acal"),
        operatorUserId: current.user.id,
        operatorRoleCode: current.user.role,
        targetUserId: userId,
        applicationCode,
        policySnapshotJson: JSON.stringify(policyDecision.snapshot),
        reason: policyDecision.reason,
        metadataJson: JSON.stringify({ source: "user-to-agent-promotion" }),
      },
    );

    await connection.commit();

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        phone: user.phone,
        role: "agent",
        creditsUserId: user.credits_user_id,
        accountScope: user.account_scope,
      },
      backOfficeRoleAssignment: {
        id: roleAssignmentId,
        userId,
        roleCode: "agent",
        status: "active",
      },
      policyDecision: {
        allowed: policyDecision.allowed,
        reason: policyDecision.reason,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
