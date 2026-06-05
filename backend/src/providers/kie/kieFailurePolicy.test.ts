import assert from "node:assert/strict";

import {
  classifyKieHttpFailure,
  classifyKieLeaseFailure,
  isTransientKieTransportError,
  toKieProviderError,
} from "./kieClient";
import { errors } from "../../shared/errors";

const fetchFailed = Object.assign(new TypeError("fetch failed"), {
  cause: Object.assign(new Error("socket disconnected"), { code: "ECONNRESET" }),
});
assert.equal(isTransientKieTransportError(fetchFailed), true);
assert.equal(classifyKieLeaseFailure(fetchFailed), "transient");

const wrappedFetchFailed = toKieProviderError(fetchFailed, "kie file upload failed") as Error & {
  statusCode?: number;
  code?: number;
  details?: { errorCode?: string; cause?: string; code?: string };
};
assert.equal(wrappedFetchFailed.message, "kie file upload failed");
assert.equal(wrappedFetchFailed.statusCode, 500);
assert.equal(wrappedFetchFailed.code, 50001);
assert.equal(wrappedFetchFailed.details?.errorCode, "KIE_TRANSPORT_ERROR");
assert.equal(wrappedFetchFailed.details?.cause, "fetch failed");
assert.equal(wrappedFetchFailed.details?.code, "ECONNRESET");

const uploadTimeout = errors.generationFailed("KIE_UPLOAD_TIMEOUT");
assert.equal(isTransientKieTransportError(uploadTimeout), true);
assert.equal(classifyKieLeaseFailure(uploadTimeout), "transient");

assert.equal(classifyKieHttpFailure(400), "release");
assert.equal(classifyKieHttpFailure(401), "long-cooldown");
assert.equal(classifyKieHttpFailure(403), "long-cooldown");
assert.equal(classifyKieHttpFailure(429), "short-cooldown");
assert.equal(classifyKieHttpFailure(500), "short-cooldown");
assert.equal(classifyKieHttpFailure(503), "short-cooldown");

console.log("kie failure policy tests passed");
