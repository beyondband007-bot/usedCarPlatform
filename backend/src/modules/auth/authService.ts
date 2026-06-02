import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

import type { IncomingHttpHeaders } from "node:http";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { ensurePersonalCreditsAccount } from "../billing/creditsAccountLinkService";
import type {
  AuthenticatedUser,
  AuthUserRow,
  PlanSeedRow,
  SessionUserRow,
  SubscriptionRow,
  SubscriptionSnapshot,
} from "./authTypes";

const SESSION_DAYS = {
  normal: 7,
  remember: 30,
};

const userSelectSql = `
  SELECT
    u.id,
    u.username,
    u.password_hash,
    u.display_name,
    u.status,
    u.credits_user_id,
    u.credits_tenant_id,
    u.account_scope,
    COALESCE(MIN(aur.role_code), 'enterprise') role_code,
    GROUP_CONCAT(DISTINCT arp.permission_code ORDER BY arp.permission_code SEPARATOR ',') permissions_csv
  FROM app_users u
  LEFT JOIN app_user_roles aur ON aur.user_id = u.id
  LEFT JOIN app_role_permissions arp ON arp.role_code = aur.role_code
`;

const mapUser = (row: AuthUserRow): AuthenticatedUser => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  role: row.role_code ?? "enterprise",
  permissions: row.permissions_csv ? row.permissions_csv.split(",").filter(Boolean) : [],
  creditsUserId: row.credits_user_id,
  creditsTenantId: row.credits_tenant_id,
  accountScope: row.account_scope === "tenant" ? "tenant" : "personal",
});

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const extractBearerToken = (headers?: IncomingHttpHeaders | Record<string, string | string[] | undefined>) => {
  const authorization = headers?.authorization ?? headers?.Authorization;
  const value = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length).trim() || null;
};

const verifyPassword = (password: string, storedHash: string) => {
  const [algorithm, iterationsText, salt, expectedHash] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsText || !salt || !expectedHash) return false;

  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  const actual = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
};

const hashPassword = (password: string) => {
  const iterations = 120_000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
};

const normalizePlanCode = (value: unknown) => {
  return value === "team" || value === "flagship" ? value : "basic";
};

const findUserByUsername = async (username: string) => {
  const [rows] = await pool.query<AuthUserRow[]>(
    `${userSelectSql}
     WHERE u.username = :username
     GROUP BY u.id
     LIMIT 1`,
    { username },
  );
  return rows[0] ?? null;
};

const getPlanSeed = async (planCode: string) => {
  const [rows] = await pool.query<PlanSeedRow[]>(
    `SELECT code, gift_points
     FROM subscription_plans
     WHERE code = :planCode
       AND status = 'active'
     LIMIT 1`,
    { planCode },
  );
  const row = rows[0];
  if (!row) throw errors.invalidParameter("subscription plan is not available", { planCode });
  return row;
};

export const getSubscriptionSnapshotForUser = async (userId: string): Promise<SubscriptionSnapshot> => {
  const [rows] = await pool.query<SubscriptionRow[]>(
    `SELECT
       p.code current_plan,
       p.account_limit,
       p.concurrent_task_limit,
       p.visual_concurrent_task_limit,
       p.batch_concurrent_task_limit,
       p.gift_points,
       COALESCE(direct_us.expires_at, tenant_us.expires_at) expires_at
     FROM app_users u
     LEFT JOIN user_subscriptions direct_us
       ON direct_us.user_id = u.id
      AND direct_us.status = 'active'
      AND (direct_us.expires_at IS NULL OR direct_us.expires_at > CURRENT_TIMESTAMP(3))
     LEFT JOIN enterprise_members em
       ON em.user_id = u.id
      AND em.status = 'active'
     LEFT JOIN enterprise_tenants et
       ON et.id = em.tenant_id
      AND et.status = 'active'
     LEFT JOIN user_subscriptions tenant_us
       ON tenant_us.user_id = et.subscription_user_id
      AND tenant_us.status = 'active'
      AND (tenant_us.expires_at IS NULL OR tenant_us.expires_at > CURRENT_TIMESTAMP(3))
     JOIN subscription_plans p
       ON p.code = COALESCE(direct_us.plan_code, tenant_us.plan_code)
     WHERE u.id = :userId
       AND p.status = 'active'
     LIMIT 1`,
    { userId },
  );

  const row = rows[0];
  if (!row) {
    throw errors.forbidden("user subscription is not available", { userId });
  }

  return {
    currentPlan: row.current_plan,
    accountLimit: Number(row.account_limit),
    concurrentTaskLimit: Number(row.concurrent_task_limit),
    visualConcurrentTaskLimit: Number(row.visual_concurrent_task_limit),
    batchConcurrentTaskLimit: Number(row.batch_concurrent_task_limit),
    giftPoints: Number(row.gift_points),
    expireTime: row.expires_at?.toISOString() ?? "",
  };
};

