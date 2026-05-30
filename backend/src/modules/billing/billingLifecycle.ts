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
  body: BillingBody;
  context?: BillingRequestContext;
}): Promise<FrozenGenerationBilling | null> => {
  const identity = resolveBillingIdentity(input.body, input.context);
  if (!identity) return null;

  const estimate = await creditsClient.estimate({
    ...identity,
    functionCode: input.functionCode,
    bizType: "generation_task",
    bizId: input.taskId,
    idempotencyKey: `estimate:generation_task:${input.taskId}`,
  });

  const estimatedBilling = {
    identity,
    task: estimate,
  };
  await snapshotTaskBilling(input.taskId, estimatedBilling, estimate.status);

  const frozen = await creditsClient.freeze({
    userId: identity.userId,
    billingTaskId: estimate.billingTaskId,
    idempotencyKey: `freeze:generation_task:${input.taskId}`,
  });

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
) => {
  if (!billing) return null;

  const refunded = await creditsClient.refund({
    userId: billing.identity.userId,
    billingTaskId: billing.task.billingTaskId,
    idempotencyKey: `refund:generation_task:${taskId}`,
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

export const finalizeGenerationBilling = async (task: GenerationTaskRecord) => {
  if (!shouldFinalizeGenerationBilling(task)) return null;

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
        idempotencyKey: `settle:generation_task:${task.id}`,
      });
      const settledBilling = { ...billing, task: settled };
      await snapshotTaskBilling(task.id, settledBilling, settled.status);
      return settledBilling;
    }

    const refunded = await creditsClient.refund({
      userId: billing.identity.userId,
      billingTaskId: billing.task.billingTaskId,
      idempotencyKey: `refund:generation_task:${task.id}`,
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
