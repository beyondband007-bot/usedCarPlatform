import type { RowDataPacket } from "mysql2/promise";

import { getCreditsPool } from "./creditsAccountLookupService";
import type { CreditAccountResponse } from "./creditsClient";

type QueryTxnType = "recharge" | "gift" | "consume" | "refund" | string;
type QueryStatus = "effective" | "pending" | string;
type QueryBizSource = "single" | "batch" | "package" | "purchase" | "fail" | string;

export type CreditsTransactionQueryInput = {
  account: CreditAccountResponse;
  page: number;
  pageSize: number;
  txnType?: QueryTxnType | null;
  status?: QueryStatus | null;
  bizSource?: QueryBizSource | null;
  from?: string | null;
  to?: string | null;
};

interface CreditsTransactionRow extends RowDataPacket {
  id: number;
  tenant_id: number | null;
  user_id: number;
  account_id: number;
  billing_task_id: number | null;
  payment_order_id: number | null;
  application_id: number | null;
  function_id: number | null;
  txn_type: string;
  points: string;
  balance_before: string;
  balance_after: string;
  biz_type: string | null;
  biz_id: string | null;
  ref_txn_id: number | null;
  remark: string | null;
  created_at: Date;
}

interface CreditsTransactionSummaryRow extends RowDataPacket {
  total: number;
  total_gained: string | number | null;
  total_consumed: string | number | null;
  recent_net: string | number | null;
}

type QueryCondition = {
  clause: string;
  params?: Record<string, unknown>;
};

const PENDING_TXN_TYPES = ["grant", "bonus", "commission_grant"];
const CONSUME_TXN_TYPES = ["settle", "freeze", "estimate"];

function toSqlNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDateBoundary(value: string | null | undefined, endOfDay = false) {
  if (!value) return null;
  const suffix = endOfDay ? "23:59:59" : "00:00:00";
  const candidate = `${value.trim()} ${suffix}`;
  const date = new Date(candidate.replace(/-/g, "/"));
  if (Number.isNaN(date.getTime())) return null;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function buildTxnTypeCondition(txnType: string): QueryCondition | null {
  switch (txnType) {
    case "recharge":
      return {
        clause: "ct.txn_type = :txnTypeRecharge",
        params: { txnTypeRecharge: "recharge" },
      };
    case "refund":
      return {
        clause: "ct.txn_type = :txnTypeRefund",
        params: { txnTypeRefund: "refund" },
      };
    case "gift":
      return {
        clause:
          "(ct.txn_type IN (:pendingTxnTypes) OR (ct.txn_type IN ('adjust', 'adjustment') AND ct.points >= 0))",
        params: { pendingTxnTypes: PENDING_TXN_TYPES },
      };
    case "consume":
      return {
        clause:
          "(ct.txn_type IN (:consumeTxnTypes) OR (ct.txn_type IN ('adjust', 'adjustment') AND ct.points < 0))",
        params: { consumeTxnTypes: CONSUME_TXN_TYPES },
      };
    default:
      return {
        clause: "ct.txn_type = :txnTypeExact",
        params: { txnTypeExact: txnType },
      };
  }
}

function buildStatusCondition(status: string): QueryCondition | null {
  if (status === "pending") {
    return {
      clause:
        "(ct.txn_type IN (:pendingStatusTxnTypes) OR (ct.txn_type IN ('adjust', 'adjustment') AND ct.points >= 0))",
      params: { pendingStatusTxnTypes: PENDING_TXN_TYPES },
    };
  }

  if (status === "effective") {
    return {
      clause:
        "(ct.txn_type NOT IN (:effectiveExcludedTxnTypes) AND NOT (ct.txn_type IN ('adjust', 'adjustment') AND ct.points >= 0))",
      params: { effectiveExcludedTxnTypes: PENDING_TXN_TYPES },
    };
  }

  return null;
}

function buildBizSourceCondition(bizSource: string): QueryCondition | null {
  switch (bizSource) {
    case "purchase":
      return {
        clause: "ct.txn_type = :bizSourceRecharge",
        params: { bizSourceRecharge: "recharge" },
      };
    case "package":
      return {
        clause:
          "(ct.txn_type IN (:bizSourceGiftTxnTypes) OR (ct.txn_type IN ('adjust', 'adjustment') AND ct.points >= 0))",
        params: { bizSourceGiftTxnTypes: PENDING_TXN_TYPES },
      };
    case "fail":
      return {
        clause: "ct.txn_type = :bizSourceRefund",
        params: { bizSourceRefund: "refund" },
      };
    case "batch":
      return {
        clause: "LOWER(COALESCE(ct.biz_type, '')) LIKE :bizSourceBatch",
        params: { bizSourceBatch: "%batch%" },
      };
    case "single":
      return {
        clause:
          "ct.txn_type NOT IN ('recharge', 'refund') AND LOWER(COALESCE(ct.biz_type, '')) NOT LIKE :bizSourceSingleBatch",
        params: { bizSourceSingleBatch: "%batch%" },
      };
    default:
      return null;
  }
}

function buildWhereClause(input: CreditsTransactionQueryInput) {
  const clauses = ["ct.account_id = :accountId"];
  const params: Record<string, unknown> = {
    accountId: input.account.id,
  };

  const txnTypeCondition =
    typeof input.txnType === "string" && input.txnType.trim()
      ? buildTxnTypeCondition(input.txnType.trim())
      : null;
  if (txnTypeCondition) {
    clauses.push(txnTypeCondition.clause);
    Object.assign(params, txnTypeCondition.params);
  }

  const statusCondition =
    typeof input.status === "string" && input.status.trim()
      ? buildStatusCondition(input.status.trim())
      : null;
  if (statusCondition) {
    clauses.push(statusCondition.clause);
    Object.assign(params, statusCondition.params);
  }

  const bizSourceCondition =
    typeof input.bizSource === "string" && input.bizSource.trim()
      ? buildBizSourceCondition(input.bizSource.trim())
      : null;
  if (bizSourceCondition) {
    clauses.push(bizSourceCondition.clause);
    Object.assign(params, bizSourceCondition.params);
  }

  const from = normalizeDateBoundary(input.from);
  if (from) {
    clauses.push("ct.created_at >= :from");
    params.from = from;
  }

  const to = normalizeDateBoundary(input.to, true);
  if (to) {
    clauses.push("ct.created_at <= :to");
    params.to = to;
  }

  return {
    whereSql: clauses.join("\n       AND "),
    params,
  };
}

export async function queryCreditsTransactions(input: CreditsTransactionQueryInput) {
  const creditsPool = getCreditsPool();
  const { whereSql, params } = buildWhereClause(input);
  const offset = (input.page - 1) * input.pageSize;

  const [[rows], [summaryRows]] = await Promise.all([
    creditsPool.query<CreditsTransactionRow[]>(
      `SELECT
         ct.id,
         ct.tenant_id,
         ct.user_id,
         ct.account_id,
         ct.billing_task_id,
         ct.payment_order_id,
         ct.application_id,
         ct.function_id,
         ct.txn_type,
         ct.points,
         ct.balance_before,
         ct.balance_after,
         ct.biz_type,
         ct.biz_id,
         ct.ref_txn_id,
         ct.remark,
         ct.created_at
       FROM credit_transactions ct
       WHERE ${whereSql}
       ORDER BY ct.created_at DESC, ct.id DESC
       LIMIT :limit OFFSET :offset`,
      {
        ...params,
        limit: input.pageSize,
        offset,
      } as any,
    ),
    creditsPool.query<CreditsTransactionSummaryRow[]>(
      `SELECT
         COUNT(*) total,
         COALESCE(SUM(CASE WHEN ct.points > 0 THEN ct.points ELSE 0 END), 0) total_gained,
         COALESCE(SUM(CASE WHEN ct.points < 0 THEN ABS(ct.points) ELSE 0 END), 0) total_consumed,
         COALESCE(
           SUM(
             CASE
               WHEN ct.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY) THEN ct.points
               ELSE 0
             END
           ),
           0
         ) recent_net
       FROM credit_transactions ct
       WHERE ${whereSql}`,
      params as any,
    ),
  ]);

  const summary = summaryRows[0] ?? {
    total: 0,
    total_gained: 0,
    total_consumed: 0,
    recent_net: 0,
  };

  return {
    items: rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      accountId: row.account_id,
      billingTaskId: row.billing_task_id,
      paymentOrderId: row.payment_order_id,
      applicationId: row.application_id,
      functionId: row.function_id,
      txnType: row.txn_type,
      points: toSqlNumber(row.points),
      balanceBefore: toSqlNumber(row.balance_before),
      balanceAfter: toSqlNumber(row.balance_after),
      bizType: row.biz_type,
      bizId: row.biz_id,
      refTxnId: row.ref_txn_id,
      remark: row.remark,
      createdAt: row.created_at.toISOString(),
    })),
    total: Number(summary.total ?? 0),
    page: input.page,
    pageSize: input.pageSize,
    summary: {
      totalGained: toSqlNumber(summary.total_gained),
      totalConsumed: toSqlNumber(summary.total_consumed),
      recentNet: toSqlNumber(summary.recent_net),
    },
  };
}
