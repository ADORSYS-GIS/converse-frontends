import { useMemo } from 'react';

import { useAuthSession } from './auth-session';
import { getJwtRoles } from './auth/jwt-utils';
import { permissionsForRoles, type Permission, type PermissionSet } from './rbac';

/**
 * Derives the current caller's permission set from the `roles` claim on their access token.
 * Recomputed only when the access token changes.
 */
export function usePermissions(): PermissionSet {
  const { session } = useAuthSession();
  const accessToken = session.tokens?.accessToken;

  const permissions = useMemo(() => {
    if (!accessToken) {
      return new Set<Permission>();
    }
    const roles = getJwtRoles(accessToken);
    return permissionsForRoles(roles);
  }, [accessToken]);

  return useMemo(
    () => ({
      has: (permission: Permission) => permissions.has(permission),
      permissions,
    }),
    [permissions]
  );
}
