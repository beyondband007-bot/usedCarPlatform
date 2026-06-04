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
    const deadline = Date.now() + env.kie.acquireWaitTimeoutMs;
    let lastError: unknown = null;

    do {
      try {
        return await this.tryAcquire();
      } catch (error) {
        lastError = error;
        if (!(error instanceof Error && error.message.includes("no available kie api key"))) {
          throw error;
        }
        if (Date.now() >= deadline) break;
        await new Promise((resolve) => setTimeout(resolve, env.kie.acquireRetryIntervalMs));
      }
    } while (Date.now() < deadline);

    throw lastError ?? errors.kieKeyUnavailable();
  }

  private async tryAcquire(): Promise<KieAccountLease> {
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

  async reconcileConcurrency() {
    await this.syncAccounts();
    await pool.execute(
      `UPDATE kie_task_records ktr
       JOIN generation_tasks gt ON gt.id = ktr.task_id
       SET ktr.status = CASE
             WHEN gt.status = 'fail' THEN 'fail'
             ELSE 'canceled'
           END,
           ktr.response_json = JSON_OBJECT(
             'closedByBusinessTaskStatus', gt.status,
             'previousKieRecordStatus', ktr.status
           ),
           ktr.finished_at = CURRENT_TIMESTAMP(3)
       WHERE ktr.status NOT IN ('success', 'fail', 'canceled')
         AND gt.status IN ('success', 'fail', 'canceled')`,
    );
    await pool.execute(
      `UPDATE kie_accounts ka
       LEFT JOIN (
         SELECT ktr.kie_account_hash, COUNT(*) AS active_count
         FROM kie_task_records ktr
         JOIN generation_tasks gt ON gt.id = ktr.task_id
         WHERE ktr.status NOT IN ('success', 'fail', 'canceled')
           AND gt.status NOT IN ('success', 'fail', 'canceled')
         GROUP BY ktr.kie_account_hash
       ) active_records ON active_records.kie_account_hash = ka.account_hash
       SET ka.current_concurrency = COALESCE(active_records.active_count, 0)`,
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

  async markTransientFailure(accountHash: string) {
    if (!accountHash) return;
    await pool.execute(
      `UPDATE kie_accounts
       SET failure_count = failure_count + 1,
           current_concurrency = GREATEST(current_concurrency - 1, 0),
           cooldown_until = NULL
       WHERE account_hash = :accountHash`,
      { accountHash },
    );
  }
}

export const kieKeyPool = new KieKeyPool();
