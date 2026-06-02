# Phase 12: Team Handoff And PR

Status: done
Branch: `feat/reusable-credits-integration`
Tag: `phase-12-team-handoff-20260601`
PR target: `beyondband007-bot/usedCarPlatform:master`

## Summary

This branch integrates usedCarPlatform with the Reusable Credits Platform as the credits and billing module.

The selected architecture remains a two-service integration:

- usedCarPlatform owns vehicle assets, generation tasks, batch tasks, KIE task records, and delivery assets.
- Reusable Credits Platform owns users, tenants, accounts, recharge products, payment orders, billing tasks, and the credit ledger.

The usedCar frontend and backend now talk to the credits platform through usedCar-owned proxy and billing boundaries. This keeps credits platform URLs and internal contracts out of ordinary frontend code.

## What Changed

Backend integration:

- Added billing trace fields to `generation_tasks` and `batch_tasks`.
- Added a credits platform client and identity resolver.
- Freezes credits before supported single-generation and batch-item KIE submission.
- Settles successful terminal tasks.
- Refunds failed or canceled terminal tasks.
- Uses idempotency keys for estimate, freeze, settle, and refund.
- Adds `/api/v1/credits/*` proxy APIs for frontend and admin use.

Frontend integration:

- Header and subnav credit balance refresh from real credits accounts.
- Credits page loads real account and transaction data.
- Recharge page loads real recharge products and creates payment orders through the usedCar backend.
- Login exposes a temporary mock credits identity selector.
- Credits admin console provides a three-role back office for developer, company admin, and agent views.
- Developer/admin credit sections load live applications, functions, accounts, products, and transactions through the usedCar backend proxy.
- Agent and operational workflow sections define the intended leads, customers, commission, settlement, materials, and ticket surfaces until their backend APIs are implemented.

Testing and handoff:

- Added a repeatable Phase 11 local smoke runner.
- Documented setup, verification, and known limitations.
- Synced this branch with the current upstream `master` before handoff.

## Local Setup

Reusable Credits Platform:

```bash
cd "/Users/shenghangwang/Documents/Reusable Credits Platform"
docker compose up -d mysql
npm install
npm run db:migrate
npm run seed:used-car:demo
npm run dev
```

usedCarPlatform backend:

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration/backend"
npm install
npm run migrate
npm run dev
```

usedCarPlatform frontend:

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration"
npm install
npm run dev
```

Default local service URLs:

- Reusable Credits Platform API base: `http://127.0.0.1:3000`
- usedCar backend API base: `http://127.0.0.1:3101`
- usedCar frontend: `http://127.0.0.1:5173`

The two API services do not serve a root `/` page, so opening the bare API base URL in a browser returns `404`.

Use these health and inspection URLs instead:

- Reusable Credits Platform health: `http://127.0.0.1:3000/health`
- Reusable Credits Platform database health: `http://127.0.0.1:3000/health/db`
- Reusable Credits Platform Swagger UI: `http://127.0.0.1:3000/docs`
- usedCar backend health: `http://127.0.0.1:3101/health`

Example usedCar credits proxy smoke:

```bash
curl \
  -H "x-credits-user-id: 4" \
  -H "x-credits-account-scope: personal" \
  http://127.0.0.1:3101/api/v1/credits/accounts
```

## Required Environment Variables

usedCar backend:

```bash
CREDITS_PLATFORM_ENABLED=true
CREDITS_PLATFORM_BASE_URL=http://127.0.0.1:3000
CREDITS_APPLICATION_CODE=used-car-platform
CREDITS_REQUEST_TIMEOUT_MS=8000
```

Temporary local fallback identity for backend-only smoke tests:

```bash
CREDITS_DEFAULT_USER_ID=4
CREDITS_DEFAULT_ACCOUNT_SCOPE=personal
CREDITS_DEFAULT_TENANT_ID=
```

Do not commit `.env` files or private database credentials.

## Demo Identity

The Reusable Credits Platform demo seed creates:

- demo user: `used-car-demo@example.com`
- demo credits user id: `4`
- demo personal account id: `3`
- demo tenant account id: `4`

The usedCar login page currently uses frontend mock auth:

Exactly three roles are used in the Three-Role Credits Back Office:

- `developer` / `123456`
- `admin` / `123456`
- `agent` / `123456`

The username `enterprise` / `123456` is kept as the regular product-user login from the existing colleague frontend. It is not a back-office role and cannot access `/credits-admin`.

Use `developer` to review all three back-office views. Use `admin` to review admin and agent views. Use `agent` to verify the agent-only view. Use `enterprise` to verify normal product pages and confirm back-office access is denied.

