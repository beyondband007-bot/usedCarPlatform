# Reusable Credits Platform Console Executable Plan

Status: Phase 6 agent operations foundation implemented locally
Date: 2026-06-04
Route compatibility: `/credits-admin`

## Target

Move the current Three-Role Credits Back Office from a usedCarPlatform-owned admin page into a Reusable Credits Platform console.

usedCarPlatform is one integrated application. Future applications, such as `clothing_ai`, should register applications and billable functions through the same reusable credits platform.

Initial application catalog:

| Application | Status | Example functions |
| --- | --- | --- |
| `used-car-platform` | Integrated | `single_image_generate`, `batch_item_generate` |
| `clothing_ai` | Planned | `model_generate`, `try_on_generate`, `lifestyle_photo` |

## Account-Creation Rule

Developer can create Admins, Agents, and Users.

Developer can turn Admin creation of Agents and Users on/off.

Developer can disable Agent creation of Users as a top-level override.

Admin can create Agents and Users while Developer allows it.

Admin normally controls whether Agent can create Users.

Admin can turn User-to-Agent promotion on/off.

Agent can create Users when Admin allows it, unless Developer disables that ability. Users without becoming Agent cannot log in through the console.

Role capability matrix:

| Role | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Developer | Admins, Agents, Users | All transactions and balances | Add/minus points | Admins, Agents, Users |
| Admin | Agents, Users | All transactions and balances | Add/minus points | Agents, Users |
| Agent | Users | Transactions and balances of Users it creates | None | None |

This policy now has a backend schema, policy service foundation, session-backed RBAC gate, first unified user creation API, multi-application console data, and the first Agent operations API/UI foundation. Future phases still need frontend write forms for all writes, production tenant account creation, and full approval workflows.

## Phase 1: Console Foundation

Goal: rename and restructure the existing console foundation so the product direction is correct before production writes are added.

Deliverables:

- Keep `/credits-admin` as a compatibility route.
- Change visible UI language from usedCar admin to Reusable Credits Platform console.
- Add a multi-application catalog foundation.
- Add `clothing_ai` as a planned application with initial function examples.
- Add account-creation policy constants for Developer/Admin/Agent.
- Model the hierarchy: Developer -> Admin create Agent/User, Developer -> Agent create User, Admin -> Agent create User, Admin -> User becomes Agent.
- Update demo roles and permissions for Developer/Admin/Agent account creation.
- Seed backend app roles for `developer`, `admin`, and `agent`.
- Update account-creation docs to reflect Developer-controlled Admin/Agent permissions.

Exit check:

- Frontend typecheck passes.
- Backend typecheck passes.
- `/credits-admin` still loads through the existing route.
- Developer can see all role tabs.
- Admin can see Admin and Agent tabs.
- Agent can see only Agent.

## Phase 2: Backend Policy Schema

Goal: store and enforce account-creation policy in `credits_platform`.

Deliverables:

- Add `back_office_roles`.
- Add `back_office_role_assignments`.
- Add `back_office_permission_policies`.
- Add `account_creation_audit_logs`.
- Add migration tests for policy defaults.
- Add policy service with `canCreateUser(operator, targetScope)`.

Default policies:

- Developer create Admins/Agents/Users: enabled, not disableable.
- Admin create Agents/Users: enabled when Developer allows it.
- Agent create Users: enabled when Admin allows it, unless Developer disables it.
- User becomes Agent: enabled only when Admin allows it and Developer allows Admin Agent/User creation.

Implementation status:

- Backend migrations define the four policy/audit tables.
- Migration seeding inserts default back-office roles, default policies, and demo role assignments.
- `accountCreationPolicyService.canCreateUser(operator, targetScope)` resolves persisted policy rows with safe defaults.
- `npm run phase2:policy-test` verifies the default hierarchy and disabled-gate behavior.

## Phase 3: Production Auth And RBAC

Goal: stop trusting mock/query identity for back-office actions.

Deliverables:

- Resolve current operator from backend session/token.
- Add RBAC middleware for console routes.
- Remove body/query `currentUserId` trust from privileged routes.
- Add tests for forbidden Developer/Admin/Agent paths.

Implementation status:

- Added reusable backend auth/RBAC middleware.
- Added a back-office permission helper around `menu:admin`.
- Changed `GET /api/v1/credits/admin/overview` to require an authenticated session with `menu:admin`.
- Changed the console overview to derive credits identity from the authenticated backend user instead of query/body identity.
- Added `npm run phase3:rbac-test` to verify Developer/Admin/Agent can enter the console while regular enterprise users cannot.

