import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import { getCurrentUserFromHeaders } from "../auth/authService";

export type AccountScope = "personal" | "tenant";

export interface BillingIdentity {
  userId: number;
  accountScope: AccountScope;
  tenantId?: number;
}

export interface BillingRequestContext {
  headers?: Record<string, string | string[] | undefined>;
}

type BillingIdentityBody = {
  userId?: unknown;
  creditsUserId?: unknown;
  tenantId?: unknown;
  creditsTenantId?: unknown;
  accountScope?: unknown;
};

const firstHeader = (
  headers: BillingRequestContext["headers"] | undefined,
  name: string,
) => {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

const parsePositiveInteger = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseAccountScope = (value: unknown): AccountScope | null => {
  return value === "personal" || value === "tenant" ? value : null;
};

export const resolveBillingIdentity = async (
  body: BillingIdentityBody,
  context?: BillingRequestContext,
  options: { requireEnabled?: boolean } = {},
): Promise<BillingIdentity | null> => {
  if ((options.requireEnabled ?? true) && !env.credits.enabled) return null;

  const current = await getCurrentUserFromHeaders(context?.headers);
  if (current?.user.creditsUserId) {
    if (current.user.accountScope === "tenant" && !current.user.creditsTenantId) {
      throw errors.invalidParameter("credits tenant id is required for tenant billing", {
        userId: current.user.id,
      });
    }

    return {
      userId: current.user.creditsUserId,
      accountScope: current.user.accountScope,
      tenantId: current.user.accountScope === "tenant" ? current.user.creditsTenantId ?? undefined : undefined,
    };
  }

  const userId =
    parsePositiveInteger(firstHeader(context?.headers, "x-credits-user-id")) ??
    parsePositiveInteger(firstHeader(context?.headers, "x-user-id")) ??
    parsePositiveInteger(body.creditsUserId) ??
    parsePositiveInteger(body.userId) ??
    env.credits.defaultUserId;

  if (!userId) {
    throw errors.invalidParameter("credits user id is required when credits billing is enabled", {
      headers: ["x-credits-user-id", "x-user-id"],
      body: ["creditsUserId", "userId"],
      env: "CREDITS_DEFAULT_USER_ID",
    });
  }

  const accountScope: AccountScope =
    parseAccountScope(firstHeader(context?.headers, "x-credits-account-scope")) ??
    parseAccountScope(body.accountScope) ??
    (env.credits.defaultAccountScope as AccountScope);

  const tenantId =
    parsePositiveInteger(firstHeader(context?.headers, "x-credits-tenant-id")) ??
    parsePositiveInteger(body.creditsTenantId) ??
    parsePositiveInteger(body.tenantId) ??
    env.credits.defaultTenantId;

  if (accountScope === "tenant" && !tenantId) {
    throw errors.invalidParameter("credits tenant id is required for tenant billing", {
      headers: "x-credits-tenant-id",
      body: ["creditsTenantId", "tenantId"],
      env: "CREDITS_DEFAULT_TENANT_ID",
    });
  }

  return {
    userId,
    accountScope,
    tenantId: accountScope === "tenant" ? tenantId ?? undefined : undefined,
  };
};
