import { useSelector } from 'react-redux';
import { selectCurrentUser, selectPermissions } from '../store/authSlice';

/**
 * Returns true if the current user has the given permission.
 * Super admin (role === 'super_admin') always returns true.
 */
export function usePermission(permission: string): boolean {
  const user = useSelector(selectCurrentUser);
  const permissions = useSelector(selectPermissions);

  if (!user) return false;

  // super_admin bypasses all checks (mirrors Gate::before in API)
  if (user.roles?.includes('super_admin') || user.role === 'super_admin') {
    return true;
  }

  return permissions.includes(permission);
}

/**
 * Returns true if user has ALL of the given permissions.
 */
export function useAllPermissions(...perms: string[]): boolean {
  const user = useSelector(selectCurrentUser);
  const permissions = useSelector(selectPermissions);

  if (!user) return false;
  if (user.roles?.includes('super_admin') || user.role === 'super_admin') return true;
  return perms.every((p) => permissions.includes(p));
}

/**
 * Returns true if user has ANY of the given permissions.
 */
export function useAnyPermission(...perms: string[]): boolean {
  const user = useSelector(selectCurrentUser);
  const permissions = useSelector(selectPermissions);

  if (!user) return false;
  if (user.roles?.includes('super_admin') || user.role === 'super_admin') return true;
  return perms.some((p) => permissions.includes(p));
}
