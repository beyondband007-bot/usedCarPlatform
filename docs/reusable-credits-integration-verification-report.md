# Reusable Credits Platform x usedCarPlatform Integration Verification Report

Date: 2026-06-01
Branch: `feat/reusable-credits-integration`
Pull request: `beyondband007-bot/usedCarPlatform#1`

## 1. Summary

The Reusable Credits Platform has been integrated into usedCarPlatform as the credits and billing module for the current MVP.

The integration keeps the two systems as separate services:

- Reusable Credits Platform owns credits, billing, recharge, payment orders, billing tasks, locks, and the immutable credit ledger.
- usedCarPlatform owns vehicle assets, generation tasks, batch tasks, KIE task records, generated results, and delivery assets.

This is intentional. usedCarPlatform does not duplicate the full credits database. It stores only trace fields that link usedCar generation/batch records back to the Reusable Credits Platform billing records.

## 2. What Is Finished

### Finished: Credits/Billing Database Integration

The database work required for the current credits/billing integration is finished.

Reusable Credits Platform PostgreSQL contains the source-of-truth billing schema:

- `users`
- `tenants`
- `tenant_members`
- `applications`
- `application_functions`
- `credit_accounts`
- `recharge_products`
- `payment_orders`
- `payment_callbacks`
- `billing_tasks`
- `billing_locks`
- `credit_transactions`
- `idempotency_keys`
- `tenant_settlements`
- `agent_relations`
- `agent_commissions`

usedCarPlatform MySQL contains the local task data plus billing trace fields:

- `generation_tasks.credits_user_id`
- `generation_tasks.credits_tenant_id`
- `generation_tasks.account_scope`
- `generation_tasks.billing_task_id`
- `generation_tasks.billing_status`
- `generation_tasks.estimated_points`
- `generation_tasks.settled_points`
- `batch_tasks.credits_user_id`
- `batch_tasks.credits_tenant_id`
- `batch_tasks.account_scope`
- `batch_tasks.estimated_points`
- `batch_tasks.settled_points`

These fields are enough to connect each usedCar task or batch back to a Reusable Credits Platform billing record.

### Finished: Billing Flow Integration

The current integration supports:

- Loading real credit account balances into usedCar frontend.
- Loading real credit transaction history into usedCar frontend.
- Loading real recharge products into usedCar frontend.
- Creating payment orders through the usedCar backend proxy.
- Estimating and freezing credits before supported single generation tasks are submitted.
- Settling credits when a generation task succeeds.
- Refunding credits when a generation task fails or is canceled.
- Freezing credits for each supported batch item.
- Settling/refunding batch items according to item terminal status.
- Blocking task submission before KIE when balance is insufficient.
- Viewing live credits data from the usedCar admin console.

### Finished: Three-Role Back Office UI

The shared static prototype `积分后台-三角色静态原型.html` has been ported into usedCarPlatform as:

```text
/credits-admin
```

The route includes:

- Developer back office
- Company admin back office
- Agent back office

Current live data in the back office comes from the usedCar backend proxy:

```http
GET /api/v1/credits/admin/overview
```

This loads:

- applications
- usedCarPlatform function pricing
- credit accounts
- recharge products
- recent credit transactions

## 3. What Is Not Finished Yet

The full three-role back office UI is finished for product and backend API review, but not every back-office workflow has a production database/API implementation yet.

The following pages currently use local UI data because usedCarPlatform does not yet have these production endpoints:

- agent lead/opportunity reporting
- agent customer CRM workflows
- commission records
- settlement bills
- marketing materials/training
- ticket support
- production developer/admin CRUD and approval workflows

These are separate from the current credits/billing integration. The billing MVP is complete; the future work is the operational back-office database/API layer.

## 4. Local Setup

### 4.1 Start Reusable Credits Platform

