# Phase 5: Terminal Billing Finalization

Status: implemented
Date: 2026-05-30

## Purpose

Finalize Reusable Credits Platform billing tasks when usedCarPlatform generation tasks reach a terminal KIE status.

Phase 4 froze credits before KIE submission. Phase 5 completes the lifecycle:

```text
KIE success -> POST /billing/settle
KIE fail    -> POST /billing/refund
KIE cancel  -> POST /billing/refund
```

## Behavior

Task detail polling now checks whether a terminal generation task still has frozen billing.

If the local task is:

- `success` with `billing_status = frozen`, usedCarPlatform calls `/billing/settle`.
- `fail` or `canceled` with `billing_status = frozen`, usedCarPlatform calls `/billing/refund`.

The same finalization check also retries local retry states:

- `settle_failed`
- `refund_failed`

Already final states are skipped:

- `settled`
- `refunded`

## Idempotency

The backend uses deterministic keys:

```text
settle:generation_task:{taskId}
refund:generation_task:{taskId}
```

This allows task-detail polling to retry safely without double-settling or double-refunding.

## Local Billing Statuses

Successful finalization mirrors the credits platform state locally:

- `settled`
- `refunded`

If the credits platform call fails, the local task is marked:

- `settle_failed`
- `refund_failed`

Later task-detail reads will retry these states.

## Scope

This phase finalizes single generation tasks that already have `billing_task_id` metadata.

It does not introduce batch billing. Batch subtask billing remains a later phase.

## Verification Performed

- Backend typecheck
- Frontend typecheck
- Smoke test against local credits service and usedCar MySQL:
  - create local frozen generation task
  - simulate success
  - settle billing task
  - create local frozen generation task
  - simulate failure
  - refund billing task
  - verify local `billing_status` and point fields update
