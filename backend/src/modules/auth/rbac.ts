import type { AuthenticatedUser } from "./authTypes";

export const BACK_OFFICE_PERMISSION = "menu:admin";

export function hasPermission(user: Pick<AuthenticatedUser, "permissions">, permission: string) {
  return user.permissions.includes(permission);
}

export function canAccessBackOfficeConsole(user: Pick<AuthenticatedUser, "permissions">) {
  return hasPermission(user, BACK_OFFICE_PERMISSION);
}
