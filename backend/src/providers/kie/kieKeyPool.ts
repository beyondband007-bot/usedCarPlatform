import { createHash } from "node:crypto";

import { env } from "../../config/env";
import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import type { KieAccountLease } from "./kieTypes";

const hashKey = (apiKey: string) => createHash("sha256").update(apiKey).digest("hex");

class KieKeyPool {
  private cursor = 0;
  private synced = false;

  async syncAccounts() {
    if (this.synced || env.kie.apiKeys.length === 0) return;

    for (const [index, apiKey] of env.kie.apiKeys.entries()) {
      const accountHash = hashKey(apiKey);
      await pool.execute(
        `INSERT INTO kie_accounts
          (account_hash, label, status, max_concurrency)
        VALUES
          (:accountHash, :label, 'active', :maxConcurrency)
        ON DUPLICATE KEY UPDATE
          max_concurrency = VALUES(max_concurrency),
          updated_at = CURRENT_TIMESTAMP(3)`,
        {
          accountHash,
          label: `kie-${index + 1}`,
          maxConcurrency: env.kie.maxConcurrentPerKey,
        },
      );
    }

    this.synced = true;
  }

  async acquire(): Promise<KieAccountLease> {
    await this.syncAccounts();

    if (env.kie.apiKeys.length === 0) {
      throw errors.kieKeyUnavailable();
    }

    for (let attempt = 0; attempt < env.kie.apiKeys.length; attempt += 1) {
      const index = this.cursor % env.kie.apiKeys.length;
      this.cursor += 1;

      const apiKey = env.kie.apiKeys[index];
      const accountHash = hashKey(apiKey);
      const [rows] = await pool.query<any[]>(
        `SELECT account_hash
         FROM kie_accounts
         WHERE account_hash = :accountHash
           AND status = 'active'
           AND current_concurrency < max_concurrency
           AND (cooldown_until IS NULL OR cooldown_until <= CURRENT_TIMESTAMP(3))
         LIMIT 1`,
        { accountHash },
      );

      if (rows.length === 0) continue;

      await pool.execute(
        `UPDATE kie_accounts
         SET current_concurrency = current_concurrency + 1,
             last_used_at = CURRENT_TIMESTAMP(3)
         WHERE account_hash = :accountHash`,
        { accountHash },
      );

      return { apiKey, accountHash };
    }

    throw errors.kieKeyUnavailable();
  }

  async release(accountHash: string) {
    await pool.execute(
      `UPDATE kie_accounts
       SET current_concurrency = GREATEST(current_concurrency - 1, 0)
       WHERE account_hash = :accountHash`,
      { accountHash },
    );
  }

  async markFailure(accountHash: string, cooldownSeconds = 60) {
    await pool.execute(
      `UPDATE kie_accounts
       SET failure_count = failure_count + 1,
           current_concurrency = GREATEST(current_concurrency - 1, 0),
           cooldown_until = DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL :cooldownSeconds SECOND)
       WHERE account_hash = :accountHash`,
      { accountHash, cooldownSeconds },
    );
  }
}

export const kieKeyPool = new KieKeyPool();
