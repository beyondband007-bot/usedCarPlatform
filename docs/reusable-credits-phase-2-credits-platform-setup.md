# Phase 2: Credits Platform Setup

Status: implemented in Reusable Credits Platform
Date: 2026-05-30

## Where This Work Lives

Phase 2 was implemented in the separate Reusable Credits Platform repository because that service owns applications, functions, recharge products, users, accounts, and ledgers.

Repository:

```text
https://github.com/ShenghangWang/Reusable-Credits-Platform
```

Branch:

```text
feat/used-car-platform-phase-2-setup
```

Commit and tag:

```text
caac450 feat: add used car platform credit seed setup
phase-2-used-car-credits-setup-20260530
```

## Purpose

Prepare Reusable Credits Platform so usedCarPlatform can call billing APIs without hardcoding prices or credit ledger logic locally.

## Added Setup Script

The credits platform now has a repeatable seed script:

```sh
npm run seed:used-car
```

For local smoke tests with demo user/account data:

```sh
npm run seed:used-car:demo
```

The script registers:

- usedCarPlatform application
- billable used-car functions
- recharge products
- optional demo user, tenant, and credit accounts

## Registered Application

```text
applicationCode: used-car-platform
```

## Registered Functions

| Function code | Default points | Usage |
| --- | ---: | --- |
| `showroom-light` | `15.0000` | Single exterior image generation |
| `outdoor-scene` | `15.0000` | Single exterior image generation |
| `road-motion` | `15.0000` | Single exterior image generation |
| `sky-studio` | `15.0000` | Single exterior image generation |
| `paint-refresh` | `15.0000` | Single image enhancement |
| `light-consistency` | `15.0000` | Single image enhancement |
| `interior-clean` | `15.0000` | Single interior image generation |
| `watermark-remove` | `15.0000` | Single image enhancement |
| `batch-new-exterior` | `120.0000` | One exterior item in a batch task |
| `batch-new-interior` | `120.0000` | One interior item in a batch task |

Pricing is stored centrally in Reusable Credits Platform `application_functions.default_points`.

## Recharge Products

Phase 2 also seeds local recharge products for usedCarPlatform testing:

| Product | Amount | Points |
| --- | ---: | ---: |
| Enterprise Basic | CNY 980.00 | `20000.0000` |
| Enterprise Team | CNY 3980.00 | `100000.0000` |
| Enterprise Flagship | CNY 9800.00 | `800000.0000` |

These are setup values for integration testing and can be adjusted in the credits platform without changing usedCarPlatform billing workflow code.

## Demo Data

The optional demo seed creates:

```text
used-car-demo@example.com
Used Car Demo Tenant
startingBalance: 1250.0000
```

Do not put real secrets or shared `.env` values in GitHub docs. Local database credentials remain in ignored environment files only.

## Verification Performed

In Reusable Credits Platform:

- typecheck
- lint
- unit tests
- integration tests
- PostgreSQL migrations
- `npm run seed:used-car:demo`
- billing API smoke checks for estimate, freeze, settle, and refund

## Why This Note Exists In usedCarPlatform

The code changes for Phase 2 belong in Reusable Credits Platform, but the usedCarPlatform integration branch should still show that Phase 2 is complete. This note gives reviewers a visible pointer from the usedCarPlatform branch to the credits-platform setup work.
