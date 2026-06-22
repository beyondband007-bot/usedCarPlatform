# Reusable Credits Platform: New App Integration Guide

Status: team handoff draft
Audience: engineers building a new application that will connect to the Reusable Credits Platform
Last updated: 2026-06-18

## 1. What this platform owns

The Reusable Credits Platform is the source of truth for credits, not a helper table that each product app should copy.

It owns:

- users and credit identities;
- tenants and tenant membership;
- credit accounts and balances;
- locked/frozen credit rows;
- immutable credit transactions;
- billing tasks;
- application registration;
- billable function registration and default prices;
- recharge products, payment orders, and payment callbacks;
- agent profiles, agent-customer relations, and commission records.

The connected app owns:

- product-specific users/session records, if the product has its own login layer;
- product/business entities;
- uploaded assets and generated assets;
- product task/job records;
- external provider task IDs;
- task status and delivery state;
- cached billing snapshots needed for product UI and debugging.

The connected app must not own:

- the user's real credits balance;
- credit ledger rows;
- recharge settlement logic;
- payment callback verification;
- agent-customer relation source of truth;
- commission calculation source of truth.

For a new app, the safest mental model is:

```text
Product app database = business workflow and local snapshots
Credits Platform database = money/points/accounting/agent relationship source of truth
```

## 2. Local service map

In this repo, the Credits Platform lives under:

```text
external/reusable-credits-platform
```

Local defaults:

| Surface | URL | Notes |
| --- | --- | --- |
| Credits Platform API | `http://127.0.0.1:3000` | Fastify API |
| Credits health | `http://127.0.0.1:3000/health` | service liveness |
| Credits DB health | `http://127.0.0.1:3000/health/db` | database readiness |
| Credits Swagger UI | `http://127.0.0.1:3000/docs` | OpenAPI browser |
| Credits OpenAPI JSON | `http://127.0.0.1:3000/openapi.json` | generated contract |
| Reusable Credits Console | `http://127.0.0.1:5174` | console frontend in this repo |

Local startup for the Credits Platform:

```bash
cd external/reusable-credits-platform
npm install
docker compose up -d mysql
npm run db:migrate
npm run dev
```

The usedCar backend currently uses these environment variables to connect to the Credits Platform. A new app backend should keep the same shape:

```bash
CREDITS_PLATFORM_ENABLED=true
CREDITS_PLATFORM_BASE_URL=http://127.0.0.1:3000
CREDITS_APPLICATION_CODE=<your-app-code>
CREDITS_REQUEST_TIMEOUT_MS=8000
```

If the app also needs read-side joins against Credits tables for console/reporting pages, configure the Credits DB connection separately:

```bash
CREDITS_MYSQL_HOST=127.0.0.1
CREDITS_MYSQL_PORT=3306
CREDITS_MYSQL_DATABASE=credits_platform
CREDITS_MYSQL_USER=<user>
CREDITS_MYSQL_PASSWORD=<password>
CREDITS_MYSQL_CONNECTION_LIMIT=5
```

For normal billing actions, prefer HTTP APIs over direct DB writes.

## 3. Onboarding checklist for a new app

Before the new app submits any paid AI task:

1. Choose one stable `applicationCode`.
   - Use lowercase letters, numbers, hyphens, or underscores.
   - Examples: `used-car-platform`, `clothing_ai`.
2. Register the app with the Credits Platform.
3. Register every billable function under that app.
4. Decide the local `bizType` and `bizId` format for billable tasks.
5. Add local snapshot columns for billing state.
6. Resolve the Credits user identity from real app authentication.
7. Estimate and freeze credits before calling the external AI provider.
8. Settle exactly once when the task succeeds.
9. Refund exactly once when the task fails or is canceled.
10. Add smoke tests for insufficient balance, provider failure refund, success settlement, and idempotent retry.

## 4. Application and function registration

Register the application:

```http
POST /integration/applications
Content-Type: application/json
```

