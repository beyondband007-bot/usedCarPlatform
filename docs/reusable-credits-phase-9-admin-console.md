# Phase 9: Credits Admin Console

Status: implemented
Date: 2026-05-31

## Purpose

Turn the static Credits Admin Console prototype into a usable read-only operational console inside usedCarPlatform.

The console helps teammates inspect the credits integration while testing usedCar flows.

## Added Frontend Page

Route:

```text
/credits-admin
```

The page follows the structure of the shared static prototype:

- left admin sidebar
- top summary metrics
- account table
- recharge product list
- usedCarPlatform function pricing table
- recent credit transaction table

This phase keeps the console read-only. Management actions are intentionally left for a later phase.

## Added Backend Proxy

Route:

```http
GET /api/v1/credits/admin/overview
```

The route aggregates Reusable Credits Platform data through the usedCar backend boundary:

- applications
- usedCarPlatform functions
- accounts visible to the current credits identity
- recent transactions from those accounts
- recharge products

The frontend still does not call Reusable Credits Platform directly.

## Data Sources

The proxy uses existing credits-platform endpoints:

```text
GET /integration/applications
GET /integration/applications/:applicationCode/functions
GET /me/accounts
GET /accounts/:id/transactions
GET /recharge-products
```

## Temporary Identity

The admin overview currently uses the same temporary identity convention as task billing and the Phase 7 proxy APIs:

- request headers
- query parameters
- local development environment fallback

Real admin roles and permissions are not implemented yet.

## Verification Performed

- Backend typecheck
- Frontend typecheck
- Frontend production build
- Local smoke test against running credits platform, usedCar backend, and Vite frontend:
  - `GET /api/v1/credits/admin/overview`
  - `/credits-admin` served by Vite

