import { pool } from "./mysql";
import type { RowDataPacket } from "mysql2";
import {
  closeCreditsAccountLinkPool,
  ensurePersonalCreditsAccount,
} from "../modules/billing/creditsAccountLinkService";

type AppUserCreditSeedRow = RowDataPacket & {
  id: string;
  username: string;
  credits_user_id: number | null;
  gift_points: number;
};

const run = async () => {
  const [rows] = await pool.query<AppUserCreditSeedRow[]>(
    `SELECT u.id, u.username, u.credits_user_id, p.gift_points
     FROM app_users u
     JOIN user_subscriptions us ON us.user_id = u.id
     JOIN subscription_plans p
       ON p.code = us.plan_code
      AND p.application_code = us.application_code
     WHERE u.status = 'active'
       AND us.status = 'active'
       AND u.account_scope <> 'tenant'
     ORDER BY u.created_at, u.username`,
  );

  const synced = [];
  for (const user of rows) {
    const credits = await ensurePersonalCreditsAccount({
      username: user.username,
      email: `${user.username}@used-car.local`,
      initialPoints: user.gift_points,
    });

    await pool.query(
      `UPDATE app_users
       SET credits_user_id = :creditsUserId,
           credits_tenant_id = NULL,
           account_scope = 'personal'
       WHERE id = :userId`,
      {
        creditsUserId: credits.userId,
        userId: user.id,
      },
    );

    synced.push({
      username: user.username,
      appUserId: user.id,
      creditsUserId: credits.userId,
      accountId: credits.accountId,
      balance: credits.availableBalance,
    });
  }

  console.table(synced);
  console.log(`Synced ${synced.length} app users with credits users/accounts.`);
};

run()
  .catch((error) => {
    console.error("Credits account sync failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeCreditsAccountLinkPool();
    await pool.end();
  });
