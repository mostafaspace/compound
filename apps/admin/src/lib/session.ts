import "server-only";

import type { AuthenticatedUser, UserRole } from "@compound/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const authCookieName = "compound_admin_token";

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

export function canAccessAdmin(user: AuthenticatedUser, allowedRoles: UserRole[]): boolean {
  return user.status === "active" && allowedRoles.includes(user.role);
}

export async function requireAdminUser(
  loader: () => Promise<AuthenticatedUser | null>,
  allowedRoles: UserRole[] = ["super_admin", "compound_admin", "board_member", "finance_reviewer", "support_agent"],
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
