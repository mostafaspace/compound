import "server-only";

import type { AuthenticatedUser, UserRole } from "@compound/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const authCookieName = "compound_admin_token";
const compoundContextCookieName = "compound_ctx";

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(authCookieName)?.value ?? null;
}

export async function setAuthToken(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set({
    httpOnly: true,
    maxAge: 60 * 60 * 12,
    name: authCookieName,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: token,
  });
}

export async function clearAuthToken(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(authCookieName);
}

// ─── Compound context (super-admin only) ─────────────────────────────────────

export async function getCompoundContext(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(compoundContextCookieName)?.value ?? null;
}

export async function setCompoundContext(compoundId: string | null): Promise<void> {
  const cookieStore = await cookies();
  if (compoundId) {
    cookieStore.set({
      httpOnly: false, // readable by client for display
      maxAge: 60 * 60 * 24,
      name: compoundContextCookieName,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      value: compoundId,
    });
  } else {
    cookieStore.delete(compoundContextCookieName);
  }
}

export function canAccessAdmin(user: AuthenticatedUser, allowedRoles: UserRole[]): boolean {
  return user.status === "active" && allowedRoles.includes(user.role);
}

export async function requireAdminUser(
  loader: () => Promise<AuthenticatedUser | null>,
  allowedRoles: UserRole[] = [
    "super_admin",
    "compound_admin",
    "board_member",
    "finance_reviewer",
    "security_guard",
    "support_agent",
  ],
): Promise<AuthenticatedUser> {
  const token = await getAuthToken();

  if (!token) {
    redirect("/login");
  }

  const user = await loader();

  if (!user || !canAccessAdmin(user, allowedRoles)) {
    await clearAuthToken();
    redirect("/login");
  }

  return user;
}

/**
 * Like requireAdminUser but also enforces a Spatie permission gate.
 * Super admins bypass all permission checks.
 * Redirects to /403 if the user lacks the required permission.
 */
export async function requirePermission(
  user: AuthenticatedUser,
  permission: string,
): Promise<void> {
  const isSuperAdmin =
    user.roles?.includes("super_admin") || user.role === "super_admin";
  if (isSuperAdmin) return;

  const hasPermission = user.permissions?.includes(permission) ?? false;
  if (!hasPermission) {
    redirect("/403");
  }
}
