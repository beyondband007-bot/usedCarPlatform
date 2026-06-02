# First Release Account Creation Policy

Status: implemented in the back-office UI
Date: 2026-06-01
Commit: `5aa2c73`

## Decision

For the first release, every user/customer account must be created by platform owner roles:

- developer
- company admin

Agents cannot create client login accounts in the first release.

This keeps the first launch operationally safer while real authentication, tenant membership validation, approval history, and audit trails are still being finalized.

## Regular User To Agent Login

A regular product user can become an agent login only through the Three-Role Credits Back Office.

Allowed operator roles:

- developer
- company admin

Not allowed:

- regular users cannot self-upgrade from the front-office login
- agents cannot create or promote agent/client login accounts in the first release

In the current mock/demo setup, `enterprise` represents a regular product user and `agent` represents an already-opened agent login. Production should implement this as an audited role/category change, not as a front-office registration shortcut.

## Current Implementation

The policy is represented in the usedCarPlatform frontend through:

- `src/policies/accountProvisioning.ts`
- `src/pages/credits-admin/index.vue`
- `src/mock/mock-auth.ts`

The mock admin account has the platform account creation permission:

```text
account:create:platform
```

In `/credits-admin`:

- developer and company admin views show user/customer account creation as a platform-owner responsibility
- developer and company admin views show that regular users can be opened as agents from agent management
- agent views show client account creation as a disabled future action
- disabled agent actions explain that first release account creation belongs to platform developer/admin users

The current account creation buttons remain non-mutating because production user/account creation APIs are not implemented in usedCarPlatform yet.

## Why Agents Are Disabled In First Release

Agent-side client account creation needs more than a UI button. Before it is safe to enable, the system should know and store:

- which agent created the account
- which tenant/customer owns the account
- whether the agent is approved and active
- whether the created client account needs platform approval
- who approved or rejected the request
- the audit reason and timestamp
- the resulting credit account scope and ownership

Until those backend and audit rules exist, agents should submit customer information or leads, and platform owner roles should create the actual login accounts.

For regular-user-to-agent conversion, production should record:

- original user id
- target agent id or generated agent profile id
- operator user id and role
- approval status
- agent level, commission ratio, settlement profile, and effective date
- audit reason and timestamp

## Future Agent-Created Account Flow

A later release can allow agents to create client accounts through a controlled approval workflow:

1. Agent submits client account request.
2. System stores the request as pending.
3. Developer/admin reviews the request.
4. Approved request creates the user, tenant/member relation, credit account, and agent relation.
5. Rejected request stores rejection reason.
6. All changes are audit logged.

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
5. Switch to `代理商` and confirm client account creation is disabled and marked as future.

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