```json
{
  "code": "new-ai-app",
  "name": "New AI App",
  "description": "AI generation app connected to Reusable Credits Platform",
  "status": "active"
}
```

Register a billable function:

```http
POST /integration/applications/new-ai-app/functions
Content-Type: application/json
```

```json
{
  "code": "image_generate",
  "name": "Image Generate",
  "description": "Generate one image",
  "chargeMode": "estimate_required",
  "defaultPoints": "30.0000",
  "status": "active"
}
```

Supported `chargeMode` values:

| Mode | Use when |
| --- | --- |
| `fixed` | Every call costs the registered `defaultPoints`. |
| `dynamic` | The app calculates the cost from trusted backend-side options. |
| `estimate_required` | The app must pass or confirm the estimate before execution. This is safest for AI generation. |

Do not let the frontend decide `defaultPoints`, `estimatedPoints`, discount rules, or commission rates. Those values must come from backend logic and the Credits Platform catalog.

Useful introspection endpoints:

```http
GET /integration/contract
GET /integration/applications
GET /integration/applications/{applicationCode}/functions
GET /openapi.json
GET /docs
```

## 5. Billing identity

Every billing call needs a Credits identity:

```ts
type BillingIdentity = {
  userId: number              // Credits Platform user id
  accountScope: 'personal' | 'tenant'
  tenantId?: number           // required when accountScope is tenant
}
```

Rules:

- `userId` is the Credits Platform user ID, not necessarily the product app's local user primary key.
- For `personal`, the platform resolves the active personal account where `credit_accounts.user_id = userId`.
- For `tenant`, the platform verifies active `tenant_members` membership and resolves the tenant account.
- If `tenantId` is missing for tenant billing, the request is invalid.
- If an account does not exist, do not create local fallback balance rows. Create or fix the Credits Platform account.

Frontend identity headers currently used by the usedCar proxy are:

```http
x-credits-user-id: 4
x-credits-account-scope: personal
```

Tenant example:

```http
x-credits-user-id: 4
x-credits-account-scope: tenant
x-credits-tenant-id: 4
```

For the new app, production should derive these values from authenticated backend session data, not from editable frontend input.

## 6. Runtime billing lifecycle

The required lifecycle is:

```text
create local product task
-> POST /billing/estimate
-> POST /billing/freeze
-> call external AI provider only if freeze succeeds
-> POST /billing/settle on success
-> POST /billing/refund on failure/cancel
```

### 6.1 Estimate

```http
POST /billing/estimate
Content-Type: application/json
```

```json
{
  "userId": 4,
  "accountScope": "personal",
  "applicationCode": "new-ai-app",
  "functionCode": "image_generate",
  "estimatedPoints": "30.0000",
  "bizType": "new_app_generation_task",
  "bizId": "task_01HXYZ",
  "idempotencyKey": "estimate:new_app_generation_task:task_01HXYZ"
}
```

Notes:

- `estimatedPoints` may be omitted only when the registered function default is enough.
- For dynamic pricing, compute `estimatedPoints` on the app backend.
- The response contains `billingTaskId`; persist it locally.

### 6.2 Freeze

```http
POST /billing/freeze
Content-Type: application/json
```

```json
{
  "userId": 4,
  "billingTaskId": 58,
  "idempotencyKey": "freeze:new_app_generation_task:task_01HXYZ"
}
```

If freeze fails with insufficient balance, do not submit the task to the external AI provider.

### 6.3 Settle success

```http
POST /billing/settle
Content-Type: application/json
```

```json
{
  "userId": 4,
  "billingTaskId": 58,
  "idempotencyKey": "settle:new_app_generation_task:task_01HXYZ"
}
```

Call settle only after the external provider reaches a successful terminal state.

### 6.4 Refund failure or cancel

```http
POST /billing/refund
Content-Type: application/json
```

```json
{
  "userId": 4,
  "billingTaskId": 58,
  "idempotencyKey": "refund:new_app_generation_task:task_01HXYZ"
}
```

Call refund when:

