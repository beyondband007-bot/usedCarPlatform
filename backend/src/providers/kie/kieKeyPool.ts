import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2";

import { env } from "../../config/env";
import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import type { KieAccountLease } from "./kieTypes";

const hashKey = (apiKey: string) => createHash("sha256").update(apiKey).digest("hex");
type KieAccountConcurrencyRow = RowDataPacket & {
  account_hash: string;
  current_concurrency: number;
  max_concurrency: number;
};

const accountEntries = () =>
  env.kie.apiKeys.map((apiKey, index) => ({
    apiKey,
    index,
    accountHash: hashKey(apiKey),
  }));

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

    const entries = accountEntries();
    if (entries.length === 0) {
      throw errors.kieKeyUnavailable();
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const hashes = new Set(entries.map((entry) => entry.accountHash));
      const [rows] = await connection.query<KieAccountConcurrencyRow[]>(
        `SELECT account_hash, current_concurrency, max_concurrency
         FROM kie_accounts
         WHERE status = 'active'
           AND current_concurrency < max_concurrency
           AND (cooldown_until IS NULL OR cooldown_until <= CURRENT_TIMESTAMP(3))
         FOR UPDATE`,
      );

      const rotationStart = this.cursor % entries.length;
      const rotationRank = new Map(
        entries.map((entry, position) => [
          entry.accountHash,
          (position - rotationStart + entries.length) % entries.length,
        ]),
      );

      const selected = rows
        .filter((row) => hashes.has(row.account_hash))
        .sort((left, right) => {
          const concurrencyDelta = left.current_concurrency - right.current_concurrency;
          if (concurrencyDelta !== 0) return concurrencyDelta;
          return (rotationRank.get(left.account_hash) ?? 0) - (rotationRank.get(right.account_hash) ?? 0);
        })[0];

      if (!selected) {
        await connection.rollback();
        throw errors.kieKeyUnavailable();
      }

      const selectedEntry = entries.find((entry) => entry.accountHash === selected.account_hash);
      if (!selectedEntry) {
        await connection.rollback();
        throw errors.kieKeyUnavailable();
      }

      await connection.execute(
        `UPDATE kie_accounts
         SET current_concurrency = current_concurrency + 1,
             last_used_at = CURRENT_TIMESTAMP(3)
         WHERE account_hash = :accountHash`,
        { accountHash: selected.account_hash },
      );

      await connection.commit();

      this.cursor = selectedEntry.index + 1;
      return {
        apiKey: selectedEntry.apiKey,
        accountHash: selectedEntry.accountHash,
      };
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // The transaction may already have been rolled back before rethrowing.
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async release(accountHash: string) {
    if (!accountHash) return;
    await pool.execute(
      `UPDATE kie_accounts
       SET current_concurrency = GREATEST(current_concurrency - 1, 0)
       WHERE account_hash = :accountHash`,
      { accountHash },
    );
  }

  async markFailure(accountHash: string, cooldownSeconds = 60) {
    if (!accountHash) return;
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
