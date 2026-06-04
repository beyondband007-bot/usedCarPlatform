# Auth Login Demo Accounts

Status: Phase 1 updated for Reusable Credits Platform console
Date: 2026-06-04

## Scope

The current login is still development/demo auth. The Reusable Credits Platform console uses exactly three back-office roles:

- `developer`
- `admin`
- `agent`

The `enterprise` username is kept as the regular product-user login from the existing frontend. It is outside the Reusable Credits Platform console and cannot enter `/credits-admin` until it is promoted/opened as an agent account.

If a regular user should become an agent, the account must be opened or promoted by a back-office operator. After that role change, the same person logs in as an Agent and can enter the Reusable Credits Platform console.

| Username | Password | Role | Default Landing | Access |
| --- | --- | --- | --- | --- |
| `developer` | `123456` | Platform developer | `/credits-admin` | Can create Admins, Agents, and Users. Can toggle Admin and Agent creation permissions. |
| `admin` | `123456` | Company admin | `/credits-admin` | Can create Agents and Users while Developer allows it. Can toggle Agent user creation and User-to-Agent promotion. |
| `agent` | `123456` | Agent | `/credits-admin` | Agent back-office view only. Can create own customer accounts when Admin allows it unless Developer disables that policy. |
| `enterprise` | `123456` | Regular product user | `/workspace` | Normal workspace, credits, and recharge pages. No back-office access. |
| `flagship` | `123456` | Flagship mother account | `/workspace` | Normal product access. `enterpriseAccountRole` is `mother`; can view child transactions. |
| `flagship_sub_sales` | `123456` | Flagship child account | `/workspace` | Normal product access. `enterpriseAccountRole` is `child`; cannot view sibling/child transactions. |
| `flagship_sub_ops` | `123456` | Flagship child account | `/workspace` | Normal product access. `enterpriseAccountRole` is `child`; cannot view sibling/child transactions. |
| `flagship_sub_design` | `123456` | Flagship child account | `/workspace` | Normal product access. `enterpriseAccountRole` is `child`; cannot view sibling/child transactions. |

## Current Behavior

Login page:

```text
http://127.0.0.1:5173/login
```

The login panel provides quick mock-account buttons and still allows manual username/password entry.

Back-office access is protected by `menu:admin`. Only `developer`, `admin`, and `agent` can enter `/credits-admin`. The regular `enterprise` user does not have this permission and is redirected away from the console.

Inside `/credits-admin`, the available role switcher views are derived from the logged-in mock role:

- `developer`: can switch between developer, company admin, and agent views
- `admin`: can switch between company admin and agent views
- `agent`: can only see the agent view
- `enterprise`: cannot access `/credits-admin`

## Account Creation Rule

The Phase 1 account creation policy is reflected in demo permissions:

- `developer` has full Admin/Agent/User creation and deletion, all balance/transaction read, point adjustment, and account-policy management permissions
- `admin` has Agent/User creation and deletion, all balance/transaction read, point adjustment, Agent user-creation policy, and User-to-Agent promotion policy permissions
- `agent` has User creation plus balance/transaction read for Users it creates
- `enterprise` is a regular product user and does not have account creation permission

Role capability matrix:

| Role | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Developer | Admins, Agents, Users | All transactions and balances | Add/minus points | Admins, Agents, Users |
| Admin | Agents, Users | All transactions and balances | Add/minus points | Agents, Users |
| Agent | Users | Transactions and balances of Users it creates | None | None |

Account creation follows a two-level hierarchy:

- Developer can create Admins, Agents, and Users.
- Developer can turn Admin creation of Agents/Users on/off.
- Developer can disable Agent creation of Users as the top-level override.
- Admin can create Agents and Users while Developer allows it.
- Admin normally controls whether Agent can create Users.
- Admin can turn User-to-Agent promotion on/off.
- Agent can create Users when Admin allows it, unless Developer disables it.

Agent login creation is different from agent-created client accounts:

- `developer` may configure account-creation policy and create Admin/Agent/User accounts
- `admin` may create Agent/User accounts while enabled
- `admin` may configure the subordinate Agent user-creation gate and User-to-Agent promotion gate
- `agent` may create User accounts when Admin allows it and Developer has not disabled it
- `enterprise` remains a normal front-office user until a back-office operator changes its account category to Agent

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
