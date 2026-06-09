import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

import { env } from "../../config/env";
import type { CreditAccountResponse } from "./creditsClient";

interface CreditsAccountRow extends RowDataPacket {
  id: number;
  tenant_id: number | null;
  user_id: number | null;
  account_scope: "personal" | "tenant";
  total_balance: string;
  locked_balance: string;
  available_balance: string;
  currency: string;
  status: string;
}

let creditsPool: Pool | null = null;

export function getCreditsPool() {
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
}

export function pickCreditsAccount(
  accounts: CreditAccountResponse[],
  identity: { accountScope: "personal" | "tenant"; tenantId?: number | null },
) {
  return (
    accounts.find(
      (account) =>
        account.accountScope === identity.accountScope &&
        (identity.accountScope !== "tenant" ||
          identity.tenantId == null ||
          account.tenantId === identity.tenantId),
    ) ??
    accounts.find((account) => account.status === "active") ??
    null
  );
}

export async function loadFallbackCreditsAccount(identity: {
  userId: number;
  accountScope: "personal" | "tenant";
  tenantId?: number | null;
}) {
  const creditsPool = getCreditsPool();
  const [rows] = await creditsPool.query<CreditsAccountRow[]>(
    `SELECT
      id,
      tenant_id,
      user_id,
      account_scope,
      total_balance,
      locked_balance,
      available_balance,
      currency,
      status
    FROM credit_accounts
    WHERE user_id = :userId
      AND account_scope = :accountScope
      AND (
        :accountScope <> 'tenant'
        OR :tenantId IS NULL
        OR tenant_id = :tenantId
      )
    ORDER BY
      FIELD(status, 'active') DESC,
      id ASC
    LIMIT 1`,
    {
      userId: identity.userId,
      accountScope: identity.accountScope,
      tenantId: identity.tenantId ?? null,
    },
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    accountScope: row.account_scope,
    totalBalance: row.total_balance,
    lockedBalance: row.locked_balance,
    availableBalance: row.available_balance,
    currency: row.currency,
    status: row.status,
  } satisfies CreditAccountResponse;
}
