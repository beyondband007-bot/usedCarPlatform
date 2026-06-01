# Phase 11: End-To-End Testing

Status: done
Branch: `feat/reusable-credits-integration`
Tag: `phase-11-e2e-testing-20260601`

## Goal

Phase 11 makes the integration testable by the team before handoff.

It adds a repeatable local smoke runner for the usedCar backend and Reusable Credits Platform boundary, then records the manual checklist and known limitations that should be reviewed before PR approval.

## Automated Smoke Runner

The usedCar backend now includes:

```bash
cd backend
npm run phase11:smoke
```

The runner is intentionally local-development only. It loads `backend/.env`, talks to the running credits platform and usedCar backend, and writes disposable `phase11_*` rows into the local demo databases.

It verifies:

- credits platform health
- usedCar backend health
- usedCar credit proxy account list
- usedCar credit proxy recharge products
- payment order creation through the usedCar proxy
- credits admin overview through the usedCar proxy
- single generation success settles credits
- single generation failure refunds credits
- batch mixed success/failure settles and refunds per item
- insufficient balance blocks KIE submission

The script does not call real KIE. For terminal billing tests, it creates local generation-task rows with already-terminal statuses and lets the existing usedCar task-detail and batch-detail endpoints trigger finalization.

For the insufficient-balance check, it temporarily raises the `showroom-light` function price in the credits platform, calls the real usedCar task-create endpoint, asserts the request fails with HTTP `402`, verifies no KIE task was submitted, and restores the original price in a `finally` block.

## Local Setup

From the Reusable Credits Platform repo:

```bash
docker compose up -d mysql
npm run db:migrate
npm run seed:used-car:demo
npm run dev
```

From the usedCar backend repo:

```bash
cd backend
npm run migrate
npm run dev
```

Then in another usedCar backend terminal:

```bash
cd backend
npm run phase11:smoke
```

Default local URLs:

- Reusable Credits Platform: `http://127.0.0.1:3000`
- usedCar backend: `http://127.0.0.1:3101`

The smoke identity defaults to credits user `4`, personal account scope. It can be overridden without committing secrets:

```bash
PHASE11_CREDITS_USER_ID=4
PHASE11_ACCOUNT_SCOPE=personal
PHASE11_CREDITS_TENANT_ID=4
PHASE11_USEDCAR_BASE_URL=http://127.0.0.1:3101
```

## Verification Run

Run date: 2026-06-01

Command:

```bash
cd backend
npm run phase11:smoke
```

Result:

```text
Phase 11 smoke passed: 10 checks, runId=phase11_20260601011736_35647650
```

Passed checks:

- credits health
- usedCar health
- proxy accounts
- proxy recharge products
- payment order creation
- admin overview
- single success settles
- single failure refunds
- batch mixed settle/refund
- insufficient balance blocks KIE submission

Additional checks completed:

- usedCar frontend production build
- usedCar backend typecheck

## Manual Checklist

Use this after a fresh seed and smoke run:

1. Open the usedCar frontend and log in with the Phase 10 mock personal identity.
2. Confirm the header credit balance loads from the proxy account API.
3. Open the credits page and confirm transaction rows include recent `phase11_*` estimate, freeze, settle, and refund entries.
4. Open the recharge page and confirm products load from the credits platform.
5. Create a recharge order and confirm the order remains pending.
6. Open the credits admin console and confirm applications, functions, accounts, recharge products, and recent transactions load.
7. Confirm the admin console shows activity produced by the Phase 11 smoke run.
8. Repeat login with the tenant mock identity if tenant-scope testing is needed.

## Known Limitations

The smoke runner does not test real image upload or real KIE execution. It tests the billing lifecycle around already-terminal usedCar tasks so the result is deterministic and does not spend KIE quota.

The payment order test stops at pending order creation. Signed provider callback and actual credit recharge are covered inside the Reusable Credits Platform tests and should be tested separately when payment provider integration is finalized.

The identity remains a Phase 10 mock identity. Production work must still derive credits identity from real usedCar auth/session data and validate tenant membership.

The smoke runner leaves `phase11_*` records in local development databases. This is intentional for admin-console inspection, but the script should not be pointed at production data.
