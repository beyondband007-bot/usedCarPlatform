import mysql, { type Pool, type PoolConnection } from "mysql2/promise";

import { env } from "../../config/env";

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

const toPoints = (value: number | string) => Number(value || 0).toFixed(4);

export type LinkedCreditsAccount = {
  userId: number;
  accountId: number;
  totalBalance: string;
  availableBalance: string;
};

export type LinkedTenantCreditsBundle = LinkedCreditsAccount & {
  tenantId: number;
  memberUserIds: number[];
};

type TenantCreditsMemberInput = {
  email: string;
  role: "owner" | "admin" | "employee";
};

async function ensureCreditsUser(
  connection: PoolConnection,
  email: string,
) {
  const [existingUsers] = await connection.query<any[]>(
    `SELECT id
     FROM users
     WHERE email = :email
     ORDER BY id
     LIMIT 1`,
    { email },
  );

  if (existingUsers[0]) {
    const userId = Number(existingUsers[0].id);
    await connection.query(
      `UPDATE users
       SET status = 'active',
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = :userId`,
      { userId },
    );
    return userId;
  }

  const [created] = await connection.query<any>(
    `INSERT INTO users (email, status)
     VALUES (:email, 'active')`,
    { email },
  );
  return Number(created.insertId);
}

export const ensurePersonalCreditsAccount = async (input: {
  email: string;
  initialPoints: number | string;
}): Promise<LinkedCreditsAccount> => {
  const pool = getCreditsPool();
  const connection = await pool.getConnection();
  const initialPoints = toPoints(input.initialPoints);

  try {
    await connection.beginTransaction();

    const [existingUsers] = await connection.query<any[]>(
      `SELECT id
       FROM users
       WHERE email = :email
       ORDER BY id
       LIMIT 1`,
      { email: input.email },
    );

    let userId: number;
    if (existingUsers[0]) {
      userId = Number(existingUsers[0].id);
      await connection.query(
        `UPDATE users
         SET email = :email,
             status = 'active',
             updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = :userId`,
        { email: input.email, userId },
      );
    } else {
      const [created] = await connection.query<any>(
        `INSERT INTO users (email, status)
         VALUES (:email, 'active')
         ON DUPLICATE KEY UPDATE
          id = LAST_INSERT_ID(id),
          status = VALUES(status),
          updated_at = CURRENT_TIMESTAMP(3)`,
        { email: input.email },
      );
      userId = Number(created.insertId);
    }

    const [accounts] = await connection.query<any[]>(
      `SELECT id, total_balance, locked_balance, available_balance
       FROM credit_accounts
       WHERE user_id = :userId
         AND tenant_id IS NULL
         AND account_scope = 'personal'
         AND status = 'active'
       ORDER BY id
       LIMIT 1`,
      { userId },
    );

    let accountId: number;
    if (accounts[0]) {
      accountId = Number(accounts[0].id);
      if (Number(accounts[0].total_balance) === 0 && Number(initialPoints) > 0) {
        await connection.query(
          `UPDATE credit_accounts
           SET total_balance = :initialPoints,
               locked_balance = 0,
               updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = :accountId`,
          { initialPoints, accountId },
        );
      }
    } else {
      const [createdAccount] = await connection.query<any>(
        `INSERT INTO credit_accounts (
          tenant_id, user_id, account_scope, total_balance, locked_balance, currency, status
        )
        VALUES (NULL, :userId, 'personal', :initialPoints, 0, 'credits', 'active')`,
        { userId, initialPoints },
      );
      accountId = Number(createdAccount.insertId);
    }

    const [finalRows] = await connection.query<any[]>(
      `SELECT id, total_balance, available_balance
       FROM credit_accounts
       WHERE id = :accountId
       LIMIT 1`,
      { accountId },
    );

    await connection.commit();

    return {
      userId,
      accountId,
      totalBalance: String(finalRows[0]?.total_balance ?? initialPoints),
      availableBalance: String(finalRows[0]?.available_balance ?? initialPoints),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const ensureTenantCreditsBundle = async (input: {
  tenantName: string;
  initialPoints: number | string;
  members: TenantCreditsMemberInput[];
}): Promise<LinkedTenantCreditsBundle> => {
  const pool = getCreditsPool();
  const connection = await pool.getConnection();
  const initialPoints = toPoints(input.initialPoints);

  try {
    await connection.beginTransaction();

    const memberUserIds: number[] = [];
    for (const member of input.members) {
      memberUserIds.push(await ensureCreditsUser(connection, member.email));
    }

    const [existingTenants] = await connection.query<any[]>(
      `SELECT id
       FROM tenants
       WHERE name = :tenantName
         AND type = 'enterprise'
         AND status = 'active'
       ORDER BY id
       LIMIT 1`,
      { tenantName: input.tenantName },
    );

    let tenantId = existingTenants[0] ? Number(existingTenants[0].id) : null;
    if (!tenantId) {
      const [createdTenant] = await connection.query<any>(
        `INSERT INTO tenants (name, type, status)
         VALUES (:tenantName, 'enterprise', 'active')`,
        { tenantName: input.tenantName },
      );
      tenantId = Number(createdTenant.insertId);
    }

    for (const [index, member] of input.members.entries()) {
      const userId = memberUserIds[index];
      const [existingMembers] = await connection.query<any[]>(
        `SELECT id
         FROM tenant_members
         WHERE tenant_id = :tenantId
           AND user_id = :userId
         ORDER BY id
         LIMIT 1`,
        { tenantId, userId },
      );

      if (existingMembers[0]) {
        await connection.query(
          `UPDATE tenant_members
           SET role = :role,
               status = 'active',
               joined_at = COALESCE(joined_at, CURRENT_TIMESTAMP(3))
           WHERE id = :id`,
          { id: existingMembers[0].id, role: member.role },
        );
      } else {
        await connection.query(
          `INSERT INTO tenant_members (tenant_id, user_id, role, status, joined_at)
           VALUES (:tenantId, :userId, :role, 'active', CURRENT_TIMESTAMP(3))`,
          { tenantId, userId, role: member.role },
        );
      }
    }

    const [accounts] = await connection.query<any[]>(
      `SELECT id, total_balance, locked_balance, available_balance
       FROM credit_accounts
       WHERE tenant_id = :tenantId
         AND user_id IS NULL
         AND account_scope = 'tenant'
         AND status = 'active'
       ORDER BY id
       LIMIT 1`,
      { tenantId },
    );

    let accountId: number;
    if (accounts[0]) {
      accountId = Number(accounts[0].id);
      if (Number(accounts[0].total_balance) === 0 && Number(initialPoints) > 0) {
        await connection.query(
          `UPDATE credit_accounts
           SET total_balance = :initialPoints,
               locked_balance = 0,
               updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = :accountId`,
          { initialPoints, accountId },
        );
      }
    } else {
      const [createdAccount] = await connection.query<any>(
        `INSERT INTO credit_accounts (
          tenant_id, user_id, account_scope, total_balance, locked_balance, currency, status
        )
        VALUES (:tenantId, NULL, 'tenant', :initialPoints, 0, 'credits', 'active')`,
        { tenantId, initialPoints },
      );
      accountId = Number(createdAccount.insertId);
    }

    const [finalRows] = await connection.query<any[]>(
      `SELECT id, total_balance, available_balance
       FROM credit_accounts
       WHERE id = :accountId
       LIMIT 1`,
      { accountId },
    );

    await connection.commit();

    return {
      userId: memberUserIds[0],
      tenantId,
      memberUserIds,
      accountId,
      totalBalance: String(finalRows[0]?.total_balance ?? initialPoints),
      availableBalance: String(finalRows[0]?.available_balance ?? initialPoints),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const closeCreditsAccountLinkPool = async () => {
  if (!creditsPool) return;
  await creditsPool.end();
  creditsPool = null;
};
