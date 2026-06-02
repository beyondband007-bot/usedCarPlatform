# Phase 4: usedCarPlatform Backend Credits Client

Status: implemented
Date: 2026-05-30

## Purpose

Connect usedCarPlatform backend task creation to Reusable Credits Platform billing APIs.

This phase covers single-generation modules only. Batch billing and final success/failure settlement polling are handled in later phases.

## Runtime Switch

Credits billing is controlled by backend environment variables:

```env
CREDITS_PLATFORM_ENABLED=false
CREDITS_PLATFORM_BASE_URL=http://127.0.0.1:3000
CREDITS_APPLICATION_CODE=used-car-platform
CREDITS_DEFAULT_USER_ID=
CREDITS_DEFAULT_ACCOUNT_SCOPE=personal
CREDITS_DEFAULT_TENANT_ID=
CREDITS_REQUEST_TIMEOUT_MS=8000
```

When `CREDITS_PLATFORM_ENABLED=false`, existing generation behavior is preserved and no billing calls are made.

When `CREDITS_PLATFORM_ENABLED=true`, task creation requires a credits user identity from request headers, request body, or dev fallback env.

## Temporary Billing Identity

Until real login/session data exists, task creation resolves billing identity in this order:

1. Request headers:
   - `x-credits-user-id`
   - `x-user-id`
   - `x-credits-account-scope`
   - `x-credits-tenant-id`
2. Request body:
   - `creditsUserId` or `userId`
   - `accountScope`
   - `creditsTenantId` or `tenantId`
3. Environment fallback:
   - `CREDITS_DEFAULT_USER_ID`
   - `CREDITS_DEFAULT_ACCOUNT_SCOPE`
   - `CREDITS_DEFAULT_TENANT_ID`

## Billing Flow

For registered single-generation modules:

```text
create local generation_tasks row
-> POST /billing/estimate
-> update local billing fields to estimated
-> POST /billing/freeze
-> update local billing fields to frozen
-> submit KIE task
-> if KIE submit fails, POST /billing/refund
```

Currently wired modules:

- `showroom-light`
- `outdoor-scene`
- `road-motion`
- `sky-studio`
- `paint-refresh`
- `light-consistency`
- `interior-clean`
- `watermark-remove`

`creative-image`, `short-video`, and batch modules are not wired in this phase because their function pricing/flow needs separate product confirmation.

## Local Traceability

The backend writes the following `generation_tasks` fields:

- `credits_user_id`
- `credits_tenant_id`
- `account_scope`
- `billing_task_id`
- `billing_status`
- `estimated_points`
- `settled_points`

## Verification Performed

- Backend typecheck
- Frontend typecheck
- MySQL migration with shared local `.env`
- Credits seed script for `used-car-platform`
- Smoke test without KIE:
  - create throwaway local generation task
  - estimate/freeze through Reusable Credits Platform
  - refund through Reusable Credits Platform
  - confirm usedCar billing fields are updated locally
