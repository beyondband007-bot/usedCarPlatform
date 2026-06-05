import assert from "node:assert/strict";

import {
  canCreateAccountFromSnapshot,
  canCreateUserFromSnapshot,
  canPromoteUserToAgentFromSnapshot,
  defaultAccountCreationPolicySnapshot,
  defaultBackOfficeRolePermissions,
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

assert.ok(defaultBackOfficeRolePermissions.developer.includes("account:delete:admin"));
assert.ok(defaultBackOfficeRolePermissions.developer.includes("credits:points:adjust"));
assert.ok(defaultBackOfficeRolePermissions.developer.includes("credits:transaction:read:all"));
assert.ok(defaultBackOfficeRolePermissions.admin.includes("account:delete:agent"));
assert.ok(defaultBackOfficeRolePermissions.admin.includes("account:create:user"));
assert.ok(defaultBackOfficeRolePermissions.admin.includes("credits:balance:read:all"));
assert.ok(!(defaultBackOfficeRolePermissions.admin as readonly string[]).includes("account:delete:user"));
assert.ok(!(defaultBackOfficeRolePermissions.admin as readonly string[]).includes("credits:points:adjust"));
assert.ok(!(defaultBackOfficeRolePermissions.admin as readonly string[]).includes("account:delete:admin"));
assert.ok(defaultBackOfficeRolePermissions.agent.includes("account:create:user"));
assert.ok(defaultBackOfficeRolePermissions.agent.includes("credits:balance:read:created-users"));
assert.ok(defaultBackOfficeRolePermissions.agent.includes("credits:transaction:read:created-users"));
assert.ok(!(defaultBackOfficeRolePermissions.agent as readonly string[]).includes("credits:transaction:read:all"));

const developerBlocksAdmin = resolveAccountCreationPolicy(
  withPolicy({ developer_allows_admin_create_agents_users: false }),
);
assert.equal(developerBlocksAdmin.adminCanCreateAgents, false);
assert.equal(developerBlocksAdmin.adminCanCreateUsers, true);
assert.equal(developerBlocksAdmin.adminCanPromoteUserToAgent, false);
assert.equal(canCreateAccountFromSnapshot("admin", "agent", withPolicy({
  developer_allows_admin_create_agents_users: false,
})).allowed, false);
const developerBlocksAdminUserCreation = withPolicy({ developer_allows_admin_create_users: false });
assert.equal(resolveAccountCreationPolicy(developerBlocksAdminUserCreation).adminCanCreateUsers, false);
assert.equal(canCreateUserFromSnapshot("admin", developerBlocksAdminUserCreation).allowed, false);

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
