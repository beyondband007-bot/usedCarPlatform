# Auth Login Demo Accounts

Status: implemented for local release/demo testing
Date: 2026-06-01

## Scope

The current login is still frontend mock auth. The Three-Role Credits Back Office uses exactly three back-office roles:

- `developer`
- `admin`
- `agent`

The `enterprise` username is kept as the regular product-user login from the existing frontend. It is outside the Three-Role Credits Back Office and cannot enter `/credits-admin`.

| Username | Password | Role | Default Landing | Access |
| --- | --- | --- | --- | --- |
| `developer` | `123456` | Platform developer | `/credits-admin` | Full back-office role review: developer, company admin, agent. |
| `admin` | `123456` | Company admin | `/credits-admin` | Company admin and agent back-office views. Can create platform accounts in first release policy. |
| `agent` | `123456` | Agent | `/credits-admin` | Agent back-office view only. Cannot create client login accounts yet. |
| `enterprise` | `123456` | Regular product user | `/workspace` | Normal workspace, credits, and recharge pages. No back-office access. |

## Current Behavior

Login page:

```text
http://127.0.0.1:5173/login
```

The login panel provides quick mock-account buttons and still allows manual username/password entry.

Back-office access is protected by `menu:admin`. Only `developer`, `admin`, and `agent` can enter `/credits-admin`. The regular `enterprise` user does not have this permission and is redirected away from the back office.

Inside `/credits-admin`, the available role switcher views are derived from the logged-in mock role:

- `developer`: can switch between developer, company admin, and agent views
- `admin`: can switch between company admin and agent views
- `agent`: can only see the agent view
- `enterprise`: cannot access `/credits-admin`

## First Release Account Creation Rule

The first release account creation policy is also reflected in mock permissions:

- `developer` has `account:create:platform`
- `admin` has `account:create:platform`
- `agent` does not have account creation permission
- `enterprise` is a regular product user and does not have account creation permission

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