```bash
cd "/Users/shenghangwang/Documents/Reusable Credits Platform"
docker compose up -d postgres
npm install
npm run db:migrate
npm run seed:used-car:demo
npm run dev
```

Expected API base:

```text
http://127.0.0.1:3000
```

The API root `/` may return `404`. That is normal. Use:

```text
http://127.0.0.1:3000/health
http://127.0.0.1:3000/health/db
http://127.0.0.1:3000/docs
```

### 4.2 Start usedCarPlatform Backend

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration/backend"
npm install
npm run migrate
npm run dev
```

Expected API base:

```text
http://127.0.0.1:3101
```

The API root `/` may return `404`. That is normal. Use:

```text
http://127.0.0.1:3101/health
```

### 4.3 Start usedCarPlatform Frontend

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration"
npm install
npm run dev
```

Expected frontend:

```text
http://127.0.0.1:5173
```

## 5. Local Login Accounts

The current usedCarPlatform login is still mock auth.

Open:

```text
http://127.0.0.1:5173/login
```

Regular product user:

```text
username: enterprise
password: 123456
```

This username is kept for compatibility with the existing frontend. It is a regular product-user login, not a Three-Role Credits Back Office role.

If this user needs to become an agent, a platform `developer` or `admin` must open/promote it through the Three-Role Credits Back Office. The user cannot self-upgrade from the front-office login.

Admin user:

```text
username: admin
password: 123456
```

Developer user:

```text
username: developer
password: 123456
```

Agent user:

```text
username: agent
password: 123456
```

Use `enterprise` to test normal product-user pages:

- `/workspace`
- `/credits`
- `/package-points`

The `enterprise` user must not be able to enter `/credits-admin`.

Use `admin` to test:

- `/credits-admin`

Use `developer` to review all back-office role views. Use `agent` to verify that the login can only see the agent back-office view.

The role switcher inside `/credits-admin` is currently for prototype/demo review. Real developer/admin/agent login separation is a future production auth and permission phase.

First release account creation policy:

- user/customer accounts must be created by platform owner roles: developer or company admin
- regular users can become agent logins only after developer/admin opens them through the back office
- agents cannot create client login accounts yet
- the agent view shows client account creation as a disabled future action
- later agent-created client accounts should go through an approval/audit flow

## 6. Automated Verification

The main integration proof is the Phase 11 smoke test.

Run:

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration/backend"
npm run phase11:smoke
```

This test verifies:

- Reusable Credits Platform health.
- usedCar backend health.
- usedCar credits account proxy.
- usedCar recharge product proxy.
- payment order creation through usedCar proxy.
- credits admin overview through usedCar proxy.
- single generation success settles credits.
- single generation failure refunds credits.
- batch mixed success/failure settles/refunds per item.
- insufficient balance blocks usedCar task creation before KIE submission.

Expected final output:

```text
Phase 11 smoke passed: 10 checks, runId=phase11_...
```

The smoke runner intentionally does not call real KIE and does not spend KIE quota. It creates deterministic local `phase11_*` rows and exercises the same billing finalization code paths.

## 7. Database Verification

### 7.1 Verify usedCarPlatform MySQL Migration

Connect to the usedCarPlatform MySQL database and run:

```sql
SHOW COLUMNS FROM generation_tasks LIKE '%credits%';
SHOW COLUMNS FROM generation_tasks LIKE '%billing%';
SHOW COLUMNS FROM generation_tasks LIKE '%points%';

SHOW COLUMNS FROM batch_tasks LIKE '%credits%';
SHOW COLUMNS FROM batch_tasks LIKE '%points%';
```

Expected result:

- `generation_tasks` has credits identity fields, billing task id/status, estimated points, and settled points.
- `batch_tasks` has credits identity fields, account scope, estimated points, and settled points.

After running `npm run phase11:smoke`, run:

```sql
SELECT
  id,
  module_code,
  status,
  credits_user_id,
  credits_tenant_id,
  account_scope,
  billing_task_id,
  billing_status,
  estimated_points,
  settled_points,
  created_at
