# Three-Role Back Office MVP Executable Plan

Status: Phase 2 started
Date: 2026-06-05
Source PRD: `/Users/shenghangwang/Desktop/积分后台-MVP-功能骨架PRD.md`

## Product Direction

Build the Three-Role Back Office as an independent Reusable Credits Platform console, not as a usedCarPlatform product page.

usedCarPlatform remains the first integrated application. Future applications such as `clothing_ai` should appear as applications inside this console, not as owners of the console shell, login, permissions, or central billing rules.

Core business lines for MVP:

- credits recharge
- credits consumption
- agent commission
- settlement

## PRD Authority And Reconciliation

The latest Chinese PRD supersedes the older role capability matrix where it conflicts.

Required correction before new feature work:

- Developer can adjust points.
- Company Admin cannot adjust points.
- Agent cannot adjust points.
- Developer can manage recharge product tiers.
- Company Admin can only view recharge tiers and orders, plus mark order exceptions.
- Commission ratio is fixed at 10% for MVP. No level/tier commission system.
- Commission is based on customer recharge amount, not consumed points.
- Admin user list is read-only. Admin cannot directly modify user balances or disable/enable regular users.
- Agent dashboard is a workbench with reminders and quick actions, not a large data dashboard table.

## Target Route Model

Keep the current route during transition, but move the actual experience into a dedicated console shell.

- Product login remains `/login`.
- New back-office login: `/back-office/login`.
- New back-office shell: `/back-office`.
- Compatibility redirect: `/reusable-credits-console` redirects or mounts into `/back-office`.
- Legacy compatibility: `/credits-admin` redirects to `/back-office`.

Acceptance:

- A regular product user can still use the usedCarPlatform product login.
- A Developer/Admin/Agent enters through the independent console login.
- No AI CARXEN product top nav appears inside the back-office shell.
- usedCarPlatform appears as an application card/filter inside the console.

## Phase 0: Permission Reconciliation

Goal: make the code match the latest PRD before adding new pages.

Implementation status:

- Removed Admin point-adjust permission from backend defaults.
- Migration seeding now prunes stale role permissions from existing local DBs.
- Backend point-adjust route now allows Developer only.
- Admin user/account UI is read-only for point adjustment.
- Admin regular User creation/deletion has been removed from the active console controls.
- Verified Admin direct adjustment API returns `403`.
- Verified Developer reaches adjustment validation/business logic.

Tasks:

- Update frontend role capability checks so only Developer sees point-adjustment actions.
- Update backend capability service so Admin receives `403` for point adjustment.
- Update Admin user-list UI to read-only.
- Keep Admin agent-management actions available according to PRD.
- Update docs that still say Admin can add/minus points.
- Add tests for Developer/Admin/Agent point adjustment permission.

Files likely touched:

- `backend/src/modules/platform/platformAccountCapabilities.ts`
- `backend/src/modules/platform/accountCreationPolicyDefaults.ts`
- `backend/src/modules/platform/accountCreationPolicyDefaults.test.ts`
- `src/pages/credits-admin/index.vue`
- `src/policies/accountProvisioning.ts`
- `docs/reusable-credits-three-role-back-office.md`

Verification:

- Developer can open point-adjust modal and call API.
- Admin cannot see point-adjust action and direct API call returns `403`.
- Agent cannot see point-adjust action and direct API call returns `403`.
- `npm run typecheck`
- `cd backend && npm run typecheck`

## Phase 1: Independent Console Login And Shell

Goal: separate Reusable Credits Platform back-office UX from usedCarPlatform product UX.

Implementation status:

- Added `/back-office/login`.
- Added `/back-office`.
- Added standalone `BackOfficeLayout`.
- Redirected `/reusable-credits-console` and `/credits-admin` to `/back-office`.
- Back-office auth now redirects to `/back-office/login` instead of the product login.
- Console role view now follows the logged-in back-office role instead of an in-page role switcher.

Tasks:

- Create dedicated console login page inspired by `积分后台-三角色静态原型.html`.
- Create dedicated back-office layout with sidebar, role profile box, topbar, and content region.
- Move console route under the new layout.
- Hide product subnav, product header credits balance, and product marketing language from back-office pages.
- Make visible role/menu derive from authenticated role, not from an in-page role switcher.
- Keep demo credentials for local review: `developer`, `admin`, `agent`.

Files likely touched:

- `src/router/routes.ts`
- `src/layouts/BackOfficeLayout.vue`
- `src/pages/back-office-login/index.vue`
- `src/pages/credits-admin/index.vue`
- `src/stores/auth.ts`
- `src/components/layout/AppSubNav.vue`

Verification:

- `/back-office/login` loads without product shell.
- Successful Developer login lands on `/back-office`.
- `enterprise` cannot enter `/back-office`.
- `/reusable-credits-console` remains usable through redirect/compatibility.
- Mobile width does not break sidebar or login layout.

## Phase 2: MVP Data Model And API Foundation

Goal: provide real DB-backed endpoints for the PRD pages.

Implementation status:

- Started with `GET /api/v1/platform/dashboard`.
- The dashboard response is role-scoped:
  - Developer/Admin receive global back-office operational counts.
  - Agent receives only their own agent/customer/lead/ticket/settlement counts.
- The response documents source-of-truth ownership so frontend does not treat local console data as the credit ledger:
  - Reusable Credits Platform owns balances, transactions, recharge products, payment orders, and billing tasks.
  - usedCarPlatform MVP backend owns temporary console operations data such as application links, agent relations, leads, tickets, and settlements.
- The response explicitly states that points are shared across applications through one reusable credits balance.

Owned in usedCarPlatform backend for MVP:

- back-office customer/tenant profile tables
- agent profile table
- lead/reporting table with 30-day protection metadata
- ticket table
- settlement workflow table
- operational exception flags
- product permission links

