import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { ok } from "../../shared/response";
import { getRequiredCurrentUser, requirePermission } from "../auth/authMiddleware";
import { BACK_OFFICE_PERMISSION } from "../auth/rbac";
import { getCreditsAdminOverview } from "./creditsAdminService";
import { loadFallbackCreditsAccount, pickCreditsAccount } from "./creditsAccountLookupService";
import { resolveBillingIdentity } from "./billingIdentity";
import { creditsClient, type CreditAccountResponse } from "./creditsClient";
import { resolveChildCreditsIdentity } from "../enterprise/enterpriseMembersService";

type ProxyIdentityBody = {
  userId?: unknown;
  creditsUserId?: unknown;
  tenantId?: unknown;
  creditsTenantId?: unknown;
  accountScope?: unknown;
};

const parsePositiveInteger = (value: unknown, name: string, required = false) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw errors.invalidParameter(`${name} is required`);
    return null;
  }
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw errors.invalidParameter(`${name} must be a positive integer`);
  }
  return parsed;
};

const parseRequiredPositiveInteger = (value: unknown, name: string) =>
  parsePositiveInteger(value, name, true) as number;

const parseLimit = (value: unknown) => {
  const limit = parsePositiveInteger(value, "limit");
  if (limit === null) return undefined;
  if (limit > 100) throw errors.invalidParameter("limit must be between 1 and 100");
  return limit;
};

const parsePayChannel = (value: unknown) => {
  if (value === "alipay" || value === "wechat" || value === "card") return value;
  throw errors.invalidParameter("payChannel must be alipay, wechat, or card");
};

const parseAccountScope = (value: unknown) =>
  value === "personal" || value === "tenant" ? value : null;

const resolveProxyIdentity = async (
  body: ProxyIdentityBody,
  headers: Record<string, string | string[] | undefined>,
) => {
  const identity = await resolveBillingIdentity(body, { headers }, { requireEnabled: false });
  if (!identity) {
    throw errors.invalidParameter("credits user id is required", {
      headers: ["x-credits-user-id", "x-user-id"],
      queryOrBody: ["creditsUserId", "userId"],
      env: "CREDITS_DEFAULT_USER_ID",
    });
  }
  return identity;
};

const resolveTransactionIdentity = async (
  query: Record<string, unknown>,
  headers: Record<string, string | string[] | undefined>,
) => {
  const targetCreditsUserId = parsePositiveInteger(query.targetCreditsUserId, "targetCreditsUserId");

  if (targetCreditsUserId) {
    return resolveChildCreditsIdentity(headers, targetCreditsUserId);
  }

  return resolveProxyIdentity(query, headers);
};

export const creditsRoutes = Router();

creditsRoutes.get(
  "/admin/overview",
  requirePermission(BACK_OFFICE_PERMISSION),
  asyncHandler(async (req, res) => {
    const current = getRequiredCurrentUser(req);
    if (!current.user.creditsUserId) {
      throw errors.invalidParameter("current user is not linked to a credits account", {
        userId: current.user.id,
      });
    }

    const identity = {
      userId: current.user.creditsUserId,
      accountScope: current.user.accountScope,
      tenantId: current.user.accountScope === "tenant" ? current.user.creditsTenantId ?? undefined : undefined,
    };
    ok(res, await getCreditsAdminOverview(identity));
  }),
);

creditsRoutes.get(
  "/accounts",
  asyncHandler(async (req, res) => {
    const identity = await resolveProxyIdentity(req.query as Record<string, unknown>, req.headers);
    const accountsResult = await creditsClient.listAccounts({ userId: identity.userId });
    const fallbackAccount = await loadFallbackCreditsAccount(identity);

    ok(res, {
      accounts:
        accountsResult.accounts.length || !fallbackAccount
          ? accountsResult.accounts
          : [fallbackAccount],
    });
  }),
);

creditsRoutes.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const query = req.query as Record<string, unknown>;
    const identity = await resolveTransactionIdentity(query, req.headers);
    const accountId = parsePositiveInteger(query.accountId, "accountId");
    const limit = parseLimit(query.limit);
    const requestedScope = parseAccountScope(query.accountScope) ?? identity.accountScope;
    const requestedTenantId =
      parsePositiveInteger(query.tenantId ?? query.creditsTenantId, "tenantId") ?? identity.tenantId;
    const accountsResult = await creditsClient.listAccounts({ userId: identity.userId });
    let account =
      accountId
        ? accountsResult.accounts.find((item) => item.id === accountId) ?? null
        : pickCreditsAccount(accountsResult.accounts, {
            accountScope: requestedScope,
            tenantId: requestedTenantId,
          });

    if (!account) {
      const fallbackAccount = await loadFallbackCreditsAccount({
        userId: identity.userId,
        accountScope: requestedScope,
        tenantId: requestedTenantId,
      });
      account = !accountId || fallbackAccount?.id === accountId ? fallbackAccount : null;
    }

    if (!account) {
      throw errors.invalidParameter("credit account not found for transaction query", {
        accountId,
        accountScope: requestedScope,
        tenantId: requestedTenantId ?? null,
      });
    }

    const transactions = await creditsClient.listAccountTransactions({
      accountId: account.id,
      userId: identity.userId,
      limit,
    });

    ok(res, {
      account,
      ...transactions,
    });
  }),
);

creditsRoutes.get(
  "/recharge-products",
  asyncHandler(async (_req, res) => {
    ok(res, await creditsClient.listRechargeProducts());
  }),
);

creditsRoutes.post(
  "/payment-orders",
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const identity = await resolveProxyIdentity(body, req.headers);
    const productId = parseRequiredPositiveInteger(body.productId, "productId");
    const payChannel = parsePayChannel(body.payChannel);
    const idempotencyKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : `payment_order:${createId("request")}`;

    ok(
      res,
      await creditsClient.createPaymentOrder({
        userId: identity.userId,
        accountScope: identity.accountScope,
        tenantId: identity.tenantId,
        productId,
        payChannel,
        idempotencyKey,
      }),
    );
  }),
);