export const getCurrentUserByToken = async (token: string) => {
  const [rows] = await pool.query<SessionUserRow[]>(
    `SELECT
       s.id session_id,
       s.expires_at,
       u.id,
       u.username,
       u.password_hash,
       u.display_name,
       u.status,
       u.credits_user_id,
       u.credits_tenant_id,
       u.account_scope,
       COALESCE(MIN(aur.role_code), 'enterprise') role_code,
       GROUP_CONCAT(DISTINCT arp.permission_code ORDER BY arp.permission_code SEPARATOR ',') permissions_csv
     FROM auth_sessions s
     JOIN app_users u ON u.id = s.user_id
     LEFT JOIN app_user_roles aur ON aur.user_id = u.id
     LEFT JOIN app_role_permissions arp ON arp.role_code = aur.role_code
     WHERE s.token_hash = :tokenHash
       AND s.revoked_at IS NULL
       AND s.expires_at > CURRENT_TIMESTAMP(3)
       AND u.status = 'active'
     GROUP BY s.id, u.id
     LIMIT 1`,
    { tokenHash: hashToken(token) },
  );

  const row = rows[0];
  if (!row) return null;

  return {
    sessionId: row.session_id,
    user: mapUser(row),
  };
};

export const getCurrentUserFromHeaders = async (
  headers?: IncomingHttpHeaders | Record<string, string | string[] | undefined>,
) => {
  const token = extractBearerToken(headers);
  if (!token) return null;
  return getCurrentUserByToken(token);
};

export const requireCurrentUserFromHeaders = async (
  headers?: IncomingHttpHeaders | Record<string, string | string[] | undefined>,
) => {
  const current = await getCurrentUserFromHeaders(headers);
  if (!current) throw errors.unauthorized("login is required");
  return current;
};

export const authService = {
  async register(input: { username?: unknown; password?: unknown; displayName?: unknown; planCode?: unknown }) {
    const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const displayName =
      typeof input.displayName === "string" && input.displayName.trim()
        ? input.displayName.trim()
        : username;

    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      throw errors.invalidParameter("username must be 3-32 lowercase letters, numbers, or underscores");
    }
    if (password.length < 6) {
      throw errors.invalidParameter("password must be at least 6 characters");
    }

    const existing = await findUserByUsername(username);
    if (existing) {
      throw errors.invalidParameter("username already exists");
    }

    const userId = createId("user");
    const planCode = normalizePlanCode(input.planCode);
    const plan = await getPlanSeed(planCode);
    const credits = await ensurePersonalCreditsAccount({
      email: `${username}@used-car.local`,
      initialPoints: plan.gift_points,
    });

    await pool.query(
      `INSERT INTO app_users
        (id, username, password_hash, display_name, status, credits_user_id, account_scope)
       VALUES
        (:id, :username, :passwordHash, :displayName, 'active', :creditsUserId, 'personal')`,
      {
        id: userId,
        username,
        passwordHash: hashPassword(password),
        displayName,
        creditsUserId: credits.userId,
      },
    );

    await pool.query(
      `INSERT INTO app_user_roles (user_id, role_code)
       VALUES (:userId, 'enterprise')`,
      { userId },
    );

    await pool.query(
      `INSERT INTO user_subscriptions (user_id, plan_code, status)
       VALUES (:userId, :planCode, 'active')`,
      { userId, planCode },
    );

    const row = await findUserByUsername(username);
    if (!row) throw errors.generationFailed("registered user cannot be loaded");

    return {
      userInfo: mapUser(row),
      subscription: await getSubscriptionSnapshotForUser(userId),
    };
  },

  async login(input: { username?: unknown; password?: unknown; remember?: unknown }) {
    const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";

    if (!username || !password) {
      throw errors.invalidParameter("username and password are required");
    }

    const row = await findUserByUsername(username);
    if (!row || row.status !== "active" || !verifyPassword(password, row.password_hash)) {
      throw errors.unauthorized("账号或密码错误");
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + (input.remember ? SESSION_DAYS.remember : SESSION_DAYS.normal) * 24 * 60 * 60 * 1000,
    );

    await pool.query(
      `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
       VALUES (:id, :userId, :tokenHash, :expiresAt)`,
      {
        id: createId("sess"),
        userId: row.id,
        tokenHash: hashToken(token),
        expiresAt,
      },
    );

    const user = mapUser(row);
    const subscription = await getSubscriptionSnapshotForUser(user.id);

    return {
      token,
      userInfo: user,
      subscription,
    };
  },

  async me(headers?: IncomingHttpHeaders | Record<string, string | string[] | undefined>) {
    const current = await requireCurrentUserFromHeaders(headers);
    const subscription = await getSubscriptionSnapshotForUser(current.user.id);
    return {
      userInfo: current.user,
      subscription,
    };
  },

  async logout(headers?: IncomingHttpHeaders | Record<string, string | string[] | undefined>) {
    const token = extractBearerToken(headers);
    if (!token) return { success: true };

    await pool.query(
      `UPDATE auth_sessions
       SET revoked_at = CURRENT_TIMESTAMP(3)
       WHERE token_hash = :tokenHash
         AND revoked_at IS NULL`,
      { tokenHash: hashToken(token) },
    );

    return { success: true };
  },
};
