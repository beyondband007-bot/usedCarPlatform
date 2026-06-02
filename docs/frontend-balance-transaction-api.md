# Frontend Balance And Transaction API

Date: 2026-06-01
Branch: `feat/reusable-credits-integration`

This document is for frontend teammates who need to show credit balances and transaction history in usedCarPlatform webpages.

Frontend code should call the usedCar backend proxy, not the Reusable Credits Platform directly.

```text
Local usedCar backend base URL:
http://127.0.0.1:3101/api/v1

Credits proxy mount:
/credits
```

## Response Envelope

All usedCar backend responses use this wrapper:

```ts
interface ApiResponse<T> {
  code: number
  message: string
  data: T
  requestId: string
}
```

Successful requests return:

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "req_xxx"
}
```

Frontend wrappers already exist in:

```text
src/api/visual-workbench.ts
```

Use:

- `getCreditAccounts`
- `getCreditTransactions`
- `getCreditsAdminOverview`

## Temporary Identity Convention

Until production login/session is connected, the frontend must provide a credits identity.

Preferred request headers:

```http
x-credits-user-id: 4
x-credits-account-scope: personal
```

For tenant account testing:

```http
x-credits-user-id: 4
x-credits-account-scope: tenant
x-credits-tenant-id: 4
```

The frontend mock login currently stores this identity in localStorage and the shared Axios client injects these headers automatically.

Manual query fallback is also supported:

```text
?creditsUserId=4&accountScope=personal
?creditsUserId=4&accountScope=tenant&creditsTenantId=4
```

## Get Account Balances

```http
GET /api/v1/credits/accounts
```

Purpose:

- fetch all credit accounts visible to the current identity
- show current balance, frozen balance, and total balance
- drive header balance, credits page balance cards, and account selectors

Query parameters:

| Name | Required | Description |
| --- | --- | --- |
| `creditsUserId` / `userId` | No if headers are present | Credits user id. |
| `accountScope` | No if headers are present | `personal` or `tenant`. |
| `creditsTenantId` / `tenantId` | Required for tenant scope | Tenant id for tenant account lookup. |

Example:

```sh
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/accounts
```

Response `data` shape:

```ts
interface CreditAccount {
  id: number
  tenantId: number | null
  userId: number | null
  accountScope: 'personal' | 'tenant'
  totalBalance: string
  lockedBalance: string
  availableBalance: string
  currency: string
  status: string
}

interface CreditAccountsData {
  accounts: CreditAccount[]
}
```

Example `data`:

```json
{
  "accounts": [
    {
      "id": 3,
      "tenantId": null,
      "userId": 4,
      "accountScope": "personal",
      "totalBalance": "100000.0000",
      "lockedBalance": "0.0000",
      "availableBalance": "100000.0000",
      "currency": "credits",
      "status": "active"
    }
  ]
}
```

Frontend display guidance:

- Header balance: use the active account's `availableBalance`.
- Frozen/locked balance: use `lockedBalance`.
- Total balance: use `totalBalance`.
- All numeric values are returned as decimal strings. Convert with `Number(value)` only for display math; keep the original string when precision matters.
- `availableBalance = totalBalance - lockedBalance`.

## Get Transactions

```http
GET /api/v1/credits/transactions
```

Purpose:

- fetch immutable credit ledger rows for one account
- show credits page transaction history
- show recharge, estimate, freeze, settle, refund, and adjustment records

Query parameters:

| Name | Required | Description |
| --- | --- | --- |
| `accountId` | No | Exact credit account id. If omitted, backend resolves the account from identity. |
| `limit` | No | Max rows, 1-100. |
| `creditsUserId` / `userId` | No if headers are present | Credits user id. |
| `accountScope` | No if headers are present | `personal` or `tenant`. Used when `accountId` is omitted. |
| `creditsTenantId` / `tenantId` | Required for tenant scope | Tenant id when resolving tenant account. |

Example, default personal account:

```sh
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  "http://127.0.0.1:3101/api/v1/credits/transactions?limit=50"
```

Example, exact account:

```sh
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  "http://127.0.0.1:3101/api/v1/credits/transactions?accountId=3&limit=50"
```

Response `data` shape:

```ts
interface CreditTransaction {
  id: number
  tenantId: number | null
  userId: number
  accountId: number
  billingTaskId: number | null
  paymentOrderId: number | null
  applicationId: number | null
  functionId: number | null
  txnType: string
  points: string
  balanceBefore: string
  balanceAfter: string
  bizType: string | null
  bizId: string | null
  refTxnId: number | null
  remark: string | null
  createdAt: string
}

