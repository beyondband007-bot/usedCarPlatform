# Enterprise Plan Business Logic

Status: implemented for first release
Date: 2026-06-01

## Purpose

The first-release enterprise plan rules are centralized so later changes do not require editing multiple pages.

Canonical usedCar frontend source:

```text
src/domain/enterprise-plans.ts
```

Reusable Credits Platform seed source:

```text
scripts/seed-used-car-platform.cjs
```

## First-Release Plans

| Plan | Price | Accounts | Gift Points | Capacity Description |
| --- | ---: | ---: | ---: | --- |
| 企业基础档 | ¥980 | 1 个账号 | 20,000 | 可生成 500 张图，约 50-80 辆车；后台可执行 1 套图（10 张外观图） |
| 企业团队档 | ¥3,980 | 1 个账号 | 100,000 | 可生成 2,500 张图，约 250-300 辆车；可同时执行 5 套图 |
| 企业旗舰档 | ¥9,800 | 1 + 3 个账号 | 800,000 | 可生成 15,000 张图，约 1,500 辆车；每个账号可同时执行 20 套图 |

## Flagship Mother/Child Account Rule

企业旗舰档 includes:

- 1 mother account
- 3 child accounts

First-release visibility rule:

- the mother account can view its own points and transactions
- the mother account can also view all 3 child accounts' points and transactions
- each child account is shown as a separate account in the credits page
- regular/basic/team plans do not get child-account visibility

Canonical usedCar frontend source:

```text
src/domain/enterprise-account-hierarchy.ts
```

Current implementation scope:

- the rule is implemented in frontend business logic for the credits page
- child account rows and transactions are local first-release demo/business logic
- production backend still needs persisted account hierarchy, server-side permission checks, and ledger queries across mother/child accounts

## Used By

The centralized plan module feeds:

- pricing page plan cards
- package/points recharge cards
- mock subscription state
- mock recharge orders
- mock points defaults
- batch-workbench concurrency display
- flagship mother/child account visibility in the credits page

The Reusable Credits Platform seed was also updated so real local payment orders grant the same first-release points as the frontend plan display.

## Later Modification Rule

When business changes plan price, points, account count, image estimate, or concurrency, update `src/domain/enterprise-plans.ts` first.

If the change affects real recharge/payment behavior, also update the Reusable Credits Platform recharge product seed and rerun:

```bash
cd "/Users/shenghangwang/Documents/Reusable Credits Platform"
npm run seed:used-car:demo
```

When changing account hierarchy behavior, update `src/domain/enterprise-account-hierarchy.ts` first. Production should later mirror this rule in backend RBAC and account-query APIs.
