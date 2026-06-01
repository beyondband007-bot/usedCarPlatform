# Phase 8: Frontend Balance And Recharge

Status: implemented
Date: 2026-05-31

## Purpose

Replace the most visible mock/static frontend credit data with the usedCar backend credit proxy APIs added in Phase 7.

The frontend still talks to usedCarPlatform:

```text
/api/v1/credits/*
```

It does not call Reusable Credits Platform directly.

## Updated Areas

### Header And Subnav Balance

The auth store now refreshes the current credit account balance through:

```text
GET /api/v1/credits/accounts
```

The header and enterprise subnav continue reading from `authStore.credits`, but the value now updates from the backend proxy when the app is mounted or mock login runs.

### Credits Page

The credits page now loads:

```text
GET /api/v1/credits/accounts
GET /api/v1/credits/transactions
```

The transaction table and summary cards are derived from real ledger rows when the proxy is available.

Static rows remain only as a local fallback if the proxy is unavailable.

### Recharge Page

The recharge page now loads live recharge products:

```text
GET /api/v1/credits/recharge-products
```

Selecting a recharge plan creates a payment order through:

```text
POST /api/v1/credits/payment-orders
```

Created orders are shown immediately in the recharge table as pending records.

## Temporary Identity

Phase 8 still uses the temporary identity behavior defined in earlier phases:

- backend headers
- query/body values
- local development environment fallback

Final login/session-derived identity remains a later phase.

## Verification Performed

- Frontend typecheck
- Backend typecheck
- Frontend production build
- Local smoke test against running credits platform, usedCar backend, and Vite frontend:
  - accounts loaded through `/api/v1/credits/accounts`
  - transactions loaded through `/api/v1/credits/transactions`
  - recharge products loaded through `/api/v1/credits/recharge-products`
  - payment order created through `/api/v1/credits/payment-orders`
  - `/credits` and `/package-points` served by Vite
