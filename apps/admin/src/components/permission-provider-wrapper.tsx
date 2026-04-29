import { getCurrentUser } from "@/lib/api";
import { getEffectiveRoleNames } from "@/lib/auth-access";
import { getAuthToken } from "@/lib/session";
import { PermissionProvider } from "@/context/permission-context";

/**
 * Server component: fetches the current user and hydrates the client-side
 * PermissionContext so that PermissionGate / usePermission work everywhere.
 * Renders transparently when no token exists (login page, etc.).
 */
export async function PermissionProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getAuthToken();

  if (!token) {
    return (
      <PermissionProvider permissions={[]} roles={[]}>
        {children}
      </PermissionProvider>
    );
  }

  const user = await getCurrentUser();

  return (
    <PermissionProvider
      permissions={user?.permissions ?? []}
      roles={user ? getEffectiveRoleNames(user) : []}
    >
      {children}
    </PermissionProvider>
  );
}
