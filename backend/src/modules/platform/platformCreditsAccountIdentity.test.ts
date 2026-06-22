import assert from "node:assert/strict";

import { resolvePlatformCreditsAccountIdentity } from "./platformCreditsAccountIdentity";

assert.deepEqual(
  resolvePlatformCreditsAccountIdentity({
    creditsUserId: 101,
    accountScope: "personal",
    creditsTenantId: null,
  }),
  {
    accountScope: "personal",
    creditsUserId: 101,
    creditsTenantId: null,
  },
);

assert.deepEqual(
  resolvePlatformCreditsAccountIdentity({
    creditsUserId: 202,
    accountScope: "tenant",
    creditsTenantId: 303,
  }),
  {
    accountScope: "tenant",
    creditsUserId: 202,
    creditsTenantId: 303,
  },
);

assert.equal(
  resolvePlatformCreditsAccountIdentity({
    creditsUserId: 202,
    accountScope: "tenant",
    creditsTenantId: null,
  }),
  null,
);

assert.equal(resolvePlatformCreditsAccountIdentity({ creditsUserId: null }), null);

console.log("Platform credits account identity passed.");