A regular product user becomes an agent login only when `developer` or `admin` opens/promotes that user in the Three-Role Credits Back Office. This is represented in the current UI as a non-mutating agent-management action; production still needs audited backend APIs for the actual role/category change.

## Three-Role Back Office

The shared static prototype `积分后台-三角色静态原型.html` has been ported into the Vue route:

```text
/credits-admin
```

It contains:

- developer back office: system overview, app/API management, core data CRUD blueprint, tenant/customer management, user/account management, recharge/payment management, transaction audit, and agent management
- company admin back office: operations overview, agent management, customer management, recharge order/product view, transaction audit, and tickets
- agent back office: dashboard, leads/opportunity reporting, own customers, customer consumption, commission records, settlement bills, materials/training, and tickets

Detailed notes are in [Three-Role Credits Back Office](./reusable-credits-three-role-back-office.md).

Current progress status:

- complete for this release as a UI/prototype and review surface
- not production-complete as a writable operations system
- remaining production work is deferred: real backend RBAC, audited regular-user-to-agent promotion, agent APIs, settlement/ticket/material/commission CRUD, approval workflows, and audit logs
- current branch should be left as-is unless the team decides to pull those later-release workflows into the first release

## Verification

Run the deterministic integration smoke:

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration/backend"
npm run phase11:smoke
```

Latest successful run:

```text
Phase 11 smoke passed: 10 checks, runId=phase11_20260601013129_0a81a825
```

Also run:

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration/backend"
npm run typecheck

cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration"
npm run typecheck
npm run build
```

## Manual Review Checklist

1. Log in as `enterprise` and choose the personal mock credits identity.
2. Confirm the header and subnav show a real credits balance.
3. Open `/credits` and confirm the transaction list is populated from Reusable Credits Platform data.
4. Open `/package-points` and confirm recharge products are loaded from the credits platform.
5. Select a recharge product and confirm a pending payment order is created.
6. Try to open `/credits-admin` as `enterprise` and confirm access is denied.
7. Log in as `developer`.
8. Open `/credits-admin` and switch through the developer, company admin, and agent views.
9. Confirm live applications, functions, accounts, products, and transactions load in the developer/admin credit sections.
10. In agent management, confirm developer/admin can see the action to open a regular user as an agent.
11. Log in as `agent` and confirm only the agent back-office view is available.
12. Confirm agent workflow pages render leads, customers, consumption, commission, settlement, materials, and tickets.
13. Run `npm run phase11:smoke`.
14. Reopen `/credits-admin` and confirm recent `phase11_*` activity is inspectable.

## Known Limitations

The current login is still mock auth. Production must derive the credits identity from real usedCar session/auth data.

Tenant membership validation is not final. Tenant-scoped billing should only be enabled after usedCar can verify the user belongs to the tenant.

The Phase 11 smoke runner does not call real KIE and does not spend KIE quota. It verifies billing finalization by creating terminal local task rows and exercising the existing usedCar finalization endpoints.

Payment provider callback and paid recharge settlement are covered inside the Reusable Credits Platform tests, but usedCar currently only creates pending payment orders.

The credits admin console now has the full three-role UI surface, but write actions are intentionally non-mutating in this branch. This is the intended stopping point for the current release.

Agent, settlement, material, ticket, and commission pages currently use local UI data because those backend APIs do not exist yet in usedCarPlatform.

## Phase Links

- [Roadmap](./reusable-credits-integration-roadmap.md)
- [Phase 1 contract](./reusable-credits-integration-contract.md)
- [Phase 2 credits platform setup](./reusable-credits-phase-2-credits-platform-setup.md)
- [Phase 3 DB fields](./reusable-credits-phase-3-db-fields.md)
- [Phase 4 backend client](./reusable-credits-phase-4-backend-client.md)
- [Phase 5 terminal billing](./reusable-credits-phase-5-terminal-billing.md)
- [Phase 6 batch creation](./reusable-credits-phase-6-batch-billing.md)
- [Phase 7 proxy APIs](./reusable-credits-phase-7-proxy-apis.md)
- [Phase 8 frontend credit data](./reusable-credits-phase-8-frontend-credit-data.md)
- [Phase 9 admin console](./reusable-credits-phase-9-admin-console.md)
- [Phase 10 mock identity](./reusable-credits-phase-10-mock-identity.md)
- [Phase 11 E2E testing](./reusable-credits-phase-11-e2e-testing.md)
- [Three-role credits back office](./reusable-credits-three-role-back-office.md)