## Phase 4: Unified User Creation API

Goal: create users from the reusable platform with application linkage.

Endpoint:

```http
POST /platform/users
```

Required behavior:

- Validate operator role and policy.
- Create or link credits user.
- Create personal or tenant credit account.
- Link user to application via `application_customer_links`.
- Link agent-created customers to agent relation.
- Write audit log.
- Use idempotency key for retries.

Implementation status:

- Added `POST /api/v1/platform/users`.
- Requires a logged-in back-office operator with `menu:admin`.
- Requires `idempotencyKey`, `targetRole`, `username`, and `password`.
- Validates Developer/Admin/Agent creation policy before writing.
- Creates an app user and role assignment.
- Ensures a personal credits user/account through the existing credits account linker.
- Writes `application_customer_links`.
- Writes `agent_customer_relations` when an Agent creates a User.
- Writes allowed and denied account-creation audit rows.
- Stores idempotent completed responses for same-key replay and rejects same-key request-hash conflicts.
- `npm run phase4:user-api-test` verifies the request contract and hash behavior.

Example request:

```http
POST /api/v1/platform/users
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "idempotencyKey": "create-user-demo-001",
  "targetRole": "user",
  "username": "demo_customer",
  "password": "123456",
  "displayName": "Demo Customer",
  "applicationCode": "used-car-platform"
}
```

## Phase 5: Multi-Application Console Data

Goal: replace usedCar-only overview with platform-wide views.

Deliverables:

- Application filter: All, usedCarPlatform, clothing_ai.
- Function pricing management per application.
- Account, transaction, recharge, and billing views by application.
- Cross-application customer profile.

Implementation status:

- `GET /api/v1/credits/admin/overview` now returns a platform application list, all available function pricing rows across registered applications, and planned `clothing_ai` function placeholders.
- Transactions are enriched with `applicationCode`, `applicationName`, `functionCode`, and `functionName` when the credits platform supplies application/function ids.
- The console has an application filter for All, usedCarPlatform, and clothing_ai.
- Developer function pricing and Admin transaction tables filter by selected application.
- Developer view now includes a cross-application customer profile table sourced from `application_customer_links`.
- `clothing_ai` appears as planned, not registered, until the reusable credits platform actually registers it.

## Phase 6: Agent Operations

Goal: complete agent-owned customer, commission, settlement, material, and ticket workflows.

Deliverables:

- Agent customer CRM.
- Agent-created user approval mode.
- Commission preview and settlement.
- Materials/training library.
- Support tickets.

Implementation status:

- Added local operational tables: `agent_leads`, `agent_commission_previews`, `agent_settlement_bills`, `agent_materials`, and `agent_support_tickets`.
- Seeded demo Agent operations data for the existing `agent` login, including a customer relation, two leads, a commission preview, a settlement draft, material rows, and an open ticket.
- Added `GET /api/v1/platform/agent/overview` for the Agent dashboard, CRM customers, leads, commission previews, settlement bills, materials, and tickets.
- Added first write endpoints: `POST /api/v1/platform/agent/leads`, `POST /api/v1/platform/agent/tickets`, and `POST /api/v1/platform/agent/settlements/:settlementId/confirm`.
- Agent users can only see/write their own Agent operations data. Developer/Admin users can inspect an Agent view, defaulting to the first active Agent assignment for demo review.
- Replaced the Agent tab placeholders with live operational tables filtered by All, usedCarPlatform, or clothing_ai.

## Phase 7: Application Integration SDK/Contract

Goal: make future applications easy to add.

Deliverables:

- Application onboarding checklist.
- Function registration contract.
- Billing lifecycle examples.
- Seed script pattern for `clothing_ai`.
- Integration tests using usedCarPlatform and clothing_ai fixtures.

Implementation status:

- Added an executable application integration contract module for `used-car-platform` and planned `clothing_ai`.
- Added contract review endpoints under `GET /api/v1/platform/integration-contract`.
- Added seed payload and billing lifecycle example builders for future application onboarding.
- Updated credits function registration to accept an explicit `applicationCode`, while preserving the existing usedCarPlatform default.
- Added `npm run phase7:integration-contract-test` to verify application/function codes, lifecycle steps, seed payloads, and idempotency key patterns.
- Added `npm run print:application-contract-seed -- clothing_ai` to print the planned `clothing_ai` seed payload and billing example.
- Documented the app onboarding checklist and function registration contract in `docs/reusable-credits-application-integration-contract.md`.
