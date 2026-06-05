# usedCarPlatform Impact Notes

Status: active handoff note
Date: 2026-06-05

This file records Reusable Credits Platform Console work that touches shared frontend/backend files also used by the usedCarPlatform application.

## 2026-06-05: Independent Back Office Shell

Reason:

The Reusable Credits Platform Console must be independent from the usedCarPlatform product web experience. usedCarPlatform is only one connected application, so the back office should not use the product login shell, product header, or product navigation.

Shared files changed:

- `src/router/routes.ts`
- `src/router/index.ts`

Console-owned files added:

- `src/layouts/BackOfficeLayout.vue`
- `src/pages/back-office-login/index.vue`

Behavior impact:

- Product login remains `/login`.
- Back-office login is now `/back-office/login`.
- Back-office console is now `/back-office`.
- `/reusable-credits-console` redirects to `/back-office`.
- `/credits-admin` redirects to `/back-office`.
- Unauthenticated back-office visits redirect to `/back-office/login`, not the product login.
- Regular product users without `menu:admin` cannot enter `/back-office`.

Expected usedCarPlatform impact:

- Normal product routes such as `/home`, `/login`, `/workspace`, `/credits`, and `/package-points` should continue using the existing product shell.
- Product colleagues should not need to change visual workbench code for this route split.

Rollback guidance:

- Revert the `/back-office/login` and `/back-office` route records in `src/router/routes.ts`.
- Restore `/reusable-credits-console` to mount `src/pages/credits-admin/index.vue` directly under `BasicLayout`.
- Remove the back-office special-case redirects in `src/router/index.ts`.

Verification:

- `http://localhost:5173/back-office/login` loads standalone login.
- `http://localhost:5173/back-office` requires a Developer/Admin/Agent session.
- `enterprise / 123456` cannot enter the back office.
- `developer / 123456`, `admin / 123456`, and `agent / 123456` can enter through `/back-office/login`.

## 2026-06-05: Latest PRD Permission Reconciliation

Reason:

The latest manager PRD says only Developer can adjust points. Company Admin user lists are read-only and cannot directly adjust balances or disable/enable regular users.

Shared/backend files changed:

- `backend/src/modules/platform/accountCreationPolicyDefaults.ts`
- `backend/src/modules/platform/platformAccountCapabilities.ts`
- `backend/src/db/migrate.ts`
- `src/policies/accountProvisioning.ts`
- `src/pages/credits-admin/index.vue`

Behavior impact:

- Developer can adjust points.
- Company Admin cannot adjust points.
- Agent cannot adjust points.
- Admin can create/manage Agent accounts where allowed.
- Admin no longer creates/deletes regular User accounts in the console.
- Rerunning backend migrations removes stale Admin `credits:points:adjust` permissions from local DBs.

Expected usedCarPlatform impact:

- Product users and product workflows are not affected.
- If colleagues previously tested Admin point adjustment in the console, that flow is intentionally removed by latest PRD.

Verification:

- Admin direct API call to `POST /api/v1/platform/credits/adjustments` returns `403`.
- Developer direct API call reaches validation/business logic.

## 2026-06-05: Phase 2 Dashboard API Foundation

Reason:

The Three-Role Back Office needs a stable PRD-facing dashboard API owned by the Reusable Credits Platform console boundary. This starts Phase 2 without changing usedCarPlatform product pages.

Shared/backend files changed:

- `backend/src/db/migrate.ts`
- `backend/src/modules/platform/platformRoutes.ts`
- `backend/src/modules/platform/platformDashboardService.ts`

Behavior impact:

- Adds `GET /api/v1/platform/dashboard` behind the existing back-office permission.
- Developer/Admin receive global operational counts.
- Agent receives only own-scope counts for customers, leads, tickets, and settlements.
- The response labels Reusable Credits Platform as the source of truth for balances, transactions, recharge products, payment orders, and billing tasks.

Expected usedCarPlatform impact:

- No product route, workspace, visual workbench, generation, recharge-page, or product-login behavior is changed.
- Frontend colleagues can call this endpoint from the independent back-office console only.
- Migration startup is made tolerant of older local DBs by running the batch item error-code backfill after `generation_tasks.last_error_code` exists.

Verification:

- Backend typecheck should pass.
- Developer/Admin/Agent sessions can call `GET /api/v1/platform/dashboard`.
- Regular product users remain blocked by `menu:admin`.
