"use client";

import { createContext, useContext, type ReactNode } from "react";

interface PermissionContextValue {
  permissions: string[];
  roles: string[];
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: [],
  roles: [],
});

export function PermissionProvider({
  permissions,
  roles,
  children,
}: PermissionContextValue & { children: ReactNode }) {
  return (
    <PermissionContext.Provider value={{ permissions, roles }}>
      {children}
    </PermissionContext.Provider>
  );
}

/** Returns true if the current user has ALL of the given permissions. */
export function usePermission(...required: string[]): boolean {
  const { permissions, roles } = useContext(PermissionContext);
  if (roles.includes("super_admin")) return true;
  return required.every((p) => permissions.includes(p));
}

/** Returns true if the current user has ANY of the given permissions. */
export function useAnyPermission(...required: string[]): boolean {
  const { permissions, roles } = useContext(PermissionContext);
  if (roles.includes("super_admin")) return true;
  return required.some((p) => permissions.includes(p));
}

/** Renders children only if the user has the required permission. */
export function PermissionGate({
  permission,
  any,
  children,
  fallback = null,
}: {
  permission?: string | string[];
  any?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { permissions, roles } = useContext(PermissionContext);
  if (roles.includes("super_admin")) return <>{children}</>;

  if (any) {
    if (!any.some((p) => permissions.includes(p))) return <>{fallback}</>;
  } else if (permission) {
    const required = Array.isArray(permission) ? permission : [permission];
    if (!required.every((p) => permissions.includes(p))) return <>{fallback}</>;
  }

  return <>{children}</>;
}
