'use client';

import { useCallback, useMemo } from 'react';

import { useConsoleSession } from './session-context';
import {
  ADMIN_AREA_PERMISSIONS,
  hasAnyPermission,
  hasPermission,
  type ConsolePermission,
} from '../shared/permissions';

/**
 * The client half of the permission gate (converse-frontends#452, story C9) — the mirror of
 * `server/access.ts`'s `can()`, reading the SAME permission set off the session context the root
 * layout seeded from the cookie.
 *
 * It is a mirror in the literal sense: both sides do a membership test against the array
 * `procedure.getMyAccess` returned. Neither side owns a role → permission map, so the two cannot
 * drift — the failure mode `packages/hooks/src/rbac.ts` documents for the self-service app (a
 * client-side re-encoding that went stale against prod for two releases) is structurally absent
 * here.
 *
 * It stays a **presentation** gate, exactly as `isAdmin` was: it decides whether a nav row or a
 * control renders. The boundary is the route segment's own server-side `can()` + `notFound()`, and
 * behind that, `lightbridge-authz` refusing every procedure the caller has no permission for.
 */
export interface ConsoleAccess {
  /** Does this caller hold `permission`, per the backend's own answer? */
  can: (permission: ConsolePermission) => boolean;
  /** Does this caller hold at least one of `permissions`? */
  canAny: (permissions: readonly ConsolePermission[]) => boolean;
  /** Does this caller have any business inside `/admin` at all (`ADMIN_AREA_PERMISSIONS`)? */
  canReachAdminArea: boolean;
  /**
   * `false` only when `getMyAccess` could not be reached while the session was built — NOT when
   * the caller legitimately holds nothing. The chrome renders its "access could not be verified"
   * `InlineStatus` off this, so an unverifiable session never reads as a stripped-down one.
   */
  accessVerified: boolean;
  /** The raw set, for a consumer that needs to pass it on (e.g. `settingsNavGroups`). */
  permissions: readonly string[];
}

export function useCan(): ConsoleAccess {
  const session = useConsoleSession();
  const permissions = session.permissions;

  const can = useCallback(
    (permission: ConsolePermission) => hasPermission(permissions, permission),
    [permissions]
  );
  const canAny = useCallback(
    (candidates: readonly ConsolePermission[]) => hasAnyPermission(permissions, candidates),
    [permissions]
  );

  return useMemo(
    () => ({
      can,
      canAny,
      canReachAdminArea: hasAnyPermission(permissions, ADMIN_AREA_PERMISSIONS),
      // An anonymous session is never "unverified" in the sense the status line means: there is
      // nobody to verify. `authenticated` gates the flag so a signed-out shell renders no warning.
      accessVerified: !session.authenticated || session.accessVerified,
      permissions,
    }),
    [can, canAny, permissions, session.authenticated, session.accessVerified]
  );
}
