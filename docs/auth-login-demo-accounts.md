# Auth Login Demo Accounts

Status: implemented for local release/demo testing
Date: 2026-06-01

## Scope

The current login is still frontend mock auth. It is role-complete for the first release demo and uses exactly three platform roles:

- `developer`
- `admin`
- `agent`

The `enterprise` username is kept only as a compatibility login alias from the existing frontend. It is categorized internally as the `agent` role.

| Username | Password | Role | Default Landing | Access |
| --- | --- | --- | --- | --- |
| `developer` | `123456` | Platform developer | `/credits-admin` | Full back-office role review: developer, company admin, agent. |
| `admin` | `123456` | Company admin | `/credits-admin` | Company admin and agent back-office views. Can create platform accounts in first release policy. |
| `agent` | `123456` | Agent | `/credits-admin` | Agent back-office view only. Cannot create client login accounts yet. |
| `enterprise` | `123456` | Agent alias | `/credits-admin` | Compatibility username; same lower-level role and permissions as `agent`. |

## Current Behavior

Login page:

```text
http://127.0.0.1:5173/login
```

The login panel provides quick mock-account buttons and still allows manual username/password entry.

Back-office access is protected by `menu:admin`. `developer`, `admin`, `agent`, and the compatibility `enterprise` login can enter `/credits-admin`, but the visible back-office role views are restricted by the internal role.

Inside `/credits-admin`, the available role switcher views are derived from the logged-in mock role:

- `developer`: can switch between developer, company admin, and agent views
- `admin`: can switch between company admin and agent views
- `agent`: can only see the agent view
- `enterprise`: uses the internal `agent` role and can only see the agent view

## First Release Account Creation Rule

The first release account creation policy is also reflected in mock permissions:

- `developer` has `account:create:platform`
- `admin` has `account:create:platform`
- `agent` does not have account creation permission
- `enterprise` is treated as `agent` and does not have account creation permission

Agent-side client account creation is shown as a disabled future action in the back-office UI.

## Production Gap

This is not the final production authentication system.

Production still needs:

- backend login/session API
- password hashing and credential storage
- server-side role and permission validation
- tenant membership checks
- secure token/session expiration
- audit logging for account creation and role changes

The current implementation completes the local demo/mock login behavior so team members can test the first release flows consistently.