interface CreditTransactionsData {
  account: CreditAccount
  transactions: CreditTransaction[]
}
```

Example `data`:

```json
{
  "account": {
    "id": 3,
    "tenantId": null,
    "userId": 4,
    "accountScope": "personal",
    "totalBalance": "100000.0000",
    "lockedBalance": "30.0000",
    "availableBalance": "99970.0000",
    "currency": "credits",
    "status": "active"
  },
  "transactions": [
    {
      "id": 120,
      "tenantId": null,
      "userId": 4,
      "accountId": 3,
      "billingTaskId": 88,
      "paymentOrderId": null,
      "applicationId": 2,
      "functionId": 14,
      "txnType": "settle",
      "points": "-30.0000",
      "balanceBefore": "100000.0000",
      "balanceAfter": "99970.0000",
      "bizType": "generation_task",
      "bizId": "task_xxx",
      "refTxnId": null,
      "remark": "billing settle",
      "createdAt": "2026-06-01T10:00:00.000Z"
    }
  ]
}
```

Transaction type display map:

| `txnType` | Suggested label | Meaning |
| --- | --- | --- |
| `recharge` | 充值积分 | Recharge/payment points added. |
| `estimate` | 费用预估 | Estimate record. Does not change balance. |
| `freeze` | 冻结积分 | Points locked before generation. Usually negative. |
| `settle` | 结算扣减 | Generation succeeded and locked points were consumed. Usually negative. |
| `refund` | 失败退回 | Generation failed/canceled and frozen points were returned. Usually positive. |
| `adjust` | 人工调整 | Admin/platform adjustment. |

Frontend display guidance:

- Use `points` sign to decide income/outcome:
  - `Number(points) >= 0`: income
  - `Number(points) < 0`: outcome
- Show `balanceAfter` as the row balance.
- Sort newest first if the UI does client-side merging.
- `bizType` and `bizId` can link a row back to a usedCar task or payment context.
- `billingTaskId` links a generation transaction to the Reusable Credits Platform billing task.
- `paymentOrderId` links a recharge transaction to a payment order.

## Get Admin Overview

```http
GET /api/v1/credits/admin/overview
```

Purpose:

- fetch a combined snapshot for admin/back-office views
- includes current identity, app metadata, function prices, accounts, recent transactions, and recharge products

Query parameters:

Same identity parameters as `/credits/accounts`.

Example:

```sh
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/admin/overview
```

Response `data` shape:

```ts
interface CreditsAdminOverview {
  identity: {
    userId: number
    accountScope: 'personal' | 'tenant'
    tenantId?: number
  }
  applications: Array<{
    id: number
    code: string
    name: string
    description: string | null
    status: string
  }>
  functions: Array<{
    id: number
    applicationId: number
    applicationCode?: string
    code: string
    name: string
    description: string | null
    chargeMode: 'fixed' | 'dynamic' | 'estimate_required'
    defaultPoints: string
    status: string
  }>
  accounts: CreditAccount[]
  transactions: CreditTransaction[]
  rechargeProducts: Array<{
    id: number
    name: string
    amount: string
    points: string
    bonusPoints: string
    currency: string
    sort: number
    enabled: boolean
  }>
}
```

Notes:

- `transactions` is a recent merged list from visible accounts, capped to 50 rows.
- Use this endpoint for back-office overview cards and operational inspection.
- For normal customer-facing balance and ledger pages, prefer `/credits/accounts` and `/credits/transactions`.

## Error Shape

Errors use the same response envelope:

```json
{
  "code": 40000,
  "message": "credits user id is required",
  "data": {
    "headers": ["x-credits-user-id", "x-user-id"],
    "queryOrBody": ["creditsUserId", "userId"]
  },
  "requestId": "req_xxx"
}
```

Common cases:

| HTTP status | Meaning | Frontend handling |
| --- | --- | --- |
| `400` | Missing or invalid identity/account query. | Ask user to login again or show account configuration error. |
| `402` | Insufficient credits during generation creation. | Show recharge/upgrade prompt. |
| `404` | Route not found. | Check base URL and path. |
| `500` | Backend or credits platform unavailable. | Show retry message. |

## Current Limitations

- There is no separate `/balance` endpoint. Balance is read from `/credits/accounts`.
- Transaction query currently returns one account at a time. To show multiple accounts, call `/credits/transactions?accountId=...` once per account or use `/credits/admin/overview` for admin pages.
- First-release flagship mother/child account visibility still has local demo logic in the frontend. Production persisted account hierarchy and server-side mother/child ledger aggregation are future work.
