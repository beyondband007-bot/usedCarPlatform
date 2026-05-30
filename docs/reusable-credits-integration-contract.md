# Reusable Credits Integration Contract

Status: Phase 1 agreed contract
Date: 2026-05-30
Branch: feat/reusable-credits-integration

## Goal

Integrate usedCarPlatform with the Reusable Credits Platform so usedCarPlatform can use real credit balances, recharge products, billing tasks, and credit ledgers without reimplementing billing logic in the used-car service.

## Architecture Decision

The first integration phase will keep two services and two databases.

| Domain | Owner |
| --- | --- |
| Users, tenants, tenant members | Reusable Credits Platform |
| Credit accounts, balances, locks | Reusable Credits Platform |
| Recharge products and payment orders | Reusable Credits Platform |
| Billing estimate, freeze, settle, refund | Reusable Credits Platform |
| Credit transaction ledger | Reusable Credits Platform |
| Vehicle image assets | usedCarPlatform |
| Generation tasks and KIE task records | usedCarPlatform |
| Batch tasks and batch items | usedCarPlatform |
| Delivery assets and packages | usedCarPlatform |

usedCarPlatform will call the Reusable Credits Platform through HTTP APIs. It will store external billing references, but it will not calculate balances or write credit ledger rows locally.

## Identity Contract

Reusable Credits Platform user IDs are the source of truth for billing identity.

usedCarPlatform requests that create billable work must carry:

- `userId`: Reusable Credits Platform user ID.
- `accountScope`: `personal` or `tenant`.
- `tenantId`: required only when `accountScope` is `tenant`.

The current hardcoded `default_user` behavior in usedCarPlatform remains only as a local development fallback until real user context is wired in. It must not be treated as the final billing identity.

## Application And Function Contract

The credits platform will register usedCarPlatform as one application.

```text
applicationCode: used-car-platform
```

Initial billable functions:

| usedCar module | credits functionCode |
| --- | --- |
| showroom-light | showroom-light |
| outdoor-scene | outdoor-scene |
| road-motion | road-motion |
| sky-studio | sky-studio |
| paint-refresh | paint-refresh |
| light-consistency | light-consistency |
| interior-clean | interior-clean |
| watermark-remove | watermark-remove |
| batch-new exterior item | batch-new-exterior |
| batch-new interior item | batch-new-interior |

Pricing is configured in Reusable Credits Platform through `application_functions.default_points`.

Phase 1 uses fixed per-function pricing. Dynamic batch-level pricing is out of scope for the first integration.

## Billing Lifecycle Contract

For each single generation task:

```text
create local generation task
-> POST /billing/estimate
-> POST /billing/freeze
-> submit KIE generation task
-> KIE success: POST /billing/settle
-> KIE fail or cancel: POST /billing/refund
```

If credit freeze fails, usedCarPlatform must not submit the task to KIE.

If KIE submission fails after credit freeze succeeds, usedCarPlatform must refund the billing task.

For batch generation:

```text
create local batch
-> create local generation subtask for each item
-> estimate and freeze each billable subtask
-> submit only frozen subtasks to KIE
-> settle successful subtasks
-> refund failed or canceled subtasks
```

Each batch subtask maps to one billing task in Phase 1.

## Idempotency Contract

All billing calls from usedCarPlatform to the credits platform must use deterministic idempotency keys.

Recommended format:

| Operation | Key format |
| --- | --- |
| estimate | `estimate:generation_task:{taskId}` |
| freeze | `freeze:generation_task:{taskId}` |
| settle | `settle:generation_task:{taskId}` |
| refund | `refund:generation_task:{taskId}` |
| batch estimate | `estimate:batch_item:{itemId}` |
| batch freeze | `freeze:batch_item:{itemId}` |
| batch settle | `settle:batch_item:{itemId}` |
| batch refund | `refund:batch_item:{itemId}` |

usedCarPlatform must also keep local billing status so repeated polling cannot trigger duplicate settle or refund attempts.

## Local Data Contract

usedCarPlatform should store enough billing metadata to trace every generation task back to the credits platform.

Planned fields for `generation_tasks`:

- `credits_user_id`
- `credits_tenant_id`
- `account_scope`
- `billing_task_id`
- `billing_status`
- `estimated_points`
- `settled_points`

Planned fields for `batch_tasks`:

- `credits_user_id`
- `credits_tenant_id`
- `account_scope`
- `estimated_points`
- `settled_points`

The exact migration may be adjusted during implementation, but local usedCarPlatform tables should remain workflow tables, not credit ledger tables.

## API Boundary

usedCarPlatform backend may expose proxy endpoints for the frontend:

```text
GET  /api/v1/credits/accounts
GET  /api/v1/credits/transactions
GET  /api/v1/credits/recharge-products
POST /api/v1/credits/payment-orders
```

The frontend should not need to know the internal credits platform base URL.

## Out Of Scope For Phase 1

- Merging MySQL and PostgreSQL databases.
- Porting Reusable Credits Platform logic into usedCarPlatform.
- Replacing the usedCarPlatform task and asset schema.
- Dynamic batch pricing.
- Final authentication and authorization design.
- Real payment provider production rollout, unless separately assigned.

## Acceptance Criteria

Phase 1 is complete when this contract is committed and visible to the team.

Implementation can start after the team confirms:

- The two-service architecture is acceptable.
- Reusable Credits Platform owns all credit and billing records.
- usedCarPlatform owns all generation workflow records.
- Fixed per-function pricing is acceptable for the first integration.
- Batch items can be billed as individual billing tasks in the first integration.
