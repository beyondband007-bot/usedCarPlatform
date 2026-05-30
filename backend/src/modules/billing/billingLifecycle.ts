import { creditsClient, type BillingTaskResponse } from "./creditsClient";
import { resolveBillingIdentity, type BillingRequestContext } from "./billingIdentity";
import { tasksRepository } from "../tasks/tasksRepository";

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
