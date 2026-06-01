# Phase 9: Credits Admin Console

Status: implemented, expanded to three-role back office
Date: 2026-05-31
Expanded: 2026-06-01

## Purpose

Turn the static Credits Admin Console prototype into a usable operational console inside usedCarPlatform.

The console helps teammates inspect the credits integration while testing usedCar flows.

On 2026-06-01, the page was expanded from the initial read-only overview into the full three-role back office described in [Three-Role Credits Back Office](./reusable-credits-three-role-back-office.md).

## Added Frontend Page

Route:

```text
/credits-admin
```

The page follows the structure of the shared static prototype and now includes role-specific navigation for:

- developer
- company admin
- agent

The first version kept the console read-only. The current page adds the complete three-role workflow surface, while high-risk management actions remain non-mutating until backend permissions, audit APIs, and production identity are implemented.

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
- Three-role console route smoke served by Vite
- Local smoke test against running credits platform, usedCar backend, and Vite frontend:
  - `GET /api/v1/credits/admin/overview`
  - `/credits-admin` served by Vite
