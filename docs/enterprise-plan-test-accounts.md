# Enterprise Plan Test Accounts

Date: 2026-06-01
Branch: `feat/reusable-credits-integration`
Run tag: `20260601-121917-4600bf`

This document records the shared database test accounts created for the three first-release enterprise plans and the verification result for each plan.

No secrets or database credentials are included in this document.

## Result

The seeded accounts work for all three plans through both layers:

- Reusable Credits Platform API
- usedCarPlatform backend proxy API

Each seeded user was able to:

- see the correct tenant credit account through `GET /me/accounts`
- see the same account through `GET /api/v1/credits/accounts`
- create a 30-point billing estimate
- freeze 30 points
- refund the frozen points
- read the resulting `estimate`, `freeze`, and `refund` ledger rows through `GET /api/v1/credits/transactions`

The refund step was used intentionally so the plan balances return to their original grant amount after testing.

## Plan Rules Checked

| Plan | Price | Granted points | Account rule | Backstage generation concurrency |
| --- | ---: | ---: | --- | --- |
| 企业基础档 | ¥980 | 20,000 | 1 account | 1 generation request |
| 企业团队档 | ¥3,980 | 100,000 | 1 account | 5 generation requests |
| 企业旗舰档 | ¥9,800 | 800,000 | 1 mother + 3 child users | 20 generation requests per user, 80 total if all 4 users work at the same time |

Source of first-release business constants:

```text
src/domain/enterprise-plans.ts
```

The Reusable Credits Platform recharge products were also checked:

| Recharge product | Amount | Points |
| --- | ---: | ---: |
| Enterprise Basic | 980.00 | 20000.0000 |
| Enterprise Team | 3980.00 | 100000.0000 |
| Enterprise Flagship | 9800.00 | 800000.0000 |

## Seeded Accounts

The test data uses tenant-scoped enterprise accounts. Basic and Team each have one owner user per tenant. Flagship has one mother user and three child users per tenant.

### 企业基础档

| Group | Tenant ID | Account ID | Balance | User ID | Email | Role |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| A | 2 | 5 | 20000.0000 | 15 | `usedcar-basic-a-owner-20260601-121917-4600bf@example.test` | owner |
| B | 3 | 6 | 20000.0000 | 16 | `usedcar-basic-b-owner-20260601-121917-4600bf@example.test` | owner |

Billing checks:

| Group | User ID | Billing task ID | Ledger types observed |
| --- | ---: | ---: | --- |
| A | 15 | 28 | `grant`, `estimate`, `freeze`, `refund` |
| B | 16 | 29 | `grant`, `estimate`, `freeze`, `refund` |

### 企业团队档

| Group | Tenant ID | Account ID | Balance | User ID | Email | Role |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| A | 4 | 7 | 100000.0000 | 17 | `usedcar-team-a-owner-20260601-121917-4600bf@example.test` | owner |
| B | 5 | 8 | 100000.0000 | 18 | `usedcar-team-b-owner-20260601-121917-4600bf@example.test` | owner |

Billing checks:

| Group | User ID | Billing task ID | Ledger types observed |
| --- | ---: | ---: | --- |
| A | 17 | 30 | `grant`, `estimate`, `freeze`, `refund` |
| B | 18 | 31 | `grant`, `estimate`, `freeze`, `refund` |

### 企业旗舰档

| Group | Tenant ID | Account ID | Balance | User ID | Email | Role |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| A | 6 | 9 | 800000.0000 | 19 | `usedcar-flagship-a-mother-20260601-121917-4600bf@example.test` | owner / mother |
| A | 6 | 9 | 800000.0000 | 20 | `usedcar-flagship-a-child1-20260601-121917-4600bf@example.test` | employee / child |
| A | 6 | 9 | 800000.0000 | 21 | `usedcar-flagship-a-child2-20260601-121917-4600bf@example.test` | employee / child |
| A | 6 | 9 | 800000.0000 | 22 | `usedcar-flagship-a-child3-20260601-121917-4600bf@example.test` | employee / child |
| B | 7 | 10 | 800000.0000 | 23 | `usedcar-flagship-b-mother-20260601-121917-4600bf@example.test` | owner / mother |
| B | 7 | 10 | 800000.0000 | 24 | `usedcar-flagship-b-child1-20260601-121917-4600bf@example.test` | employee / child |
| B | 7 | 10 | 800000.0000 | 25 | `usedcar-flagship-b-child2-20260601-121917-4600bf@example.test` | employee / child |
| B | 7 | 10 | 800000.0000 | 26 | `usedcar-flagship-b-child3-20260601-121917-4600bf@example.test` | employee / child |

