import assert from "node:assert/strict";

import {
  canCreateAccountFromSnapshot,
  canCreateUserFromSnapshot,
  canPromoteUserToAgentFromSnapshot,
  defaultAccountCreationPolicySnapshot,
  resolveAccountCreationPolicy,
  type AccountCreationPolicySnapshot,
} from "./accountCreationPolicyDefaults";

function withPolicy(
  overrides: Partial<AccountCreationPolicySnapshot>,
): AccountCreationPolicySnapshot {
  return {
    ...defaultAccountCreationPolicySnapshot,
    ...overrides,
  };
}

const defaults = resolveAccountCreationPolicy(defaultAccountCreationPolicySnapshot);

assert.equal(defaults.developerCanCreateAdmins, true);
assert.equal(defaults.developerCanCreateAgents, true);
assert.equal(defaults.developerCanCreateUsers, true);
assert.equal(defaults.adminCanCreateAgents, true);
assert.equal(defaults.adminCanCreateUsers, true);
assert.equal(defaults.adminCanPromoteUserToAgent, true);
assert.equal(defaults.agentCanCreateUsers, true);

assert.equal(canCreateAccountFromSnapshot("developer", "admin", defaultAccountCreationPolicySnapshot).allowed, true);
assert.equal(canCreateAccountFromSnapshot("developer", "agent", defaultAccountCreationPolicySnapshot).allowed, true);
assert.equal(canCreateUserFromSnapshot("developer", defaultAccountCreationPolicySnapshot).allowed, true);
assert.equal(canCreateAccountFromSnapshot("admin", "agent", defaultAccountCreationPolicySnapshot).allowed, true);
assert.equal(canCreateUserFromSnapshot("admin", defaultAccountCreationPolicySnapshot).allowed, true);
assert.equal(canCreateUserFromSnapshot("agent", defaultAccountCreationPolicySnapshot).allowed, true);
assert.equal(canCreateUserFromSnapshot("enterprise", defaultAccountCreationPolicySnapshot).allowed, false);

const developerBlocksAdmin = resolveAccountCreationPolicy(
  withPolicy({ developer_allows_admin_create_agents_users: false }),
);
assert.equal(developerBlocksAdmin.adminCanCreateAgents, false);
assert.equal(developerBlocksAdmin.adminCanCreateUsers, false);
assert.equal(developerBlocksAdmin.adminCanPromoteUserToAgent, false);
assert.equal(canCreateAccountFromSnapshot("admin", "agent", withPolicy({
  developer_allows_admin_create_agents_users: false,
})).allowed, false);
assert.equal(canCreateUserFromSnapshot("admin", withPolicy({
  developer_allows_admin_create_agents_users: false,
})).allowed, false);

const developerBlocksAgent = withPolicy({ developer_allows_agent_create_users: false });
assert.equal(resolveAccountCreationPolicy(developerBlocksAgent).agentCanCreateUsers, false);
assert.equal(canCreateUserFromSnapshot("agent", developerBlocksAgent).allowed, false);

const adminBlocksAgent = withPolicy({ admin_allows_agent_create_users: false });
assert.equal(resolveAccountCreationPolicy(adminBlocksAgent).agentCanCreateUsers, false);
assert.equal(canCreateUserFromSnapshot("agent", adminBlocksAgent).allowed, false);

const adminBlocksPromotion = withPolicy({ admin_allows_user_become_agent: false });
assert.equal(resolveAccountCreationPolicy(adminBlocksPromotion).adminCanPromoteUserToAgent, false);
assert.equal(canPromoteUserToAgentFromSnapshot("admin", adminBlocksPromotion).allowed, false);
assert.equal(canPromoteUserToAgentFromSnapshot("developer", adminBlocksPromotion).allowed, true);

console.log("Account creation policy defaults passed.");
