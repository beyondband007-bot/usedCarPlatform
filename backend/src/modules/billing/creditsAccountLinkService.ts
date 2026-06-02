import mysql, { type Pool } from "mysql2/promise";

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

export const ensurePersonalCreditsAccount = async (input: {
  email: string;
  initialPoints: number | string;
  preferredUserId?: number | null;
}): Promise<LinkedCreditsAccount> => {
  const pool = getCreditsPool();
  const connection = await pool.getConnection();
  const initialPoints = toPoints(input.initialPoints);

  try {
    await connection.beginTransaction();

    let userId = input.preferredUserId ?? null;

    const [existingUsers] = await connection.query<any[]>(
      `SELECT id
       FROM users
       WHERE email = :email
          OR (:preferredUserId IS NOT NULL AND id = :preferredUserId)
       ORDER BY id
       LIMIT 1`,
      {
        email: input.email,
        preferredUserId: userId,
      },
    );

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
    } else if (userId) {
      await connection.query(
        `INSERT INTO users (id, email, status)
         VALUES (:userId, :email, 'active')`,
        { userId, email: input.email },
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
      userId: userId as number,
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
