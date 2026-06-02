export type AccountProvisioningRole = "developer" | "admin" | "agent";

export const PLATFORM_ACCOUNT_CREATOR_ROLES = new Set<AccountProvisioningRole>([
  "developer",
  "admin",
]);

export const AGENT_LOGIN_CREATOR_ROLES = new Set<AccountProvisioningRole>([
  "developer",
  "admin",
]);

export const AGENT_CLIENT_ACCOUNT_CREATION_ENABLED = false;

export function canCreatePlatformAccount(role: AccountProvisioningRole) {
  return PLATFORM_ACCOUNT_CREATOR_ROLES.has(role);
}

export function canAgentCreateClientAccount(role: AccountProvisioningRole) {
  return role === "agent" && AGENT_CLIENT_ACCOUNT_CREATION_ENABLED;
}

export function canPromoteUserToAgent(role: AccountProvisioningRole) {
  return AGENT_LOGIN_CREATOR_ROLES.has(role);
}