Billing checks:

| Group | User ID | Billing task ID | Ledger types observed |
| --- | ---: | ---: | --- |
| A mother | 19 | 32 | `grant`, `estimate`, `freeze`, `refund` |
| A child 1 | 20 | 33 | `estimate`, `freeze`, `refund` |
| A child 2 | 21 | 34 | `estimate`, `freeze`, `refund` |
| A child 3 | 22 | 35 | `estimate`, `freeze`, `refund` |
| B mother | 23 | 36 | `grant`, `estimate`, `freeze`, `refund` |
| B child 1 | 24 | 37 | `estimate`, `freeze`, `refund` |
| B child 2 | 25 | 38 | `estimate`, `freeze`, `refund` |
| B child 3 | 26 | 39 | `estimate`, `freeze`, `refund` |

## Retest Examples

Use the tenant identity headers below to retest any seeded account through the usedCar proxy.

Basic A:

```sh
curl \
  -H "x-credits-user-id: 15" \
  -H "x-credits-account-scope: tenant" \
  -H "x-credits-tenant-id: 2" \
  http://127.0.0.1:3101/api/v1/credits/accounts
```

Team A:

```sh
curl \
  -H "x-credits-user-id: 17" \
  -H "x-credits-account-scope: tenant" \
  -H "x-credits-tenant-id: 4" \
  http://127.0.0.1:3101/api/v1/credits/accounts
```

Flagship A mother:

```sh
curl \
  -H "x-credits-user-id: 19" \
  -H "x-credits-account-scope: tenant" \
  -H "x-credits-tenant-id: 6" \
  http://127.0.0.1:3101/api/v1/credits/accounts
```

Flagship A child 1:

```sh
curl \
  -H "x-credits-user-id: 20" \
  -H "x-credits-account-scope: tenant" \
  -H "x-credits-tenant-id: 6" \
  http://127.0.0.1:3101/api/v1/credits/accounts
```

Transactions for the same identity:

```sh
curl \
  -H "x-credits-user-id: 20" \
  -H "x-credits-account-scope: tenant" \
  -H "x-credits-tenant-id: 6" \
  "http://127.0.0.1:3101/api/v1/credits/transactions?accountScope=tenant&creditsTenantId=6&limit=20"
```

## Important Implementation Notes

The balances and transaction ledgers tested above are real database-backed data in the Reusable Credits Platform.

The current Reusable Credits Platform schema does not yet have a first-class subscription table such as `enterprise_subscriptions` or `subscription_plan_assignments`. For this test run:

- plan identity is represented by tenant naming and `tenants.type`
- plan prices and granted points are represented by `recharge_products`
- plan display and concurrency rules are centralized in `src/domain/enterprise-plans.ts`
- tenant account membership is represented by `tenant_members`
- credit balances and ledgers are represented by `credit_accounts` and `credit_transactions`

This is enough to validate that the three plan balances and billing flows work for the first release. A later production hardening step should persist plan assignment and mother/child account hierarchy explicitly on the server side, especially if the team wants server-side enforcement of plan concurrency and server-side flagship mother-child transaction aggregation.

Current first-release enforcement split:

| Rule | Current source |
| --- | --- |
| Product price and granted points | Reusable Credits Platform `recharge_products` |
| Real balance and ledger changes | Reusable Credits Platform `credit_accounts`, `billing_tasks`, `credit_transactions` |
| Account count and concurrency display | `src/domain/enterprise-plans.ts` |
| Workspace concurrent task blocking | Frontend subscription store + workspace running task count |
| Flagship child account demo visibility | `src/domain/enterprise-account-hierarchy.ts` |

## Validation Commands Run

```sh
npm run typecheck
```

Result:

```text
used-car-platform typecheck passed
```

Live API/database seed-and-test run:

```text
Reusable Credits Platform health: passed
Recharge product checks: passed
Seeded enterprise plan tenants/accounts: passed
Credits /me/accounts visibility: passed
usedCar /api/v1/credits/accounts proxy visibility: passed
Billing estimate/freeze/refund for each seeded user: passed
usedCar /api/v1/credits/transactions ledger visibility: passed
```
