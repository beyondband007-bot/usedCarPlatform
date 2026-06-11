# Reusable Credits Platform Console

Status: Latest PRD Phase 0/1 started
Date: 2026-06-05
Route: `/back-office`

## Purpose

The shared static prototype `积分后台-三角色静态原型.html` has been ported into the Vue frontend and is now being separated from the usedCarPlatform product shell as the Reusable Credits Platform console.

This page is intended for team review and local integration testing while frontend write forms, account-creation approval workflows, and deeper production workflows are still being designed.

usedCarPlatform is one integrated application in this console. Future applications such as `clothing_ai` should register functions like `model_generate`, `try_on_generate`, and `lifestyle_photo` through the same Reusable Credits Platform.

Executable migration plan: [Reusable Credits Platform Console Executable Plan](../external/reusable-credits-platform/docs/reusable-credits-console-executable-plan.md).

## Progress Snapshot

The Three-Role Credits Back Office should be treated as complete for the current integration release only at the UI/prototype level.

Completed in this branch:

- Vue route `/back-office`
- standalone back-office login `/back-office/login`
- three reviewable back-office views: developer, company admin, and agent
- role-limited local mock access for `developer`, `admin`, and `agent`
- regular user exclusion from back-office access
- regular-user-to-agent onboarding shown as a developer/admin back-office action
- live credit data through the usedCar backend proxy
- role-aware account creation buttons and shared form wired to the platform write API
- Developer-only point adjustment per latest PRD
- Developer account deletion for Admin/Agent/User and Admin deletion/disable for Agent only
- documentation for account creation and agent onboarding policy
- Phase 1 Reusable Credits Platform console language and multi-application catalog foundation
- hierarchical account-creation policy model for Developer/Admin/Agent
- Phase 2 backend policy tables, default policy seeding, and backend policy decision service
- Phase 3 session-backed RBAC middleware and protected console overview endpoint
- Phase 4 `POST /api/v1/platform/users` for policy-checked, audited, idempotent account creation
- Phase 5 multi-application filter, cross-application function pricing rows, enriched transactions, and customer profile table
- Phase 6 Agent operations overview API, Agent CRM seed data, commission preview, settlement draft, material library, and support-ticket foundation
- Phase 7 application integration contract, back-office review API, and executable fixtures for usedCarPlatform plus planned `clothing_ai`

Not production-complete yet:

- server-side RBAC coverage for future back-office write APIs beyond account creation, allowed deletion, and Developer point adjustment
- audited regular-user-to-agent promotion API
- agent onboarding database/API
- production CRUD for tenants, users, agents, and full lifecycle settlement/material/commission administration
- approval workflow implementation for role changes and account creation
- production registration and billing rows for future applications such as `clothing_ai`
- API endpoints to update persisted Developer/Admin account-creation toggles from the console

Decision for now: account creation writes are enabled only inside `/back-office`; the remaining role-promotion/approval workflows still need follow-up APIs.

## Roles

The console has three role-derived operational views:

| Role | Local view | Scope |
| --- | --- | --- |
| Developer | 开发者后台 | Full system view, API/function management, core data CRUD blueprint, accounts, products, transactions, tenants, and agents. |
| Company Admin | 公司管理员后台 | Operations view for agents, customers, recharge orders, transactions, and tickets without direct high-risk ledger writes. |
| Agent | 代理商后台 | Own customers, leads, consumption, commission, settlement, materials, and support tickets. |

The active view now follows the logged-in back-office role. Production should continue deriving role and menu access from real Reusable Credits Platform back-office session data.

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
GET /api/v1/platform/agent/overview
GET /api/v1/platform/integration-contract
```

The live sections include:

- registered credits applications/functions
- planned future application placeholders, currently `clothing_ai`
- credit accounts
- recharge products
- recent credit transactions
- cross-application customer profiles from local application-customer links
- agent customers, leads, commission previews, settlement bills, materials, and support tickets
- application integration contract fixtures, seed payloads, and billing lifecycle examples
- balance, frozen balance, active functions, and enabled products

## Mock Workflow Coverage

The following back-office workflow rows are currently local UI data because usedCarPlatform does not yet have production endpoints for them:

- tenant/customer operations beyond credit account inspection
- agent onboarding and agent profile management

Agent lead/opportunity reporting, commission records, settlement bills, marketing materials/training, and ticket support now have a first backend schema/API foundation for local integration review. Full write forms, approval states, and production settlement rules still need follow-up phases.

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
npm run dev:console
```

Open:

```text
http://127.0.0.1:5174
```

Use the local mock admin login:

```text
username: admin
password: 123456
```

## Review Checklist

1. Log in as `admin`.
2. Open `/back-office`.
3. Switch between 开发者, 公司管理员, and 代理商.
4. Confirm the left menu changes by role.
5. Confirm developer pages show live account, function, product, and transaction data after clicking `刷新实时数据`.
6. Confirm search and status filters work inside table views.
7. Confirm account creation buttons open the shared form and successful submissions refresh customer/account data.
8. Confirm the agent pages show live seeded leads, customers, commission preview, settlement, materials, and tickets.

## Current Limits

This implementation starts the latest-PRD back-office shape with independent login/shell, the first Agent operations API surface, account creation, allowed account deletion, and Developer point adjustment. It does not yet implement all production writes for agent onboarding, settlement payout, material management, or tenant/product administration.

Developer point adjustment now writes a Reusable Credits Platform `adjustment` transaction row and records operator/target metadata plus the audit reason in the remark. Future high-risk financial endpoints should keep the same append-only ledger and operator-identity pattern. Company Admin cannot adjust points per the latest PRD.

## Account Creation Policy

The account hierarchy is:

- Developer can create Admins, Agents, and Users.
- Developer toggle controls whether Admin can create Agents.
- Developer can disable Agent creation of Users.
- Admin can create Agents while Developer allows it.
- Admin toggle controls whether Agent can create Users.
- Admin toggle controls whether User becomes Agent.
- Agent can create Users when Admin allows it, unless Developer disables it.

Users without becoming Agent do not have the right to log in through this console.

Developer and company admin users may open a regular product user as an agent login from the back office. Agent-side User creation must respect the Admin gate plus Developer override hierarchy. Regular users cannot self-upgrade from the front office.

Role capability matrix:

| Role | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Developer | Admins, Agents, Users | All transactions and balances | Add/minus points | Admins, Agents, Users |
| Admin | Agents | All transactions and balances | Agent basic operations only | Agents |
| Agent | Users | Transactions and balances of Users it creates | None | None |

Production account creation should record creator role, creator id, tenant/customer ownership, application ownership, agent relation, policy decision, approval status, and audit history.

Implemented matrix actions in `/back-office`:

- Developer can create, adjust points, and delete Admin/Agent/User accounts.
- Admin can create and delete/disable Agent accounts. User list is read-only.
- Agent can create User accounts and read its own customer operations; Agent does not get point adjustment or delete buttons.

## Application Integration Contract

Future applications should follow the Phase 7 contract documented in [Reusable Credits Application Integration Contract](./reusable-credits-application-integration-contract.md).

The first fixtures are `used-car-platform` and planned `clothing_ai`. The contract defines application/function registration payloads, billing lifecycle idempotency patterns, and seed examples.
