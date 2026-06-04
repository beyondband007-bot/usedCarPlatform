# Reusable Credits Platform Console

Status: Phase 3 first backend RBAC slice implemented; write workflows pending
Date: 2026-06-04
Route: `/credits-admin`

## Purpose

The shared static prototype `积分后台-三角色静态原型.html` has been ported into the usedCarPlatform Vue frontend and is now being moved into the Reusable Credits Platform console.

This page is intended for team review and local integration testing while production auth/session, RBAC, account-creation write APIs, and agent APIs are still being designed.

usedCarPlatform is one integrated application in this console. Future applications such as `clothing_ai` should register functions like `model_generate`, `try_on_generate`, and `lifestyle_photo` through the same Reusable Credits Platform.

Executable migration plan: [Reusable Credits Platform Console Executable Plan](../external/reusable-credits-platform/docs/reusable-credits-console-executable-plan.md).

## Progress Snapshot

The Three-Role Credits Back Office should be treated as complete for the current integration release only at the UI/prototype level.

Completed in this branch:

- Vue route `/credits-admin`
- three reviewable back-office views: developer, company admin, and agent
- role-limited local mock access for `developer`, `admin`, and `agent`
- regular user exclusion from back-office access
- regular-user-to-agent onboarding shown as a developer/admin back-office action
- live read-only credit data through the usedCar backend proxy
- non-mutating action buttons that show intended workflows
- documentation for account creation and agent onboarding policy
- Phase 1 Reusable Credits Platform console language and multi-application catalog foundation
- hierarchical account-creation policy model for Developer/Admin/Agent
- Phase 2 backend policy tables, default policy seeding, and backend policy decision service
- Phase 3 session-backed RBAC middleware and protected console overview endpoint

Not production-complete yet:

- server-side RBAC coverage for future back-office write APIs
- audited regular-user-to-agent promotion API
- agent onboarding database/API
- production CRUD for tenants, users, agents, tickets, settlement, materials, and commissions
- approval workflow implementation for role changes and account creation
- real write actions from the console
- API endpoints to update persisted Developer/Admin account-creation toggles from the console

Decision for now: keep the current console writes non-mutating until Phase 3 and Phase 4 connect production session identity, RBAC, account creation, role promotion, and audit writes.

## Roles

The console has a role switcher with three operational views:

| Role | Local view | Scope |
| --- | --- | --- |
| Developer | 开发者后台 | Full system view, API/function management, core data CRUD blueprint, accounts, products, transactions, tenants, and agents. |
| Company Admin | 公司管理员后台 | Operations view for agents, customers, recharge orders, transactions, and tickets without direct high-risk ledger writes. |
| Agent | 代理商后台 | Own customers, leads, consumption, commission, settlement, materials, and support tickets. |

The role switcher is inside the page for prototype/demo purposes. Production should derive role and menu access from real Reusable Credits Platform back-office session data.

Regular product users are not back-office operators while their role remains regular. They can use the front-office product pages only. If a regular user becomes an Agent through a back-office role/category change, that same person can then log in to the Reusable Credits Platform console as an Agent.

## Implemented Pages

Developer:

- System overview
- Application/API management
- Core data CRUD blueprint
- Tenant/customer management
- User and credit account management
- Recharge/payment management
- Transaction audit
- Agent management

Company Admin:

- Operations overview
- Agent management
- Customer management
- Recharge order/product view
- Transaction audit view
- Ticket support

Agent:

- Agent dashboard
- Lead/opportunity reporting
- My customers
- Customer consumption records
- Commission records
- Settlement bills
- Materials/training
- Ticket support

## Live Data Coverage

The page still respects the usedCar backend proxy boundary. The frontend does not call Reusable Credits Platform directly.

Live data currently comes from the compatibility usedCar proxy:

```http
GET /api/v1/credits/admin/overview
```

The live sections include:

- registered credits applications/functions
- credit accounts
- recharge products
- recent credit transactions
- balance, frozen balance, active functions, and enabled products

## Mock Workflow Coverage

The following back-office workflow rows are currently local UI data because usedCarPlatform does not yet have production endpoints for them:

- tenant/customer operations beyond credit account inspection
- agent onboarding and agent profile management
- lead/opportunity reporting
- commission records
- settlement bills
- marketing materials/training
- ticket support

These mock sections are intentional. They define the expected product surface and permission boundaries before backend schema/API work starts.

Agent management now explicitly includes regular-user-to-agent onboarding. The `enterprise` demo user remains a regular front-office user unless a platform owner opens a separate agent login/category for that user through back-office agent management.

## Local Start

Start the two APIs and the frontend:

```bash
cd "/Users/shenghangwang/Documents/Reusable Credits Platform"
docker compose up -d mysql
npm install
npm run db:migrate
npm run seed:used-car:demo
npm run dev
```

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration/backend"
npm install
npm run migrate
npm run dev
```

```bash
cd "/Users/shenghangwang/Desktop/usedCarPlatform-credits-integration"
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/credits-admin
```

Use the local mock admin login:

```text
username: admin
password: 123456
```

## Review Checklist

1. Log in as `admin`.
2. Open `/credits-admin`.
3. Switch between 开发者, 公司管理员, and 代理商.
4. Confirm the left menu changes by role.
5. Confirm developer pages show live account, function, product, and transaction data after clicking `刷新实时数据`.
6. Confirm search and status filters work inside table views.
7. Confirm action buttons update the `当前操作` line and do not perform real writes yet.
8. Confirm the agent pages expose leads, customers, consumption, commission, settlement, materials, and tickets as the next backend API targets.

## Current Limits

This implementation finishes the three-role back-office UI and reviewable workflow surface. It does not yet implement production writes for agent, settlement, ticket, material, or admin CRUD operations.

High-risk financial operations remain intentionally non-mutating from this console. Future backend work should use append-only ledger events, idempotency keys, operator identity, and audit reasons rather than direct balance or transaction edits.

## Account Creation Policy

The account hierarchy is:

- Developer can create Admins, Agents, and Users.
- Developer toggle controls whether Admin can create Agents and Users.
- Developer toggle controls whether Agent can create Users.
- Admin can create Agents and Users while Developer allows it.
- Admin toggle controls whether Agent can create Users.
- Admin toggle controls whether User becomes Agent.
- Agent can create Users while both Developer and Admin allow it.

Users without becoming Agent do not have the right to log in through this console.

Developer and company admin users may open a regular product user as an agent login from the back office. Agent-side User creation must respect the Developer + Admin hierarchy. Regular users cannot self-upgrade from the front office.

Production account creation should record creator role, creator id, tenant/customer ownership, application ownership, agent relation, policy decision, approval status, and audit history.