- external provider submission fails after freeze;
- external provider returns failed terminal status;
- user cancels a task that already froze credits;
- app timeout policy marks the task failed.

## 7. Idempotency contract

Every credit-changing request must have a deterministic `idempotencyKey`.

Recommended format:

| Operation | Key |
| --- | --- |
| estimate | `estimate:<bizType>:<bizId>` |
| freeze | `freeze:<bizType>:<bizId>` |
| settle | `settle:<bizType>:<bizId>` |
| refund | `refund:<bizType>:<bizId>` |
| payment order | `payment_order:<userId>:<productId>:<clientRequestId>` |

Behavior:

- Same key + same request body returns the original response with `idempotentReplay: true`.
- Same key + different request body returns `409 conflict`.
- A retry while the first request is still processing returns conflict.

This means retry logic should resend the exact same body for the same operation.

## 8. Local app database fields

The app should persist enough to debug and finalize billing, but not enough to become the ledger.

Recommended fields on each billable task table:

| Field | Purpose |
| --- | --- |
| `credits_user_id` | Credits Platform user id used for billing |
| `credits_tenant_id` | Credits tenant id if tenant billing |
| `account_scope` | `personal` or `tenant` |
| `billing_task_id` | Credits Platform billing task id |
| `billing_status` | snapshot: `estimated`, `frozen`, `settled`, `refunded`, `settle_failed`, `refund_failed` |
| `estimated_points` | snapshot for UI/debugging |
| `settled_points` | snapshot after settle |
| `credits_application_code` | useful if the local app supports multiple app codes |
| `credits_function_code` | function billed |

The local app may also store:

- external provider task id;
- provider status;
- retry count;
- last billing error;
- generated result URLs.

The local app must not store or mutate:

- `credit_accounts.total_balance`;
- `credit_accounts.locked_balance`;
- `credit_accounts.available_balance`;
- `credit_transactions` as a local source of truth;
- payment callback settlement state as a local source of truth.

## 9. Balance, transaction, and recharge UI

If the new app has a frontend, expose app-backend proxy endpoints rather than calling the Credits Platform directly from the browser.

Recommended app backend proxy surface:

```http
GET  /api/v1/credits/accounts
GET  /api/v1/credits/transactions
GET  /api/v1/credits/recharge-products
POST /api/v1/credits/payment-orders
```

Why proxy:

- keeps the Credits Platform base URL private;
- derives billing identity from app auth/session;
- prevents frontend from choosing privileged user/tenant IDs;
- keeps the response envelope consistent with the app.

Direct Credits Platform endpoints behind the proxy:

```http
GET  /me/accounts?userId=4
GET  /accounts/{accountId}/transactions?userId=4&limit=50
GET  /recharge-products
POST /payment-orders
GET  /payment-orders/{paymentOrderId}?userId=4
```

Create payment order example:

```json
{
  "userId": 4,
  "accountScope": "personal",
  "productId": 1,
  "payChannel": "wechat",
  "idempotencyKey": "payment_order:4:1:req_01HXYZ"
}
```

Payment callbacks are handled by the Credits Platform:

```http
POST /payment-callbacks/{channel}
```

Callbacks must be signed with `PAYMENT_CALLBACK_SECRET`. Product apps should not implement their own recharge settlement ledger.

## 10. Agent and customer relationship

Agent-customer relationship belongs in the Credits Platform database.

Use Credits Platform ownership for:

- who is an approved agent;
- which users belong to which agent;
- direct/indirect relation type;
- commission rate;
- commission generation and settlement.

Relevant direct APIs:

```http
POST /agent-applications
GET  /platform/agent-applications?currentUserId=4&status=pending&limit=50
POST /platform/agent-applications/{userId}/approve
POST /platform/agent-applications/{userId}/reject
POST /platform/agents/{userId}/suspend
POST /agent-relations
GET  /agent-commissions?agentUserId=4&status=pending&limit=50
POST /agent-commissions/generate
POST /agent-commissions/{commissionId}/settle
POST /agent-commissions/{commissionId}/cancel
```

