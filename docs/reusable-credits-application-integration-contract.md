# Reusable Credits Application Integration Contract

Status: Phase 7 application integration contract implemented
Date: 2026-06-04

## Purpose

This contract makes usedCarPlatform one integrated application of the Reusable Credits Platform, and gives future applications such as `clothing_ai` the same onboarding path.

The executable source of truth in this repository is:

- `backend/src/modules/platform/applicationIntegrationContract.ts`
- `backend/src/modules/platform/applicationIntegrationContract.test.ts`
- `backend/scripts/print-application-contract-seed.ts`

## Application Fixtures

Current fixtures:

| Application | Status | Functions |
| --- | --- | --- |
| `used-car-platform` | integrated | existing visual workbench function catalog |
| `clothing_ai` | planned | `model_generate`, `try_on_generate`, `lifestyle_photo` |

## Back-Office Review API

Developer/Admin/Agent console users can inspect the contract through the usedCar backend proxy boundary:

```http
GET /api/v1/platform/integration-contract
GET /api/v1/platform/integration-contract/:applicationCode
GET /api/v1/platform/integration-contract/:applicationCode/seed-payload
GET /api/v1/platform/integration-contract/:applicationCode/billing-example/:functionCode
```

These endpoints require `menu:admin` because they are part of the Reusable Credits Platform console.

## Onboarding Checklist

1. Register one application code in Reusable Credits Platform.
2. Register every billable function code with charge mode and default points.
3. Derive credits user, tenant, and account scope from authenticated product identity.
4. Estimate and freeze before starting external generation work.
5. Settle exactly once on successful terminal result.
6. Refund exactly once on failed or canceled terminal result.
7. Persist `billingTaskId`, `billingStatus`, `estimatedPoints`, and `settledPoints` in the product database.
8. Use deterministic idempotency keys for every billing operation.

## Function Registration Contract

Each function registration payload uses:

```json
{
  "code": "model_generate",
  "name": "Model Generate",
  "description": "Generate virtual model imagery for apparel assets.",
  "chargeMode": "estimate_required",
  "defaultPoints": "0",
  "status": "active"
}
```

Function code rules are enforced by the Phase 7 test:

- lowercase letters, numbers, hyphens, or underscores
- 3 to 80 characters
- unique within one application

## Billing Lifecycle

The product application must not start external generation work until estimate and freeze succeed.

```http
POST /billing/estimate
POST /billing/freeze
POST /billing/settle
POST /billing/refund
```

Idempotency key pattern:

```text
estimate:<bizType>:<bizId>
freeze:<bizType>:<bizId>
settle:<bizType>:<bizId>
refund:<bizType>:<bizId>
```

For usedCarPlatform the default `bizType` is `generation_task`.

For `clothing_ai` the default `bizType` is `clothing_generation_task`.

## clothing_ai Seed Pattern

Print the seed and lifecycle example:

```bash
cd backend
npm run print:application-contract-seed -- clothing_ai
```

Validate the executable contract:

```bash
cd backend
npm run phase7:integration-contract-test
```

## Current Limits

The contract and review API are implemented in usedCarPlatform so frontend and future application teams can align now. Production registration still needs the Reusable Credits Platform service to create the real `applications` and `application_functions` rows for `clothing_ai`.
