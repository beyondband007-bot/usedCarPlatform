# Three-Role Credits Back Office

Status: implemented
Date: 2026-06-01
Route: `/credits-admin`

## Purpose

The shared static prototype `积分后台-三角色静态原型.html` has been ported into the usedCarPlatform Vue frontend as a full three-role credits back office.

This page is intended for team review and local integration testing while the production auth/session and agent APIs are still being designed.

## Roles

The console has a role switcher with three operational views:

| Role | Local view | Scope |
| --- | --- | --- |
| Developer | 开发者后台 | Full system view, API/function management, core data CRUD blueprint, accounts, products, transactions, tenants, and agents. |
| Company Admin | 公司管理员后台 | Operations view for agents, customers, recharge orders, transactions, and tickets without direct high-risk ledger writes. |
| Agent | 代理商后台 | Own customers, leads, consumption, commission, settlement, materials, and support tickets. |

The role switcher is inside the page for prototype/demo purposes. Production should derive role and menu access from real usedCar session data.

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

Live data currently comes from:

```http
GET /api/v1/credits/admin/overview
```

The live sections include:

- usedCar credits application/functions
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

## Local Start

Start the two APIs and the frontend:

```bash
cd "/Users/shenghangwang/Documents/Reusable Credits Platform"
docker compose up -d postgres
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

## First Release Account Creation Policy

For the first release, all user/customer accounts must be created by platform owner roles:

- developer
- company admin

Agents cannot create client login accounts in the first release. In the three-role console, agent-side customer account creation is shown as a disabled future action so reviewers can see the intended later workflow without assuming it is already available.

Later, agents may be allowed to create client accounts through a controlled approval flow. That future flow should still record creator role, creator id, tenant/customer ownership, agent relation, approval status, and audit history.
