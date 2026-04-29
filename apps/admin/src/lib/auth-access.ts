import type { AuthenticatedUser, UserRole } from "@compound/contracts";
// @ts-ignore TS5097: The admin auth helper is executed directly by the Node test runner,
// which requires an explicit file extension for this local workspace import.
import { formatRoleLabel, getEffectiveRoleNames, getPrimaryEffectiveRole, hasEffectiveRole } from "../../../../packages/contracts/src/auth-access.ts";

export { formatRoleLabel, getEffectiveRoleNames, getPrimaryEffectiveRole, hasEffectiveRole };

export function canAccessAdmin(user: AuthenticatedUser, allowedRoles: UserRole[]): boolean {
  if (user.status !== "active") {
    return false;
  }

  return allowedRoles.some((role) => hasEffectiveRole(user, role));
}