The connected app may cache display fields like agent name for tables, but it should resolve the relationship from Credits Platform IDs. If a user has no agent relation, the console should display them as platform-owned, not invent an app-local relation.

## 11. Error handling expectations

Common responses:

| Status | Meaning | App behavior |
| --- | --- | --- |
| `400` | bad request, missing tenant id, invalid points format | fix request construction |
| `402` | insufficient credits | show recharge/insufficient-balance UI; do not submit provider task |
| `403` | tenant membership or permission rejected | stop and show authorization error |
| `404` | account/function/task not found | check identity, seed, or registration |
| `409` | idempotency conflict or invalid lifecycle transition | retry only if body/key are identical; otherwise inspect local billing state |

Important lifecycle conflicts:

- Freezing a task that is not `estimated` is a conflict.
- Settling/refunding a task that is not `frozen` is a conflict.
- Reusing an idempotency key with a changed body is a conflict.

## 12. Testing checklist for the app team

At minimum, add automated or scriptable tests for:

1. app registration and function registration;
2. estimate returns a `billingTaskId`;
3. freeze blocks provider submission when balance is insufficient;
4. successful provider result settles the billing task;
5. failed provider result refunds the billing task;
6. repeated finalization does not double-settle or double-refund;
7. same idempotency key with same body replays;
8. same idempotency key with different body returns conflict;
9. tenant billing rejects non-members;
10. transaction history shows estimate/freeze/settle/refund rows;
11. recharge product list loads through the app proxy;
12. payment order creation uses server-derived identity.

Credits Platform checks:

```bash
cd external/reusable-credits-platform
npm run lint
npm run typecheck
npm test
npm run test:integration
```

For usedCar's current integration shape:

```bash
cd backend
npm run phase7:integration-contract-test
npm run phase11:smoke
```

## 13. Integration review questions before launch

Before connecting the new app in production, answer these:

- What is the final `applicationCode`?
- What are all `functionCode` values and default points?
- Which functions use fixed pricing and which use dynamic/estimated pricing?
- What is the local `bizType` for each task family?
- Where does the app persist `billingTaskId` and billing snapshots?
- How does the backend map app user/session to Credits `userId`?
- Does the app support tenant billing? If yes, where is membership verified?
- What happens if freeze succeeds but provider submission fails?
- What happens if the app crashes before settle/refund?
- What scheduled repair job or polling path finalizes stuck `frozen` tasks?
- Which frontend pages need balances, transaction history, or recharge products?
- Does the app need agent-owned customer filtering? If yes, use Credits Platform relations.

## 14. Useful source files in this repo

Credits Platform:

- `external/reusable-credits-platform/docs/integration-contract.md`
- `external/reusable-credits-platform/src/http/billing-routes.ts`
- `external/reusable-credits-platform/src/billing/billing-service.ts`
- `external/reusable-credits-platform/src/http/integration-routes.ts`
- `external/reusable-credits-platform/src/integration/integration-service.ts`
- `external/reusable-credits-platform/src/http/payment-routes.ts`
- `external/reusable-credits-platform/src/http/agent-routes.ts`
- `external/reusable-credits-platform/tests/phase-8.integration.test.ts`

usedCar integration example:

- `backend/src/modules/billing/creditsClient.ts`
- `backend/src/modules/billing/billingLifecycle.ts`
- `backend/src/modules/billing/billingIdentity.ts`
- `backend/src/modules/billing/creditFunctionCatalog.ts`
- `backend/src/modules/billing/creditFunctionSync.ts`
- `backend/src/modules/billing/creditsRoutes.ts`
- `backend/src/modules/platform/applicationIntegrationContract.ts`
- `backend/scripts/phase11-e2e-smoke.mjs`

Team docs:

- `docs/credits-platform-new-app-integration-guide.md`
- `docs/credits-platform-new-app-integration-guide.zh-CN.md`
