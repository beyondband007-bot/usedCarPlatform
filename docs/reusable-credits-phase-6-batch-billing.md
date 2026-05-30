# Phase 6: Batch Item Billing

Status: implemented
Date: 2026-05-31

## Purpose

Connect `batch-new` item submission to Reusable Credits Platform billing.

Phase 6 keeps the Phase 1 decision that each batch item maps to one credits billing task:

```text
batch exterior item -> functionCode batch-new-exterior
batch interior item -> functionCode batch-new-interior
```

## Behavior

Batch creation now resolves the same billing identity used by single generation tasks:

- request headers
- request body
- local development environment fallback

The resolved identity is persisted on `batch_tasks`:

- `credits_user_id`
- `credits_tenant_id`
- `account_scope`

Each waiting batch item freezes credits immediately before KIE submission. If credits billing is enabled and the freeze fails, the item is not submitted to KIE.

If KIE submission fails after a freeze succeeds, usedCarPlatform refunds the frozen billing task immediately and marks the generation task as failed.

## Terminal Finalization

Batch item polling refreshes the underlying `generation_tasks` row without using the default single-task finalizer. It then finalizes billing with batch item scope:

```text
KIE success -> POST /billing/settle
KIE fail    -> POST /billing/refund
KIE cancel  -> POST /billing/refund
```

## Idempotency

Batch billing uses deterministic batch item keys:

```text
estimate:batch_item:{itemId}
freeze:batch_item:{itemId}
settle:batch_item:{itemId}
refund:batch_item:{itemId}
```

The credits platform billing task is still mirrored onto the underlying `generation_tasks` row for traceability.

## Batch Aggregates

After batch advancement, usedCarPlatform recalculates aggregate billing totals on `batch_tasks` from the underlying generation tasks:

- `estimated_points`
- `settled_points`

Batch create/detail/list responses expose these values for frontend and admin visibility.

## Scope

This phase covers the existing `batch-new` module only.

It does not introduce dynamic batch-level pricing or a separate batch-level billing task.

## Verification Performed

- Backend typecheck
- Frontend typecheck
- Smoke test against local credits service and usedCar MySQL:
  - create throwaway local batch and two batch items
  - freeze exterior item as `batch-new-exterior`
  - settle exterior item with `settle:batch_item:{itemId}`
  - freeze interior item as `batch-new-interior`
  - refund interior item with `refund:batch_item:{itemId}`
  - verify local generation billing states and batch aggregate point totals
