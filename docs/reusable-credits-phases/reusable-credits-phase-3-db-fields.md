# Phase 3: usedCarPlatform Billing Link Fields

Status: implemented
Date: 2026-05-30

## Purpose

Prepare the usedCarPlatform MySQL schema to link local generation workflow records to Reusable Credits Platform billing records.

This phase does not call the credits platform yet. It only creates the local traceability fields needed by the next integration phases.

## Tables Updated

### `generation_tasks`

Added fields:

- `credits_user_id`: Reusable Credits Platform `users.id`.
- `credits_tenant_id`: Reusable Credits Platform `tenants.id`, when tenant billing is used.
- `account_scope`: `personal` or `tenant`.
- `billing_task_id`: Reusable Credits Platform `billing_tasks.id`.
- `billing_status`: local mirror of the billing lifecycle state used for idempotent follow-up work.
- `estimated_points`: points estimated/frozen for this generation task.
- `settled_points`: points finally settled for this generation task.

Added indexes:

- `idx_generation_tasks_billing_task`
- `idx_generation_tasks_credits_user_created`
- `idx_generation_tasks_billing_status`

### `batch_tasks`

Added fields:

- `credits_user_id`: Reusable Credits Platform `users.id`.
- `credits_tenant_id`: Reusable Credits Platform `tenants.id`, when tenant billing is used.
- `account_scope`: `personal` or `tenant`.
- `estimated_points`: aggregate estimated points for the batch.
- `settled_points`: aggregate settled points for the batch.

Added index:

- `idx_batch_tasks_credits_user_created`

## Migration Behavior

The base `CREATE TABLE IF NOT EXISTS` statements include the new fields for fresh databases.

The migration runner also adds the same columns and indexes idempotently for existing databases through `addColumnIfMissing` and `addIndexIfMissing`.

## Next Phase

Phase 4 can now add the backend credits client and start writing these fields during generation and batch task creation.
