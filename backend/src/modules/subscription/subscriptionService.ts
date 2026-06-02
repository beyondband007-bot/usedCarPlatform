import type { RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { getSubscriptionSnapshotForUser, requireCurrentUserFromHeaders } from "../auth/authService";
import type { BillingRequestContext } from "../billing/billingIdentity";

export type SubscriptionPlanCode = "basic" | "team" | "flagship";

export type SubscriptionIdentity = {
  userKey: string;
  planCode: SubscriptionPlanCode;
  concurrentTaskLimit: number;
  visualConcurrentTaskLimit: number;
  batchConcurrentTaskLimit: number;
};

type CountRow = RowDataPacket & { total: number };

const countRows = async (sql: string, params: Record<string, unknown>) => {
  const [rows] = await pool.query<CountRow[]>(sql, params as any);
  return Number(rows[0]?.total ?? 0);
};

export const resolveSubscriptionIdentity = async (
  context?: BillingRequestContext,
): Promise<SubscriptionIdentity> => {
  const current = await requireCurrentUserFromHeaders(context?.headers);
  const plan = await getSubscriptionSnapshotForUser(current.user.id);

  return {
    userKey: current.user.id,
    planCode: plan.currentPlan,
    concurrentTaskLimit: plan.concurrentTaskLimit,
    visualConcurrentTaskLimit: plan.visualConcurrentTaskLimit,
    batchConcurrentTaskLimit: plan.batchConcurrentTaskLimit,
  };
};

export const countRunningGenerationTasks = async (userKey: string, moduleCodes?: string[]) => {
  const params: Record<string, unknown> = { userKey };
  let moduleFilter = "AND module_code <> 'batch-new'";

  if (moduleCodes?.length) {
    const placeholders = moduleCodes.map((code, index) => {
      const key = `moduleCode${index}`;
      params[key] = code;
      return `:${key}`;
    });
    moduleFilter = `AND module_code IN (${placeholders.join(", ")})`;
  }

  return countRows(
    `SELECT COUNT(*) total
     FROM generation_tasks
     WHERE subscription_user_key = :userKey
       AND status NOT IN ('success', 'fail', 'canceled')
       ${moduleFilter}`,
    params,
  );
};

export const countRunningBatchTasks = async (userKey: string) =>
  countRows(
    `SELECT COUNT(*) total
     FROM batch_tasks
     WHERE subscription_user_key = :userKey
       AND status NOT IN ('success', 'fail', 'canceled')`,
    { userKey },
  );

export const assertCanStartGeneration = async (
  context: BillingRequestContext | undefined,
  options: { moduleCodes?: string[]; requestedSlots?: number } = {},
) => {
  const identity = await resolveSubscriptionIdentity(context);
  const requestedSlots = options.requestedSlots ?? 1;
  const running = await countRunningGenerationTasks(identity.userKey, options.moduleCodes);

  if (running + requestedSlots > identity.concurrentTaskLimit) {
    throw errors.invalidParameter("subscription concurrent task limit reached", {
      userKey: identity.userKey,
      planCode: identity.planCode,
      running,
      requestedSlots,
      limit: identity.concurrentTaskLimit,
    });
  }

  return identity;
};

export const assertCanStartBatchGeneration = async (context?: BillingRequestContext) => {
  const identity = await resolveSubscriptionIdentity(context);
  const running = await countRunningBatchTasks(identity.userKey);

  if (running >= identity.batchConcurrentTaskLimit) {
    throw errors.invalidParameter("subscription batch concurrent task limit reached", {
      userKey: identity.userKey,
      planCode: identity.planCode,
      running,
      limit: identity.batchConcurrentTaskLimit,
    });
  }

  return identity;
};
