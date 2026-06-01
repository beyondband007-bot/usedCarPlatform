# Phase 7: UsedCar Credit Proxy APIs

Status: implemented
Date: 2026-05-31

## Purpose

Expose a usedCarPlatform backend API boundary for credits data so the frontend can keep talking to usedCarPlatform instead of calling Reusable Credits Platform directly.

## Added Routes

All routes are mounted under:

```text
/api/v1/credits
```

### List Accounts

```http
GET /api/v1/credits/accounts
```

Identity can come from request headers, query parameters, or local development environment fallback.

Supported query parameters:

- `userId` or `creditsUserId`
- `accountScope`
- `tenantId` or `creditsTenantId`

Proxies to:

```text
GET /me/accounts
```

### List Transactions

```http
GET /api/v1/credits/transactions
```

Supported query parameters:

- `accountId`
- `limit`
- `userId` or `creditsUserId`
- `accountScope`
- `tenantId` or `creditsTenantId`

If `accountId` is omitted, usedCarPlatform resolves the account from the current billing identity and available accounts.

Proxies to:

```text
GET /accounts/:id/transactions
```

### List Recharge Products

```http
GET /api/v1/credits/recharge-products
```

Proxies to:

```text
GET /recharge-products
```

### Create Payment Order

```http
POST /api/v1/credits/payment-orders
```

Request body:

```json
{
  "productId": 1,
  "payChannel": "wechat",
  "idempotencyKey": "optional-client-key",
  "creditsUserId": 4,
  "accountScope": "personal"
}
```

If `idempotencyKey` is omitted, usedCarPlatform generates one for the request. Frontend flows that want retry/replay protection should provide a stable client key.

Proxies to:

```text
POST /payment-orders
```

## Identity

The proxy uses the same temporary identity convention as task billing:

1. Request headers:
   - `x-credits-user-id`
   - `x-user-id`
   - `x-credits-account-scope`
   - `x-credits-tenant-id`
2. Query/body parameters:
   - `creditsUserId` or `userId`
   - `accountScope`
   - `creditsTenantId` or `tenantId`
3. Local development environment fallback:
   - `CREDITS_DEFAULT_USER_ID`
   - `CREDITS_DEFAULT_ACCOUNT_SCOPE`
   - `CREDITS_DEFAULT_TENANT_ID`

The environment fallback is still only for local development.

## Frontend Boundary

Frontend API wrappers were added in:

```text
src/api/visual-workbench.ts
```

Added helpers:

- `getCreditAccounts`
- `getCreditTransactions`
- `getRechargeProducts`
- `createPaymentOrder`

## Verification Performed

- Backend typecheck
- Frontend typecheck
- Local smoke test against Reusable Credits Platform:
  - `GET /api/v1/credits/accounts`
  - `GET /api/v1/credits/transactions`
  - `GET /api/v1/credits/recharge-products`
  - `POST /api/v1/credits/payment-orders`

