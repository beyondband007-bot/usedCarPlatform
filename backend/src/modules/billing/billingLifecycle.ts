import { creditsClient, type BillingTaskResponse } from "./creditsClient";
import { resolveBillingIdentity, type BillingRequestContext } from "./billingIdentity";
import { tasksRepository, type GenerationTaskRecord } from "../tasks/tasksRepository";

type BillingBody = {
  userId?: unknown;
  creditsUserId?: unknown;
  tenantId?: unknown;
  creditsTenantId?: unknown;
  accountScope?: unknown;
};

export type FrozenGenerationBilling = {
  identity: {
    userId: number;
    tenantId?: number;
    accountScope: "personal" | "tenant";
  };
  task: BillingTaskResponse;
};

type BillingOperationScope = {
  bizType?: string;
  bizId?: string;
  idempotencyType?: string;
  idempotencyId?: string;
};

const resolveBillingScope = (taskId: string, scope?: BillingOperationScope) => ({
  bizType: scope?.bizType ?? "generation_task",
  bizId: scope?.bizId ?? taskId,
  idempotencyType: scope?.idempotencyType ?? "generation_task",
  idempotencyId: scope?.idempotencyId ?? taskId,
});

const billingIdempotencyKey = (
  operation: "estimate" | "freeze" | "settle" | "refund",
  scope: ReturnType<typeof resolveBillingScope>,
) => `${operation}:${scope.idempotencyType}:${scope.idempotencyId}`;

const snapshotTaskBilling = async (
  taskId: string,
  input: FrozenGenerationBilling,
  status: string,
) => {
  await tasksRepository.updateBilling({
    id: taskId,
    creditsUserId: input.identity.userId,
    creditsTenantId: input.identity.tenantId ?? null,
    accountScope: input.identity.accountScope,
    billingTaskId: input.task.billingTaskId,
    billingStatus: status,
    estimatedPoints: input.task.estimatedPoints,
    settledPoints: input.task.settledPoints,
  });
};

export const freezeGenerationBilling = async (input: {
  taskId: string;
  functionCode: string;
  estimatedPoints?: string;
  body: BillingBody;
  context?: BillingRequestContext;
  scope?: BillingOperationScope;
}): Promise<FrozenGenerationBilling | null> => {
  const identity = await resolveBillingIdentity(input.body, input.context);
  if (!identity) return null;
  const scope = resolveBillingScope(input.taskId, input.scope);
  const estimateKey = billingIdempotencyKey("estimate", scope);
  const freezeKey = billingIdempotencyKey("freeze", scope);

  let estimate;
  try {
    estimate = await creditsClient.estimate({
      ...identity,
      functionCode: input.functionCode,
      estimatedPoints: input.estimatedPoints,
      bizType: scope.bizType,
      bizId: scope.bizId,
      idempotencyKey: estimateKey,
    });
  } catch (error) {
    throw error;
  }

  const estimatedBilling = {
    identity,
    task: estimate,
  };
  await snapshotTaskBilling(input.taskId, estimatedBilling, estimate.status);

  let frozen;
  try {
    frozen = await creditsClient.freeze({
      userId: identity.userId,
      billingTaskId: estimate.billingTaskId,
      idempotencyKey: freezeKey,
    });
  } catch (error) {
    throw error;
  }

  const frozenBilling = {
    identity,
    task: frozen,
  };
  await snapshotTaskBilling(input.taskId, frozenBilling, frozen.status);

  return frozenBilling;
};

export const refundFrozenGenerationBilling = async (
  taskId: string,
  billing: FrozenGenerationBilling | null,
  scopeInput?: BillingOperationScope,
) => {
  if (!billing) return null;
  const scope = resolveBillingScope(taskId, scopeInput);

  const refunded = await creditsClient.refund({
    userId: billing.identity.userId,
    billingTaskId: billing.task.billingTaskId,
    idempotencyKey: billingIdempotencyKey("refund", scope),
  });

  const refundedBilling = {
    identity: billing.identity,
    task: refunded,
  };
  await snapshotTaskBilling(taskId, refundedBilling, refunded.status);

  return refundedBilling;
};

export const markGenerationBillingRefundFailed = async (
  taskId: string,
  billing: FrozenGenerationBilling | null,
) => {
  if (!billing) return;
  await snapshotTaskBilling(taskId, billing, "refund_failed");
};

const finalBillingStatuses = new Set(["settled", "refunded"]);

export const shouldFinalizeGenerationBilling = (task: GenerationTaskRecord) => {
  if (!task.billingTaskId || !task.creditsUserId || !task.accountScope || !task.billingStatus) {
    return false;
  }
  if (finalBillingStatuses.has(task.billingStatus)) return false;
  if (task.status === "success") return ["frozen", "settle_failed"].includes(task.billingStatus);
  if (task.status === "fail" || task.status === "canceled") {
    return ["frozen", "refund_failed"].includes(task.billingStatus);
  }
  return false;
};

export const finalizeGenerationBilling = async (
  task: GenerationTaskRecord,
  scopeInput?: BillingOperationScope,
) => {
  if (!shouldFinalizeGenerationBilling(task)) return null;
  const scope = resolveBillingScope(task.id, scopeInput);

  const billing = {
    identity: {
      userId: task.creditsUserId as number,
      tenantId: task.creditsTenantId ?? undefined,
      accountScope: task.accountScope as "personal" | "tenant",
    },
    task: {
      billingTaskId: task.billingTaskId as number,
      tenantId: task.creditsTenantId ?? null,
      userId: task.creditsUserId as number,
      accountId: 0,
      applicationId: 0,
      functionId: 0,
      bizType: "generation_task",
      bizId: task.id,
      estimatedPoints: task.estimatedPoints ?? "0.0000",
      frozenPoints: task.estimatedPoints ?? "0.0000",
      settledPoints: task.settledPoints ?? "0.0000",
      status: "frozen" as const,
      idempotentReplay: false,
    },
  };

  try {
    if (task.status === "success") {
      const settled = await creditsClient.settle({
        userId: billing.identity.userId,
        billingTaskId: billing.task.billingTaskId,
        idempotencyKey: billingIdempotencyKey("settle", scope),
      });
      const settledBilling = { ...billing, task: settled };
      await snapshotTaskBilling(task.id, settledBilling, settled.status);
      return settledBilling;
    }

    const refunded = await creditsClient.refund({
      userId: billing.identity.userId,
      billingTaskId: billing.task.billingTaskId,
      idempotencyKey: billingIdempotencyKey("refund", scope),
    });
    const refundedBilling = { ...billing, task: refunded };
    await snapshotTaskBilling(task.id, refundedBilling, refunded.status);
    return refundedBilling;
  } catch (error) {
    await tasksRepository.updateBilling({
      id: task.id,
      creditsUserId: billing.identity.userId,
      creditsTenantId: billing.identity.tenantId ?? null,
      accountScope: billing.identity.accountScope,
      billingTaskId: billing.task.billingTaskId,
      billingStatus: task.status === "success" ? "settle_failed" : "refund_failed",
      estimatedPoints: task.estimatedPoints ?? null,
      settledPoints: task.settledPoints ?? null,
    });
    return null;
  }
};

export const toBillingResponseFields = (billing: FrozenGenerationBilling | null) => {
  if (!billing) {
    return {
      billingTaskId: null,
      billingStatus: null,
      estimatedCost: null,
      estimatedPoints: null,
    };
  }

  return {
    billingTaskId: billing.task.billingTaskId,
    billingStatus: billing.task.status,
    estimatedCost: Number(billing.task.estimatedPoints),
    estimatedPoints: billing.task.estimatedPoints,
  };
};
