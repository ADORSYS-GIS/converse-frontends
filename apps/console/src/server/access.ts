import { authzClient } from './authz-account-lookup';
import type { SessionUser } from './session';
import {
  ADMIN_AREA_PERMISSIONS,
  hasAnyPermission,
  hasPermission,
  type ConsolePermission,
} from '../shared/permissions';

/**
 * The server half of the console's permission gating (converse-frontends#452, story C9).
 *
 * Two jobs, both on the server side of ADR 0009 Decision 2's token boundary:
 *
 * 1. **Fetch the answer.** `fetchMyAccess` calls `procedure.getMyAccess` with the session's own
 *    fresh access token, at login and on every refresh, and returns what the SERVER computed the
 *    caller may do. The browser never makes this call — it receives the resolved
 *    `permissions[]` on the sanitized session body, the same way it already receives the identity.
 * 2. **Answer the gate.** `can()`/`canAny()` are membership tests against that stored set. Every
 *    `/admin/*` route segment calls one of them before generating markup and `notFound()`s
 *    otherwise, exactly where `isAdmin(session.user.roles)` used to sit.
 *
 * **Fail closed, and say so.** A failure to reach `getMyAccess` yields `{ permissions: [],
 * accessVerified: false }` — never a cached previous answer, never an assumed-admin fallback. The
 * distinction between "verified, and this person holds nothing" and "we could not ask" is carried
 * on the session (`SessionUser.accessVerified`) so the chrome can say which one happened instead
 * of rendering an unexplained empty nav.
 */

export type MyAccessSnapshot = {
  /** The person behind the acting account (`users.id`), per `getMyAccess`'s own contract — kept
   *  so a future screen can line the session up against `platform_role_grants` without a second
   *  round trip. Empty string when the call failed. */
  userId: string;
  roles: string[];
  permissions: string[];
  /** `false` means the call failed and the two arrays above are the fail-closed empty set. */
  accessVerified: boolean;
};

const UNVERIFIED: MyAccessSnapshot = {
  userId: '',
  roles: [],
  permissions: [],
  accessVerified: false,
};

/**
 * `procedure.getMyAccess` for the bearer of `accessToken`.
 *
 * Allowed for any authenticated caller — it is the one procedure in the schema gated on no
 * permission at all, precisely so the console can ask "what may I render?" without first knowing
 * the answer. It discloses nothing the token itself does not already carry.
 *
 * `fallbackRoles` are the role strings the console read off the token's own claim. They are used
 * ONLY when the call fails, and only for display (the identity row, diagnostics) — never to derive
 * a permission. Gating on them is exactly the re-derivation this module exists to end, so the
 * failure path keeps `permissions: []`.
 */
export async function fetchMyAccess(
  accessToken: string,
  fallbackRoles: string[] = []
): Promise<MyAccessSnapshot> {
  const startedAt = Date.now();
  try {
    const client = await authzClient(accessToken);
    const access = await client.procedures.getMyAccess({ args: {} });
    console.info(`[console] getMyAccess resolved in ${Date.now() - startedAt}ms`);
    return {
      userId: access.userId,
      roles: access.roles,
      permissions: access.permissions,
      accessVerified: true,
    };
  } catch (error) {
    // Logged, not thrown: a session that cannot be permission-checked is still a session the
    // person is signed into — they keep their identity and every account-area screen whose data
    // the backend will still serve them. What they lose is every gated surface, which is the
    // correct fail-closed outcome.
    console.error('[console] getMyAccess failed; session falls back to no permissions:', error);
    return { ...UNVERIFIED, roles: fallbackRoles };
  }
}

/**
 * What a gate accepts: a real `ConsoleSession`, or `null`/`undefined` for "no cookie".
 *
 * `user` is OPTIONAL here even though `ConsoleSession` always has one. That is not slack — it is
 * the same allowance `app/api/usage/[...path]/route.ts` already documents beside its
 * `session.user?.sub`: this gate runs on the proxy path, where a session shape can arrive from an
 * older cookie or a test double, and a missing user must answer `false` rather than throw a
 * `TypeError` out of a security check. Failing closed and failing loudly are both acceptable; this
 * one has to fail closed, because throwing here would surface as a 500 rather than a refusal.
 */
export type GateSubject = { user?: SessionUser } | null | undefined;

/** The gate. `session` may be `null` (no cookie) — that answers `false` without a special case. */
export function can(session: GateSubject, permission: ConsolePermission): boolean {
  return hasPermission(session?.user?.permissions, permission);
}

/** True when the caller holds at least one of `permissions`. */
export function canAny(session: GateSubject, permissions: readonly ConsolePermission[]): boolean {
  return hasAnyPermission(session?.user?.permissions, permissions);
}

/** Whether this caller has any business inside `/admin` at all — see `ADMIN_AREA_PERMISSIONS`. */
export function canReachAdminArea(session: GateSubject): boolean {
  return canAny(session, ADMIN_AREA_PERMISSIONS);
}