FROM generation_tasks
WHERE id LIKE 'phase11_%'
ORDER BY created_at DESC
LIMIT 20;
```

Expected result:

- Rows with ids starting with `phase11_`.
- Successful rows have `billing_status = 'settled'`.
- Failed rows have `billing_status = 'refunded'`.
- `billing_task_id` is populated and points are recorded.

For batch verification:

```sql
SELECT
  id,
  project_name,
  status,
  credits_user_id,
  account_scope,
  estimated_points,
  settled_points,
  created_at
FROM batch_tasks
WHERE id LIKE 'phase11_%'
ORDER BY created_at DESC
LIMIT 10;
```

Expected result:

- Batch rows with credits identity and point totals.
- Batch totals are derived from child generation task billing records.

### 7.2 Verify Reusable Credits Platform PostgreSQL Schema

Connect to the Reusable Credits Platform PostgreSQL database and run:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users',
    'tenants',
    'applications',
    'application_functions',
    'credit_accounts',
    'recharge_products',
    'payment_orders',
    'billing_tasks',
    'billing_locks',
    'credit_transactions',
    'idempotency_keys'
  )
ORDER BY table_name;
```

Expected result:

- All listed tables exist.

Verify the usedCar application seed:

```sql
SELECT id, code, name, status
FROM applications
WHERE code = 'used-car-platform';
```

Expected result:

- One active application row with `code = 'used-car-platform'`.

Verify usedCar function pricing:

```sql
SELECT af.code, af.name, af.default_points, af.status
FROM application_functions af
JOIN applications a ON a.id = af.application_id
WHERE a.code = 'used-car-platform'
ORDER BY af.code;
```

Expected result:

- Function rows for usedCar generation modules, including:
  - `showroom-light`
  - `outdoor-scene`
  - `road-motion`
  - `sky-studio`
  - `paint-refresh`
  - `light-consistency`
  - `interior-clean`
  - `watermark-remove`
  - `batch-new-exterior`
  - `batch-new-interior`

Verify credit accounts:

```sql
SELECT
  id,
  user_id,
  tenant_id,
  account_scope,
  total_balance,
  locked_balance,
  available_balance,
  status
FROM credit_accounts
ORDER BY id;
```

Expected result:

- Demo personal and tenant accounts exist after seed.
- `available_balance = total_balance - locked_balance`.

Verify smoke-created billing tasks:

```sql
SELECT
  id,
  user_id,
  account_id,
  biz_type,
  biz_id,
  estimated_points,
  frozen_points,
  settled_points,
  status,
  created_at
FROM billing_tasks
WHERE biz_id LIKE 'phase11_%'
ORDER BY created_at DESC
LIMIT 20;
```

Expected result:

- Rows created by the smoke runner.
- Successful task billing records end as `settled`.
- Failed task billing records end as `refunded`.

Verify immutable ledger transactions:

```sql
SELECT
  id,
  txn_type,
  points,
  balance_before,
  balance_after,
  billing_task_id,
  payment_order_id,
  biz_type,
  biz_id,
  created_at
FROM credit_transactions
WHERE biz_id LIKE 'phase11_%'
ORDER BY created_at DESC
LIMIT 30;
```

Expected result:

- Ledger rows for estimate/freeze/settle/refund activity.
- Transactions are append-only records and should not be manually edited.

## 8. API Verification

With both services running, verify usedCar backend proxy endpoints.

Credits accounts:

```bash
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/accounts
```

Recharge products:

```bash
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/recharge-products
```

Recent transactions:

```bash
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/transactions
```

Admin overview:

```bash
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/admin/overview
```

Expected result:

- usedCar backend returns data from Reusable Credits Platform.
- The frontend never needs to call the credits platform directly.

## 9. Frontend Verification

### 9.1 Regular User Flow

