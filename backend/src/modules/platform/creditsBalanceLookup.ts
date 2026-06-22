import type { RowDataPacket } from "mysql2";
import mysql, { type Pool } from "mysql2/promise";

import { env } from "../../config/env";

type CreditsBalanceInput = {
  creditsUserId?: number | null;
  accountScope?: string | null;
  creditsTenantId?: number | null;
};

type CreditsBalanceRow = RowDataPacket & {
  user_id: number | null;
  tenant_id: number | null;
  total_balance: string | number;
  available_balance: string | number;
  currency: string;
};

export type CreditsBalanceSnapshot = {
  totalBalance: number;
  availableBalance: number;
  currency: string;
};

let creditsPool: Pool | null = null;

function getCreditsPool() {
  if (!creditsPool) {
    creditsPool = mysql.createPool({
      host: env.credits.mysql.host,
      port: env.credits.mysql.port,
      database: env.credits.mysql.database,
      user: env.credits.mysql.user,
      password: env.credits.mysql.password,
      timezone: "Z",
      waitForConnections: true,
      connectionLimit: env.credits.mysql.connectionLimit,
      namedPlaceholders: true,
    });
  }
  return creditsPool;
}

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function creditsBalanceKey(input: CreditsBalanceInput) {
  if (input.accountScope === "tenant" && input.creditsTenantId) {
    return `tenant:${input.creditsTenantId}`;
  }
  if (input.creditsUserId) return `user:${input.creditsUserId}`;
  return null;
}

export async function listCreditsBalances(inputs: CreditsBalanceInput[]) {
  const result = new Map<string, CreditsBalanceSnapshot>();
  const userIds = Array.from(
    new Set(
      inputs
        .filter((item) => item.accountScope !== "tenant" && item.creditsUserId)
        .map((item) => item.creditsUserId as number),
    ),
  );
  const tenantIds = Array.from(
    new Set(
      inputs
        .filter((item) => item.accountScope === "tenant" && item.creditsTenantId)
        .map((item) => item.creditsTenantId as number),
    ),
  );
  const creditsDb = getCreditsPool();

  if (userIds.length) {
    const [rows] = await creditsDb.query<CreditsBalanceRow[]>(
      `SELECT user_id, tenant_id, total_balance, available_balance, currency
       FROM credit_accounts
       WHERE account_scope = 'personal'
         AND tenant_id IS NULL
         AND status = 'active'
         AND user_id IN (:userIds)`,
      { userIds },
    );
    for (const row of rows) {
      if (!row.user_id) continue;
      result.set(`user:${row.user_id}`, {
        totalBalance: toNumber(row.total_balance),
        availableBalance: toNumber(row.available_balance),
        currency: row.currency,
      });
    }
  }

  if (tenantIds.length) {
    const [rows] = await creditsDb.query<CreditsBalanceRow[]>(
      `SELECT user_id, tenant_id, total_balance, available_balance, currency
       FROM credit_accounts
       WHERE account_scope = 'tenant'
         AND user_id IS NULL
         AND status = 'active'
         AND tenant_id IN (:tenantIds)`,
      { tenantIds },
    );
    for (const row of rows) {
      if (!row.tenant_id) continue;
      result.set(`tenant:${row.tenant_id}`, {
        totalBalance: toNumber(row.total_balance),
        availableBalance: toNumber(row.available_balance),
        currency: row.currency,
      });
    }
  }

  return result;
}
