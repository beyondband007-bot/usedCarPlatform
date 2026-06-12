import assert from "node:assert/strict";

import {
  normalizePlatformUserCreationInput,
  platformUserCreationRequestHash,
} from "./platformUserCreation";

const first = normalizePlatformUserCreationInput({
  username: "New_User",
  password: "123456",
  targetRole: "user",
  idempotencyKey: "key-a",
});

const second = normalizePlatformUserCreationInput({
  idempotencyKey: "key-b",
  targetRole: "user",
  password: "123456",
  username: "new_user",
});

assert.equal(first.username, "new_user");
assert.equal(first.applicationCode, "used-car-platform");
assert.equal(first.accountScope, "personal");
assert.equal(first.planCode, "");
assert.equal(first.initialPoints, 0);
assert.equal(platformUserCreationRequestHash(first), platformUserCreationRequestHash(second));

const agent = normalizePlatformUserCreationInput({
  username: "agent_created",
  password: "123456",
  targetRole: "agent",
  idempotencyKey: "agent-key",
});
assert.equal(agent.planCode, "");
assert.equal(agent.initialPoints, 0);

const admin = normalizePlatformUserCreationInput({
  username: "admin_created",
  password: "123456",
  targetRole: "admin",
  idempotencyKey: "admin-key",
});
assert.equal(admin.planCode, "");
assert.equal(admin.initialPoints, 0);

assert.throws(
  () =>
    normalizePlatformUserCreationInput({
      username: "bad",
      password: "123456",
      targetRole: "developer",
      idempotencyKey: "bad-key",
    }),
  /targetRole must be admin, agent, or user/,
);

console.log("Platform user creation contract passed.");
