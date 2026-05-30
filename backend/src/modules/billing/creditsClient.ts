import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import type { BillingIdentity } from "./billingIdentity";

export type BillingTaskStatus =
  | "estimated"
  | "frozen"
  | "settled"
  | "refunded"
  | "failed"
  | "cancelled";

export interface BillingTaskResponse {
  billingTaskId: number;
  tenantId: number | null;
  userId: number;
  accountId: number;
  applicationId: number;
  functionId: number;
  bizType: string;
  bizId: string;
  estimatedPoints: string;
  frozenPoints: string;
  settledPoints: string;
  status: BillingTaskStatus;
  idempotentReplay: boolean;
}

type EstimateBillingInput = BillingIdentity & {
  functionCode: string;
  bizType: string;
  bizId: string;
  idempotencyKey: string;
};

type BillingTaskMutationInput = {
  userId: number;
  billingTaskId: number;
  idempotencyKey: string;
};

type CreditsErrorBody = {
  error?: string;
  message?: string;
};

class CreditsClient {
  async estimate(input: EstimateBillingInput) {
    return this.post<BillingTaskResponse>("/billing/estimate", {
      userId: input.userId,
      accountScope: input.accountScope,
      tenantId: input.tenantId,
      applicationCode: env.credits.applicationCode,
      functionCode: input.functionCode,
      bizType: input.bizType,
      bizId: input.bizId,
      idempotencyKey: input.idempotencyKey,
    });
  }

  async freeze(input: BillingTaskMutationInput) {
    return this.post<BillingTaskResponse>("/billing/freeze", input);
  }

  async settle(input: BillingTaskMutationInput) {
    return this.post<BillingTaskResponse>("/billing/settle", input);
  }

  async refund(input: BillingTaskMutationInput) {
    return this.post<BillingTaskResponse>("/billing/refund", input);
  }

  private async post<T>(path: string, body: Record<string, unknown>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.credits.requestTimeoutMs);

    try {
      const response = await fetch(`${env.credits.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const responseBody = await this.parseBody(response);
      if (!response.ok) {
        const message =
          responseBody.message || `credits platform request failed with status ${response.status}`;
        throw errors.billingRejected(response.status, message, responseBody);
      }

      return responseBody as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw errors.billingUnavailable("credits platform request timed out", {
          baseUrl: env.credits.baseUrl,
          path,
        });
      }
      if (error instanceof Error && "statusCode" in error) throw error;
      throw errors.billingUnavailable("credits platform request failed", {
        baseUrl: env.credits.baseUrl,
        path,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseBody(response: Response): Promise<CreditsErrorBody & Record<string, unknown>> {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as CreditsErrorBody & Record<string, unknown>;
    } catch {
      return { message: text };
    }
  }
}

export const creditsClient = new CreditsClient();
