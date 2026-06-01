# Phase 10: Identity And Mock Login

Status: done
Branch: `feat/reusable-credits-integration`
Tag: `phase-10-mock-identity-20260601`

## Goal

Phase 10 makes the temporary credits identity explicit in the usedCar frontend.

Before this phase, normal frontend testing could silently depend on the backend local environment fallback:

- `CREDITS_DEFAULT_USER_ID`
- `CREDITS_DEFAULT_ACCOUNT_SCOPE`
- `CREDITS_DEFAULT_TENANT_ID`

That fallback is still useful for direct backend smoke tests, but it should not be the normal browser testing path. The browser should send the identity it is using.

## What Changed

The frontend now has a small mock credits identity module:

- `src/utils/credits-identity.ts`

It owns:

- localStorage key: `prototype-credits-identity`
- mock identity type
- default mock user identity
- mock login identity options
- read, write, clear, and normalize helpers

The login panel now includes an explicit credits identity selector:

- personal demo account: `userId 4`
- tenant demo account: `userId 4`, `tenantId 4`

The auth store persists the selected identity when logging in and clears it on logout.

The shared Axios client now sends credits identity headers on normal API calls when a mock identity is stored:

```http
x-credits-user-id: 4
x-credits-account-scope: personal
```

For tenant-scoped testing, it also sends:

```http
x-credits-tenant-id: 4
```

## Local Override Options

The default mock values can be overridden in local Vite env files when needed:

```bash
VITE_CREDITS_MOCK_USER_ID=4
VITE_CREDITS_MOCK_ACCOUNT_SCOPE=personal
VITE_CREDITS_MOCK_TENANT_ID=4
```

Do not commit local env files containing private machine, database, or service credentials.

## Backend Compatibility

The usedCar backend still supports the existing temporary identity order:

1. Request headers
2. Request body fields
3. Local environment fallback

Phase 10 changes the normal frontend path so the first option is used consistently during browser testing.

The backend fallback remains available for direct `curl` and API smoke tests.

## Known Limitations

This is still not production authentication.

The real production path should later derive the credits identity from the authenticated usedCar session, then validate tenant membership before tenant-scoped billing or admin access.

## Verification

Completed checks:

- frontend typecheck
- backend typecheck
- production frontend build

