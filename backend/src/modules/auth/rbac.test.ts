import assert from "node:assert/strict";

import { BACK_OFFICE_PERMISSION, canAccessBackOfficeConsole } from "./rbac";
import type { AuthenticatedUser } from "./authTypes";

function user(role: AuthenticatedUser["role"], permissions: string[]): AuthenticatedUser {
  return {
    id: `user_${role}`,
    username: role,
    phone: null,
    displayName: role,
    role,
    permissions,
    creditsUserId: null,
    creditsTenantId: null,
    accountScope: "personal",
    enterpriseTenantId: null,
    enterpriseTenantName: null,
    enterpriseMemberRole: null,
    enterpriseOwnerUserId: null,
    enterpriseSubscriptionUserId: null,
    enterpriseAccountRole: "standalone",
    canViewEnterpriseChildren: false,
  };
}

assert.equal(canAccessBackOfficeConsole(user("developer", [BACK_OFFICE_PERMISSION])), true);
assert.equal(canAccessBackOfficeConsole(user("admin", [BACK_OFFICE_PERMISSION])), true);
assert.equal(canAccessBackOfficeConsole(user("agent", [BACK_OFFICE_PERMISSION])), true);
assert.equal(canAccessBackOfficeConsole(user("enterprise", ["menu:home", "menu:workspace"])), false);

console.log("RBAC defaults passed.");
