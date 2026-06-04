# Account Creation Policy

Status: Phase 3 first backend RBAC slice implemented
Date: 2026-06-04

## Decision

The Reusable Credits Platform console supports account creation from all three back-office roles:

- Developer can create Admins, Agents, and Users.
- Admin can create Agents and Users.
- Agent can create Users.

Developer can turn Admin creation of Agents/Users on/off. Developer can also turn Agent creation of Users on/off as the top-level Agent gate.

Admin can turn Agent creation of Users on/off as the subordinate Agent gate. Admin can also turn User-to-Agent promotion on/off. Agent User creation is effectively enabled only when both Developer and Admin allow it.

Developer creation of Admins, Agents, and Users remains always enabled.

This moves account provisioning out of usedCarPlatform-specific rules and into reusable platform policy. Phase 2 adds backend policy tables and a policy decision service. Phase 3 starts session-backed RBAC by protecting the console overview endpoint; production work must still connect policy decisions to authenticated write APIs and audit every account creation.

## Regular User To Agent Login

A regular product user cannot log in through this console while they remain a regular User. A regular User can become an Agent only through a back-office role/category change. After promotion, that person logs in as Agent and can enter the Reusable Credits Platform console.

Allowed operator roles:

- developer
- company admin
- agent, for creating Users only, if Developer and Admin both enable agent-side User creation

Not allowed:

- regular users cannot self-upgrade from the front-office login
- regular users cannot log in to the console unless/until they become Agents
- disabled Admin/Agent creation policy must block account creation server-side
- Agent account creation must be blocked if either Developer's Agent gate or Admin's Agent gate is off

In the current mock/demo setup, `enterprise` represents a regular product user and `agent` represents an already-opened agent login. Production should implement this as an audited role/category change, not as a front-office registration shortcut.

## Current Implementation

The policy is represented in the frontend through:

- `src/policies/accountProvisioning.ts`
- `src/pages/credits-admin/index.vue`
- `src/mock/mock-auth.ts`

The backend Phase 2 policy foundation is represented through:

- `backend/src/db/migrations.ts`
- `backend/src/db/migrate.ts`
- `backend/src/modules/platform/accountCreationPolicyDefaults.ts`
- `backend/src/modules/platform/accountCreationPolicyService.ts`
- `backend/src/modules/platform/accountCreationPolicyDefaults.test.ts`

The demo permissions are:

```text
developer: account:create:admin, account:create:agent, account:create:user, policy:account-creation:manage
admin: account:create:agent, account:create:user, policy:agent-user-creation:manage, policy:user-agent-promotion:manage
agent: account:create:user
```

In `/credits-admin`:

- developer view shows Developer creation of Admin/Agent/User and toggles for Admin Agent/User creation plus Agent User creation
- admin view shows Admin creation of Agent/User and toggles for Agent User creation plus User-to-Agent promotion
- agent view shows User creation as enabled only when both Developer and Admin gates are on

The current account creation surfaces remain non-mutating because production user/account creation APIs are not implemented yet.

Backend default-policy verification:

```bash
npm run phase2:policy-test
npm run phase3:rbac-test
```

## Why Creation Uses A Hierarchy

Admin and Agent account creation needs more than a UI button. The hierarchy should be persisted and audited:

- Developer always can create users.
- Developer always can create Admins, Agents, and Users.
- Developer controls whether Admin can create Agents and Users.
- Developer controls whether Agent can create Users.
- Admin can create Agents and Users while Developer allows it.
- Admin controls whether Agents under the Admin/operation scope can create Users.
- Admin controls whether a User can become an Agent.
- Effective Agent permission is Developer Agent gate AND Admin Agent gate.

Before it is safe to enforce in production, the system should know and store:

- which role created the account
- which operator created the account
- which tenant/customer owns the account
- whether the agent is approved and active
- whether the created client account needs platform approval
- who approved or rejected the request
- the audit reason and timestamp
- the resulting credit account scope and ownership

For regular-user-to-agent conversion, production should record:

- original user id
- target agent id or generated agent profile id
- operator user id and role
- approval status
- agent level, commission ratio, settlement profile, and effective date
- audit reason and timestamp

## Production Account-Creation Flow

Production should create accounts through a controlled workflow:

1. Developer configures Admin Agent/User creation and Agent User creation top-level policy.
2. Developer/Admin/Agent submits account creation.
3. Admin configures Agent User creation and User-to-Agent promotion policy.
4. Backend checks role, hierarchy policy, tenant/application scope, and agent status.
5. Optional approval stores the request as pending.
6. Approved or immediate creation creates the user, tenant/member relation, credit account, application link, and agent relation when applicable.
7. Rejected request stores rejection reason.
8. All changes are audit logged.

Suggested future database/API concepts:

- `account_creation_requests`
- `agent_onboarding_requests`
- `created_by_user_id`
- `created_by_role`
- `approved_by_user_id`
- `approval_status`
- `approval_reason`
- `agent_relation_id`

## How To Review

1. Log in as `admin`.
2. Open `/credits-admin`.
3. Switch to `开发者` and confirm account creation actions are visible.
4. Switch to `公司管理员` and confirm account creation actions are visible.
5. Switch to `代理商` and confirm client account creation is shown as Developer + Admin controlled.

Local login:

```text
http://127.0.0.1:5173/login
username: admin
password: 123456
```

## Related Docs

- [Three-role credits back office](./reusable-credits-three-role-back-office.md)
- [Integration verification report](./reusable-credits-integration-verification-report.md)
- [集成验证报告中文版](./reusable-credits-integration-verification-report.zh-CN.md)
