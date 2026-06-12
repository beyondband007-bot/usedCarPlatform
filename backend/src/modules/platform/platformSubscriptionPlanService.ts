import type { Request } from "express";
import type { RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { getRequiredCurrentUser } from "../auth/authMiddleware";

export type PlatformSubscriptionPlan = {
  code: string;
  applicationCode: string;
  name: string;
  price: number;
  accountLimit: number;
  concurrentTaskLimit: number;
  visualConcurrentTaskLimit: number;
  batchConcurrentTaskLimit: number;
  giftPoints: number;
  status: string;
  metadata: Record<string, unknown>;
};

type SubscriptionPlanRow = RowDataPacket & {
  code: string;
  application_code: string;
  name: string;
  price: string | number;
  account_limit: number | string;
  concurrent_task_limit: number | string;
  visual_concurrent_task_limit: number | string;
  batch_concurrent_task_limit: number | string;
  gift_points: number | string;
  status: string;
  metadata_json: string | Record<string, unknown> | null;
};

const DEFAULT_APPLICATION_CODE = "used-car-platform";

function normalizeApplicationCode(value: unknown) {
  const applicationCode = typeof value === "string" ? value.trim() : "";
  const normalized = applicationCode || DEFAULT_APPLICATION_CODE;
  if (!/^[a-z0-9][a-z0-9_-]{1,78}[a-z0-9]$/.test(normalized)) {
    throw errors.invalidParameter("applicationCode must be 3-80 lowercase letters, numbers, hyphens, or underscores");
  }
  return normalized;
}

function parseMetadata(value: SubscriptionPlanRow["metadata_json"]) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapSubscriptionPlan(row: SubscriptionPlanRow): PlatformSubscriptionPlan {
  return {
    code: row.code,
    applicationCode: row.application_code,
    name: row.name,
    price: toNumber(row.price),
    accountLimit: toNumber(row.account_limit),
    concurrentTaskLimit: toNumber(row.concurrent_task_limit),
    visualConcurrentTaskLimit: toNumber(row.visual_concurrent_task_limit),
    batchConcurrentTaskLimit: toNumber(row.batch_concurrent_task_limit),
    giftPoints: toNumber(row.gift_points),
    status: row.status,
    metadata: parseMetadata(row.metadata_json),
  };
}

export async function listPlatformSubscriptionPlans(req: Request) {
  const current = getRequiredCurrentUser(req);
  if (current.user.role !== "developer" && current.user.role !== "admin" && current.user.role !== "agent") {
    throw errors.forbidden("subscription plans require back-office role");
  }

  const applicationCode = normalizeApplicationCode(req.query.applicationCode);
  const [rows] = await pool.query<SubscriptionPlanRow[]>(
    `SELECT
       code,
       application_code,
       name,
       price,
       account_limit,
       concurrent_task_limit,
       visual_concurrent_task_limit,
       batch_concurrent_task_limit,
       gift_points,
       status,
       metadata_json
     FROM subscription_plans
     WHERE application_code = :applicationCode
       AND status = 'active'
     ORDER BY price ASC, code ASC`,
    { applicationCode },
  );

  return {
    applicationCode,
    items: rows.map(mapSubscriptionPlan),
  };
}
