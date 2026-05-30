# Reusable Credits Integration Roadmap

Status: active integration plan
Last updated: 2026-05-31
Branch: `feat/reusable-credits-integration`

## Current Architecture Decision

The integration should continue as a two-service architecture.

Reusable Credits Platform remains the source of truth for:

- users, tenants, and credit accounts
- recharge products and payment orders
- billing estimate, freeze, settle, and refund
- credit transaction ledger

usedCarPlatform remains the source of truth for:

- vehicle assets
- generation tasks and KIE task records
- batch tasks and batch items
- delivery assets and packages

We should not merge the MySQL and PostgreSQL databases for the first integration. Keeping the services separate is still the smaller-workload and lower-risk path.

## Completed Work

| Phase | Status | Commit / tag | Summary |
| --- | --- | --- | --- |
| Phase 1: Agree contract | Done | `0b263a6`, `phase-1-contract-20260530` | Added the two-service integration contract and ownership boundary. |
| Phase 2: Prepare credits platform | Done | Reusable Credits Platform branch `feat/used-car-platform-phase-2-setup` | Added used-car app/function seed data, demo account setup, and verification tests in the credits platform repo. |
| Phase 3: Add usedCar DB fields | Done | `c388a9d`, `phase-3-used-car-db-fields-20260530` | Added billing trace fields to `generation_tasks` and aggregate billing fields to `batch_tasks`. |
| Phase 4: Add billing client and single-task freeze | Done | `5e81549`, `phase-4-used-car-billing-client-20260530` | Added backend credits client and froze credits before submitting supported single generation tasks to KIE. |
| Phase 5: Single-task terminal billing | Done | `e8c3462`, `phase-5-terminal-billing-20260530` | Settles successful single generation tasks and refunds failed/canceled tasks with idempotency guards. |
| Phase 6: Integrate batch creation | Done | `e47969b`, `phase-6-batch-creation-20260531` | Freezes credits for each batch item before KIE submission and reports batch estimated cost from frozen subtasks. |

Detailed phase notes:

- [Phase 1 contract](./reusable-credits-integration-contract.md)
- [Phase 2 credits platform setup](./reusable-credits-phase-2-credits-platform-setup.md)
- [Phase 3 DB fields](./reusable-credits-phase-3-db-fields.md)
- [Phase 4 backend client](./reusable-credits-phase-4-backend-client.md)
- [Phase 5 terminal billing](./reusable-credits-phase-5-terminal-billing.md)
- [Phase 6 batch creation](./reusable-credits-phase-6-batch-billing.md)

## Important Implementation Notes

Billing identity is temporary until real login/session data exists.

During development, usedCarPlatform resolves credits identity in this order:

1. Request headers:
   - `x-credits-user-id`
   - `x-user-id`
   - `x-credits-account-scope`
   - `x-credits-tenant-id`
2. Request body:
   - `creditsUserId` or `userId`
   - `accountScope`
   - `creditsTenantId` or `tenantId`
3. Local environment fallback:
   - `CREDITS_DEFAULT_USER_ID`
   - `CREDITS_DEFAULT_ACCOUNT_SCOPE`
   - `CREDITS_DEFAULT_TENANT_ID`

The environment fallback is for local development only. It should not become the production identity model.

## Revised Next Plan

The original plan is still directionally correct, but the next phases should now focus on frontend/admin visibility and identity, because backend task billing is mostly in place.

### Phase 7: UsedCar Credit Proxy APIs

Add usedCar backend routes that proxy Reusable Credits Platform data:

```http
GET  /api/v1/credits/accounts
GET  /api/v1/credits/transactions
GET  /api/v1/credits/recharge-products
POST /api/v1/credits/payment-orders
```

Goal:

- keep the frontend talking mainly to the usedCar backend
- avoid leaking credits platform internal URLs into frontend code
- provide a stable boundary for the credits page, header balance, recharge, and admin console

Expected deliverable:

- backend proxy routes
- response types documented for frontend use
- smoke tests against the local credits platform

### Phase 8: Frontend Balance And Recharge

Replace mock/static credit data in usedCar frontend:

- header balance from the real account API
- credits page transaction list from the real transaction API
- recharge products from the real recharge product API
- payment order creation through the usedCar proxy API
- insufficient-credit errors shown in task creation flows

Expected deliverable:

- users can see real balances, real transactions, and real recharge products
- task creation errors from billing are visible and understandable

### Phase 9: Credits Admin Console

Use the existing static admin console prototype as the starting point and turn it into a usable admin-facing view.

Initial scope should be read-only operational visibility:

- applications and functions
- users and accounts
- billing tasks
- transactions
- payment orders

Management actions can come later after the read-only view is stable.

Expected deliverable:

- admin console is connected to live APIs
- team members can inspect credit and billing state while testing usedCar flows

### Phase 10: Identity And Mock Login

Introduce a clearer development login/session convention for usedCarPlatform.

Short-term target:

- one predictable mock identity source for local testing
- remove reliance on hidden environment fallback during normal frontend testing
- keep support for request headers for backend/API smoke tests

Longer-term target:

- derive credits identity from real session/auth data
- validate tenant membership before tenant-scoped billing

Expected deliverable:

- frontend and backend use the same temporary identity convention
- production identity gaps are explicit instead of hidden

### Phase 11: End-To-End Testing

Run and document full integration scenarios:

- single generation success settles credits
- single generation fail refunds credits
- batch with mixed success/failure settles/refunds per item
- insufficient balance blocks KIE submission
- recharge products load from credits platform
- payment order can be created
- transaction history reflects billing and recharge actions
- admin console can inspect the resulting state

Expected deliverable:

- repeatable manual smoke checklist
- automated tests where practical
- known limitations documented before PR review

### Phase 12: Team Handoff And PR

Prepare the team-facing handoff:

- architecture summary
- setup steps
- required environment variables
- local demo account information, without secrets
- completed phase links
- testing checklist
- known limitations

Expected deliverable:

- pull request or review branch ready for team lead and colleague review

## Current Recommendation

Continue with Phase 7 next.

The backend billing lifecycle is now far enough along that proxy APIs will unlock the frontend, recharge page, and admin console work without forcing the frontend to call two services directly.
