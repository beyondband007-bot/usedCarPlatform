import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import type { BillingIdentity } from "./billingIdentity";
import type { CreditFunctionCatalogItem } from "./creditFunctionCatalog";

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

export interface CreditAccountResponse {
  id: number;
  tenantId: number | null;
  userId: number | null;
  accountScope: "personal" | "tenant";
  totalBalance: string;
  lockedBalance: string;
  availableBalance: string;
  currency: string;
  status: string;
}

export interface CreditTransactionResponse {
  id: number;
  tenantId: number | null;
  userId: number;
  accountId: number;
  billingTaskId: number | null;
  paymentOrderId: number | null;
  applicationId: number | null;
  functionId: number | null;
  txnType: string;
  points: string;
  balanceBefore: string;
  balanceAfter: string;
  bizType: string | null;
  bizId: string | null;
  refTxnId: number | null;
  remark: string | null;
  createdAt: string;
}

export type CreditTransactionWithApplicationResponse = CreditTransactionResponse & {
  applicationCode: string | null;
  applicationName: string | null;
  functionCode: string | null;
  functionName: string | null;
};

export interface RechargeProductResponse {
  id: number;
  name: string;
  amount: string;
  points: string;
  bonusPoints: string;
  currency: string;
  sort: number;
  enabled: boolean;
}

export interface PaymentOrderResponse {
  paymentOrderId: number;
  tenantId: number | null;
  userId: number;
  accountId: number;
  productId: number;
  orderNo: string;
  amount: string;
  points: string;
  bonusPoints: string;
  payChannel: "alipay" | "wechat" | "card";
  status: "pending" | "paid" | "failed" | "refunded";
  paidAt: string | null;
  notifyId: string | null;
  payUrl?: string | null;
  qrCodeUrl?: string | null;
  idempotentReplay: boolean;
}

export interface CreditsApplicationResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: string;
}

export interface CreditsFunctionResponse {
  id: number;
  applicationId: number;
  applicationCode?: string;
  applicationName?: string;
  code: string;
  name: string;
  description: string | null;
  chargeMode: "fixed" | "dynamic" | "estimate_required";
  defaultPoints: string;
  status: string;
}

type EstimateBillingInput = BillingIdentity & {
  functionCode: string;
  estimatedPoints?: string;
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
  async listAccounts(input: { userId: number }) {
    return this.get<{ accounts: CreditAccountResponse[] }>("/me/accounts", {
      userId: input.userId,
    });
  }

  async listAccountTransactions(input: { accountId: number; userId: number; limit?: number }) {
    return this.get<{ transactions: CreditTransactionResponse[] }>(
      `/accounts/${input.accountId}/transactions`,
      {
        userId: input.userId,
        limit: input.limit,
      },
    );
  }

  async listRechargeProducts() {
    return this.get<{ products: RechargeProductResponse[] }>("/recharge-products");
  }

  async listApplications() {
    return this.get<{ applications: CreditsApplicationResponse[] }>("/integration/applications");
  }

  async listFunctions(applicationCode: string) {
    return this.get<{ applicationCode: string; functions: CreditsFunctionResponse[] }>(
      `/integration/applications/${encodeURIComponent(applicationCode)}/functions`,
    );
  }

  async registerFunction(input: CreditFunctionCatalogItem & { applicationCode?: string }) {
    const applicationCode = input.applicationCode ?? env.credits.applicationCode;
    return this.post<CreditsFunctionResponse>(
      `/integration/applications/${encodeURIComponent(applicationCode)}/functions`,
      {
        code: input.code,
        name: input.name,
        description: input.description,
        chargeMode: input.chargeMode,
        defaultPoints: input.defaultPoints,
        status: input.status,
      },
    );
  }

  async updateFunctionDefaultPoints(input: {
    applicationCode: string;
    functionCode: string;
    defaultPoints: string;
  }) {
    const functions = await this.listFunctions(input.applicationCode);
    const fn = functions.functions.find((item) => item.code === input.functionCode);
    if (!fn) {
      throw errors.invalidParameter("credit function not found", {
        applicationCode: input.applicationCode,
        functionCode: input.functionCode,
      });
    }

    return this.post<CreditsFunctionResponse>(
      `/integration/applications/${encodeURIComponent(input.applicationCode)}/functions`,
      {
        code: fn.code,
        name: fn.name,
        description: fn.description,
        chargeMode: fn.chargeMode,
        defaultPoints: input.defaultPoints,
        status: fn.status,
      },
    );
  }

  async createPaymentOrder(input: {
    userId: number;
    accountScope: "personal" | "tenant";
    tenantId?: number;
    productId: number;
    payChannel: "alipay" | "wechat" | "card";
    idempotencyKey: string;
  }) {
    return this.post<PaymentOrderResponse>("/payment-orders", input);
  }

  async syncPaymentOrder(input: { paymentOrderId: number; userId: number }) {
    return this.get<PaymentOrderResponse>(
      `/payment-orders/${input.paymentOrderId}/sync`,
      { userId: input.userId },
    );
  }

  async estimate(input: EstimateBillingInput) {
    return this.post<BillingTaskResponse>("/billing/estimate", {
      userId: input.userId,
      accountScope: input.accountScope,
      tenantId: input.tenantId,
      applicationCode: env.credits.applicationCode,
      functionCode: input.functionCode,
      estimatedPoints: input.estimatedPoints,
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

  private async get<T>(path: string, query?: Record<string, unknown>) {
    const search = this.toSearchParams(query);
    return this.request<T>(`${path}${search}`, { method: "GET" });
  }

  private async post<T>(path: string, body: Record<string, unknown>) {
    return this.request<T>(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.credits.requestTimeoutMs);

    try {
      const response = await fetch(`${env.credits.baseUrl}${path}`, {
        ...init,
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

  private toSearchParams(query?: Record<string, unknown>) {
    if (!query) return "";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }
    const encoded = params.toString();
    return encoded ? `?${encoded}` : "";
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