Source of truth remains Reusable Credits Platform for:

- credit accounts
- credit balances
- credit transactions
- recharge products
- recharge/payment orders
- billing tasks

New or expanded APIs:

- `GET /api/v1/platform/dashboard`
- `GET/POST/PATCH /api/v1/platform/tenants`
- `GET/POST/PATCH /api/v1/platform/accounts`
- `GET/POST/PATCH /api/v1/platform/agents`
- `GET/POST/PATCH /api/v1/platform/leads`
- `GET/POST/PATCH /api/v1/platform/tickets`
- `GET /api/v1/platform/recharge-orders`
- `POST /api/v1/platform/recharge-orders/:id/mark-exception`
- `GET /api/v1/platform/commissions`
- `GET/POST/PATCH /api/v1/platform/settlements`

Verification:

- Migrations run cleanly on a fresh local DB.
- Seed data covers all three roles.
- API tests verify role scoping.
- No cumulative recharge/consumption value is accepted from form input.

## Phase 3: Developer MVP Pages

Goal: implement Developer’s full MVP skeleton with real responses for every visible action.

Pages:

- Dashboard
- Tenant/customer management
- User/account management
- Recharge tiers and order management
- Agent management
- Commission records
- Settlement management

Key behavior:

- Developer can add/edit/disable tenants/customers/accounts/agents.
- Developer can adjust points only with reason.
- Adjustment writes `adjustment` ledger rows.
- Developer can CRUD recharge tiers.
- Recharge orders are read-only except exception compensation handling.
- Commission records are read-only except approval/confirmation flow where PRD allows.
- Settlement can move from pending confirmation to paid.

Verification:

- Every visible button has a real response.
- Create/edit uses modal forms.
- Detail view opens modal with full row data.
- Disable/delete requires confirmation.
- Tables refresh after successful writes.

## Phase 4: Company Admin MVP Pages

Goal: implement Admin as sales-operations role, not financial superuser.

Pages:

- Dashboard
- Agent management
- User list
- Recharge records
- Ticket handling
- Settlement management
- Lead/reporting management

Key behavior:

- Admin can create/edit/disable agents.
- Admin can edit only basic agent information.
- Admin can view users but cannot adjust points or disable/enable users.
- Admin can view recharge tiers/orders, not edit tiers.
- Admin can mark order exceptions for Developer handling.
- Admin can process/close/transfer tickets.
- Admin can approve/reject settlement, without changing amounts.
- Admin can CRUD leads and approve direct/agent customer reporting.

Verification:

- Admin point-adjust direct API call returns `403`.
- Admin recharge-tier mutation direct API call returns `403`.
- Admin settlement amount mutation returns `403`.
- Admin approval actions write status history.

## Phase 5: Agent MVP Pages

Goal: implement Agent as own-customer operations role.

Pages:

- Agent workbench
- Lead/reporting
- My customers
- Customer consumption
- Commission and settlement

Key behavior:

- Workbench shows metrics, quick actions, and reminders; no large dashboard table.
- Agent can create/edit leads.
- Lead protection period defaults to 30 days.
- Ownership conflict triggers review status.
- Agent can edit only allowed customer fields: contact person, company name, phone.
- Agent cannot change customer ownership, status, product permission, or credit balance.
- Customer consumption is read-only and exportable.
- Commission is based on customer recharge amount.
- Agent can apply for settlement for previous unsettled month.

Verification:

- Agent sees only own customers/leads/commission/settlements.
- Agent cannot access all-platform user list.
- Export action gives success feedback.
- Settlement application creates or updates a pending settlement request.

## Phase 6: Commission And Settlement Rules

Goal: make recharge-based commission and monthly settlement deterministic.

Rules:

- `1 RMB = 100 credits`.
- Commission base is actual customer recharge amount.
- Commission rate is fixed at `10%`.
- Refund creates a commission reversal row, never edits original commission.
- Settlement date is monthly on the 25th for previous-month recharge commission.
- Settlement status: pending confirmation -> paid.
- Agent can confirm or manually dispute outside MVP form scope.

Verification:

- Recharge order creates commission preview/record for assigned agent.
- Refund creates reversal row.
- Settlement summary equals generated commission minus reversals/deductions.
- Generated records are append-only.

## Phase 7: Interaction Completeness

Goal: satisfy PRD interaction rule: every visible button responds.

Checklist:

- Create/edit opens modal form.
- Submit writes DB and refreshes table.
- View detail opens modal with full row fields.
- Disable/delete has second confirmation.
- Export/download/copy gives immediate success feedback.
- Read-only pages have no create/edit buttons.
- Loading, empty, error, and success states exist for each page.

Verification:

- Playwright smoke across Developer/Admin/Agent happy paths.
- Mobile and desktop screenshots verified.
- No overlapping text/buttons.
- No placeholder-only action buttons remain.

## Phase 8: Documentation, Tests, And Handoff

Goal: make the MVP reviewable by frontend, backend, and product.

Tasks:

- Update route docs.
- Update demo account docs.
- Update API contract docs.
- Add seed data notes.
- Add PRD traceability matrix.
- Add test checklist for local review.

Verification:

- `npm run typecheck`
- `npm run build`
- `cd backend && npm run typecheck`
- `cd backend && npm run build`
- backend route tests for permissions
- browser smoke for `/back-office/login` and `/back-office`

## First Implementation Slice

Start with Phase 0 and Phase 1 together.

Reason:

- The PRD conflicts with the older Admin point-adjust behavior, so permissions must be corrected first.
- The independent shell/login is the product-architecture foundation.
- After that, CRUD pages can be added without carrying usedCarPlatform page assumptions forward.

Do not start with settlement or commission logic until the independent console shell and corrected permissions are in place.