1. Open `http://127.0.0.1:5173/login`.
2. Log in with:

```text
username: enterprise
password: 123456
```

3. Select the default mock credits identity.
4. Confirm the header/subnav credit balance is loaded.
5. Open `/credits`.
6. Confirm transaction history loads.
7. Open `/package-points`.
8. Confirm recharge products load.
9. Create a recharge order and confirm a pending payment order is returned.

### 9.2 Admin Console Flow

1. Open `http://127.0.0.1:5173/login`.
2. Log in with:

```text
username: admin
password: 123456
```

3. Open:

```text
http://127.0.0.1:5173/credits-admin
```

4. Click `刷新实时数据`.
5. Switch between:
   - 开发者
   - 公司管理员
   - 代理商
6. Confirm live function/account/product/transaction data appears in developer/admin credit sections.
7. Confirm agent pages render leads, customers, consumption, commission, settlement, materials, and tickets as the next backend API targets.

## 10. Code Locations

Reusable Credits Platform:

- Core schema migration: `migrations/000002_phase_1_core_schema.cjs`
- usedCar application/function seed: `scripts/seed-used-car-platform.cjs`

usedCarPlatform:

- MySQL schema and migrations: `backend/src/db/migrations.ts`
- Backward-compatible migration helper: `backend/src/db/migrate.ts`
- Credits API proxy routes: `backend/src/modules/billing/creditsRoutes.ts`
- Credits platform HTTP client: `backend/src/modules/billing/creditsClient.ts`
- Billing lifecycle: `backend/src/modules/billing/billingLifecycle.ts`
- Billing identity resolver: `backend/src/modules/billing/billingIdentity.ts`
- Single generation integration examples:
  - `backend/src/modules/showroom-light/showroomLightService.ts`
  - `backend/src/modules/paint-refresh/paintRefreshService.ts`
  - `backend/src/modules/light-consistency/lightConsistencyService.ts`
  - `backend/src/modules/interior-clean/interiorCleanService.ts`
  - `backend/src/modules/watermark-remove/watermarkRemoveService.ts`
- Batch integration: `backend/src/modules/batch-new/batchService.ts`
- E2E smoke runner: `backend/scripts/phase11-e2e-smoke.mjs`
- Frontend credits API client: `src/api/visual-workbench.ts`
- Frontend mock credits identity: `src/utils/credits-identity.ts`
- Regular credits page: `src/pages/credits/index.vue`
- Recharge page: `src/pages/package-points/index.vue`
- Three-role back office: `src/pages/credits-admin/index.vue`

## 11. Final Answer For “Is The Database Finished?”

Recommended wording:

```text
The database work for the current credits/billing integration MVP is finished.

Reusable Credits Platform is the source of truth for users, tenants, credit accounts, recharge products, payment orders, billing tasks, locks, and immutable credit transactions. usedCarPlatform stores only the local business task data plus billing trace fields such as credits_user_id, billing_task_id, billing_status, estimated_points, and settled_points.

We can demonstrate this by running both migrations, running npm run phase11:smoke, and showing matching rows in both databases: usedCar generation_tasks/batch_tasks contain billing references, and Reusable Credits Platform billing_tasks/credit_transactions contain the source-of-truth ledger records.

The full three-role back-office UI is also implemented for review, but some operational workflow databases/APIs, such as agent leads, settlement bills, ticket support, and production CRUD approvals, are future work beyond the billing MVP.
```

## 12. Known Limits

- usedCar login is still mock auth.
- Production must derive credits identity from real usedCar session/auth data.
- Tenant membership validation is not final.
- Payment provider callback and paid recharge settlement are covered in the Reusable Credits Platform side, while usedCar currently creates pending payment orders through the proxy.
- The Phase 11 smoke runner does not call real KIE.
- Three-role back-office write actions are non-mutating until role permissions, audit APIs, and workflow endpoints are implemented.
