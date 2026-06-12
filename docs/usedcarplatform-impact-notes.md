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
- Product frontend remains available through `npm run dev` on `http://localhost:5173`.
- Back-office login is now `/back-office/login`.
- Back-office console is now `/back-office`.
- Back-office can also run as a console-only local frontend through `npm run dev:console` on `http://localhost:5174`; its root path redirects to `/back-office`.
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

## 2026-06-05: Phase 3 Developer Dashboard Frontend Start

Reason:

Phase 3 begins the Developer MVP pages by making the console dashboard consume the real Phase 2 dashboard API.

Shared/frontend files changed:

- `src/api/visual-workbench.ts`
- `src/pages/credits-admin/index.vue`

Behavior impact:

- Adds typed frontend support for `GET /api/v1/platform/dashboard`.
- The console summary now displays backend-provided operational scope and metrics.
- No usedCarPlatform product page calls this endpoint.

Expected usedCarPlatform impact:

- Product workspace, product login, generation flows, and package/points pages are unchanged.
- The shared API module has one new platform-console function; existing usedCarPlatform API calls are unchanged.

Verification:

- Frontend typecheck should pass.

## 2026-06-05: Phase 4 Admin Agent Management Start

Reason:

Phase 4 begins the Company Admin MVP pages. Admin must operate as sales operations, not as a financial superuser.

Shared/frontend files changed:

- `src/pages/credits-admin/index.vue`

Behavior impact:

- Adds `GET /api/v1/platform/agents` for Developer/Admin Agent management.
- Admin now sees a dedicated Agent management table.
- Admin regular User list remains read-only and excludes Agent rows.
- Admin can use the existing backend capability route to disable Agent accounts.
- Admin still does not see or receive point-adjust controls.

Expected usedCarPlatform impact:

- No usedCarPlatform product pages are changed.
- This affects only the independent Reusable Credits Platform console mounted at `/back-office`.

Verification:

- Frontend typecheck should pass.
- Admin direct point-adjust API call should still return `403`.

## 2026-06-05: Phase 5 Agent Operations Start

Reason:

Phase 5 begins the Agent MVP pages by turning existing Agent tables into real workflows.

Shared/frontend files changed:

- `src/api/visual-workbench.ts`
- `src/pages/credits-admin/index.vue`

Behavior impact:

- Adds frontend calls for existing backend routes:
  - `POST /api/v1/platform/agent/leads`
  - `POST /api/v1/platform/agent/tickets`
  - `POST /api/v1/platform/agent/settlements/:settlementId/confirm`
- Agent can report leads from the console.
- Agent can create support tickets from the console.
- Agent can confirm draft settlement bills.

Expected usedCarPlatform impact:

- No usedCarPlatform product pages are changed.
- These actions are available only through the independent back-office console.

Verification:

- Frontend and backend typechecks should pass.
- Agent browser smoke should show quick actions for `创建 User`, `报备线索`, and `新建工单`.

## 2026-06-05: Phase 6 Commission Policy Start

Reason:

Phase 6 makes commission and settlement rules deterministic before deeper settlement automation is added.

Shared/backend files changed:

- `backend/src/modules/platform/platformRoutes.ts`
- `backend/src/modules/platform/commissionPolicyService.ts`

Shared/frontend files changed:

- `src/api/visual-workbench.ts`
- `src/pages/credits-admin/index.vue`

Behavior impact:

- Adds `GET /api/v1/platform/commission-policy`.
- Agent commission/settlement page displays fixed MVP rules:
  - `1 RMB = 100 credits`
  - `10%` commission
  - commission is based on customer recharge amount
  - settlement runs monthly on the 25th for previous month
  - refunds append reversal rows

Expected usedCarPlatform impact:

- No usedCarPlatform product pages are changed.
- This endpoint is for the independent back-office console.

Verification:

- Frontend and backend typechecks should pass.
- The commission-policy endpoint should return `200` for a back-office role.

## 2026-06-05: Phase 7 Agent Interaction Completeness Start

Reason:

Phase 7 requires every visible back-office button to respond and read-only tables to still provide useful detail/export actions.

Shared/frontend files changed:

- `src/pages/credits-admin/index.vue`

Behavior impact:

- Agent-owned tables now have `查看详情` buttons that open a full row detail modal.
- Agent-owned tables now have CSV `导出` buttons with immediate success or empty-state feedback.
- Existing create, settlement confirmation, and refresh actions remain unchanged.

Expected usedCarPlatform impact:

- No usedCarPlatform product pages are changed.
- CSV export is only exposed inside the independent back-office console.

Verification:

- Frontend typecheck should pass.
- Agent browser smoke should verify detail modal and export button response.

## 2026-06-05: Phase 8 Handoff Documentation

Reason:

Phase 8 makes the MVP reviewable by frontend, backend, product, and usedCarPlatform application teammates.

Docs added:

- `docs/three-role-back-office-phase-8-handoff.md`

Behavior impact:

- Documentation only.
- No product or back-office runtime behavior changes.

Expected usedCarPlatform impact:

- None.

Verification:

- Handoff doc should be reviewed alongside this impact note before product teammates integrate against the console APIs.
