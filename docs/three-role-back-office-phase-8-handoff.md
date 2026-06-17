# Three-Role Back Office Phase 8 Handoff

Status: ready for local review
Date: 2026-06-05

This handoff covers the independent Reusable Credits Platform console at `/back-office`.
usedCarPlatform remains the first connected application and should not own the central credits, commission, role, or settlement rules.

## Routes

| Route | Purpose | Shell | Access |
| --- | --- | --- | --- |
| `/back-office/login` | Independent back-office login | Standalone back-office login page | Public, but only Developer/Admin/Agent can proceed |
| `/back-office` | Reusable Credits Platform console | `BackOfficeLayout` | Requires `menu:admin` |
| `/reusable-credits-console` | Compatibility route | Redirects to `/back-office` | Requires back-office session |
| `/credits-admin` | Legacy compatibility route | Redirects to `/back-office` | Requires back-office session |
| `/login` | usedCarPlatform product login | Product shell | Product users |
| `/workspace` | usedCarPlatform product workspace | Product shell | Product users |

## Demo Accounts

| Username | Password | Console Role | Expected Console Access |
| --- | --- | --- | --- |
| `developer` | `123456` | Developer | Can enter `/back-office`; can create Admin/Agent/User; can adjust points; can delete Admin/Agent/User |
| `admin` | `123456` | Company Admin | Can enter `/back-office`; can create/disable Agent; can read all balances/transactions; cannot adjust points; cannot create/delete regular User |
| `agent` | `123456` | Agent | Can enter `/back-office`; can create User when policy allows; can view only own customers/leads/tickets/settlements |
| `enterprise` | `123456` | Regular product user | Cannot enter `/back-office`; uses product pages only |

Regular Users do not log in to this console unless/until they become Agents.

## API Contract

All routes below are served under `/api/v1` and require `menu:admin` unless noted.

| Method + Path | Phase | Purpose | Role Scope |
| --- | --- | --- | --- |
| `GET /platform/dashboard` | 2/3 | Back-office dashboard metrics and source-of-truth notes | Developer/Admin global; Agent own scope |
| `POST /platform/users` | 0/3/4/5 | Create Admin/Agent/User according to hierarchy gates | Developer/Admin/Agent by capability |
| `DELETE /platform/users/:userId` | 0/4 | Delete/disable account by capability | Developer Admin/Agent/User; Admin Agent only |
| `POST /platform/credits/adjustments` | 0/3 | Manual point adjustment with append-only transaction | Developer only |
| `GET /platform/agents` | 4 | Local Agent management list with customer/lead/ticket counts | Developer/Admin |
| `GET /platform/agent/overview` | 5 | Agent workbench data | Agent own scope; Developer/Admin may inspect selected/first Agent |
| `POST /platform/agent/leads` | 5 | Create Agent lead/reporting row | Agent own scope; Developer/Admin can act for selected Agent |
| `POST /platform/agent/tickets` | 5 | Create support ticket | Agent own scope; Developer/Admin can act for selected Agent |
| `POST /platform/agent/settlements/:settlementId/confirm` | 5/6 | Confirm draft settlement bill | Agent own scope |
| `GET /platform/commission-policy` | 6 | Fixed MVP commission and settlement policy | Back-office roles |
| `GET /platform/integration-contract*` | existing | Application billing contract helpers | Back-office roles |

## Source Of Truth

Reusable Credits Platform owns:

- credit accounts
- credit balances
- credit transactions
- recharge products
- recharge/payment orders
- billing tasks

usedCarPlatform MVP backend currently owns temporary console operations tables:

- `application_customer_links`
- Agent/customer ownership is canonical in Credits Platform `agent_relations`.
- `agent_leads`
- `agent_support_tickets`
- `agent_commission_previews`
- `agent_settlement_bills`
- `agent_materials`

These local tables are the MVP back-office operational layer. They should be moved behind the reusable platform service boundary when Reusable Credits Platform becomes a separate production service.

## Seed Data Notes

Backend migrations seed:

- Developer/Admin/Agent demo roles and role permissions.
- Back-office policy defaults, including the corrected Admin no-point-adjust rule.
- Agent operations demo data:
  - one active Agent account
  - one usedCar customer relation
  - usedCarPlatform and clothing_ai lead examples
  - one draft settlement bill
  - commission preview data
  - support ticket and materials
- Flagship mother/child product accounts for shared-balance visibility checks.

Run from `backend/`:

```bash
npm run migrate
```

## PRD Traceability Matrix

| PRD Requirement | Implementation Signal | Status |
| --- | --- | --- |
| Independent Three-Role Back Office, not usedCar product page | `/back-office/login`, `/back-office`, `BackOfficeLayout`; product shell absent | Implemented |
| usedCarPlatform is one application under Reusable Credits Platform | App catalog/filter shows usedCarPlatform plus future `clothing_ai` | Implemented |
| One shared points balance across applications | Dashboard/API source-of-truth notes and docs state Reusable Credits Platform owns balances | Implemented |
| Developer can create Admin/Agent/User | `POST /platform/users`, Developer create buttons | Implemented |
| Admin can create/manage Agents, not regular Users | Admin page Agent table; no Create User button | Implemented |
| Agent can create Users when gates allow | Agent quick action and policy checks | Implemented |
| Developer-only point adjustment | Backend permission and UI gating; Admin direct call returns `403` | Implemented |
| Agent sees own customers/leads/settlements | Agent overview resolves to current Agent and own-scope tables | Implemented |
| Commission fixed at 10%, based on recharge | `GET /platform/commission-policy`; Agent rule cards | Implemented |
| Settlement monthly on 25th | `GET /platform/commission-policy`; Agent rule cards | Implemented |
| Every visible Agent action responds | Create User, report lead, create ticket, confirm settlement, detail modal, export feedback | Started |
| Full production CRUD for tenants/accounts/recharge orders | Not completed in this MVP slice | Future work |

## Local Review Checklist

Run these from repo root unless noted:

```bash
npm run typecheck
npm run build
cd backend && npm run typecheck
cd backend && npm run build
cd backend && npm run phase2:policy-test
cd backend && npm run phase4:user-api-test
cd backend && npm run phase7:integration-contract-test
```

Optional local DB/browser review:

```bash
cd backend && npm run migrate
cd backend && npm run dev
npm run dev -- --host 0.0.0.0
```

Browser smoke:

- Open `/back-office/login`.
- Developer login lands on `/back-office`; product shell is absent.
- Admin login shows Agent management, `创建 Agent`, and `禁用代理商`; it does not show `创建 User` or `增减积分`.
- Agent login shows `创建 User`, `报备线索`, `新建工单`, `确认结算`, `查看详情`, and `导出`; it does not show `增减积分`.
- Regular `enterprise` cannot enter `/back-office`.

## usedCarPlatform Impact

Product flows should remain unchanged:

- `/login`
- `/workspace`
- visual generation flows
- package/points pages

Shared files touched for this console are documented in `docs/usedcarplatform-impact-notes.md`.
