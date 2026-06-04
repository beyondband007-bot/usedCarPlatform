# Reusable Credits Platform Console Executable Plan

Status: Phase 3 first backend RBAC slice implemented locally
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

Developer can turn Agent creation of Users on/off as the top-level Agent gate.

Admin can create Agents and Users while Developer allows it.

Admin can turn Agent creation of Users on/off as the subordinate Agent gate.

Admin can turn User-to-Agent promotion on/off.

Agent can create Users only when both Developer and Admin Agent gates are on. Users without becoming Agent cannot log in through the console.

This policy now has a backend schema, policy service foundation, and the first session-backed RBAC gate for the console overview endpoint. Phase 3 still needs to apply the same operator identity pattern to future write APIs as they are added.

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
- Agent create Users: enabled only when Developer Agent gate and Admin Agent gate are both enabled.
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

## Phase 5: Multi-Application Console Data

Goal: replace usedCar-only overview with platform-wide views.

Deliverables:

- Application filter: All, usedCarPlatform, clothing_ai.
- Function pricing management per application.
- Account, transaction, recharge, and billing views by application.
- Cross-application customer profile.

## Phase 6: Agent Operations

Goal: complete agent-owned customer, commission, settlement, material, and ticket workflows.

Deliverables:

- Agent customer CRM.
- Agent-created user approval mode.
- Commission preview and settlement.
- Materials/training library.
- Support tickets.

## Phase 7: Application Integration SDK/Contract

Goal: make future applications easy to add.

Deliverables:

- Application onboarding checklist.
- Function registration contract.
- Billing lifecycle examples.
- Seed script pattern for `clothing_ai`.
- Integration tests using usedCarPlatform and clothing_ai fixtures.
