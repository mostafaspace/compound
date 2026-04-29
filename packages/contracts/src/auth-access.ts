import type { AuthenticatedUser, UserRole } from "./platform";

export type AuthRoleType = "admin" | "resident" | "security";

const roleAliases: Record<UserRole, string[]> = {
  super_admin: ["super_admin"],
  compound_admin: ["compound_admin", "compound_head"],
  board_member: ["board_member"],
  finance_reviewer: ["finance_reviewer"],
  security_guard: ["security_guard"],
  resident_owner: ["resident_owner"],
  resident_tenant: ["resident_tenant"],
  support_agent: ["support_agent"],
};

const roleTypeMatrix: Record<AuthRoleType, UserRole[]> = {
  admin: ["super_admin", "compound_admin", "board_member", "finance_reviewer", "support_agent"],
  resident: ["resident_owner", "resident_tenant"],
  security: ["security_guard"],
};

export function hasEffectiveRole(user: AuthenticatedUser, role: UserRole): boolean {
  const effectiveRoleNames = getEffectiveRoleNames(user);

  return roleAliases[role].some((candidate) => effectiveRoleNames.includes(candidate));
}

export function hasAnyEffectiveRole(user: AuthenticatedUser, roles: UserRole[]): boolean {
  return roles.some((role) => hasEffectiveRole(user, role));
}

export function isEffectiveSuperAdmin(user: AuthenticatedUser): boolean {
  return hasEffectiveRole(user, "super_admin");
}

export function getEffectiveRoleNames(user: AuthenticatedUser): string[] {
  return user.roles.length > 0 ? expandEffectiveRoleNames(user.roles) : expandEffectiveRoleNames([user.role]);
}

export function getPrimaryEffectiveRole(user: AuthenticatedUser): string {
  return user.roles[0] ?? user.role;
}

export function formatRoleLabel(role: string): string {
  return role.replaceAll("_", " ");
}

export function getEffectiveRoleType(user?: AuthenticatedUser | null): AuthRoleType {
  if (!user) {
    return "resident";
  }

  if (hasAnyEffectiveRole(user, roleTypeMatrix.security)) {
    return "security";
  }

  if (hasAnyEffectiveRole(user, roleTypeMatrix.admin)) {
    return "admin";
  }

  return "resident";
}

function expandEffectiveRoleNames(roleNames: string[]): string[] {
  const expanded = [...roleNames];

  if (expanded.includes("compound_head")) {
    expanded.push("compound_admin");
  }

  return [...new Set(expanded)];
}
