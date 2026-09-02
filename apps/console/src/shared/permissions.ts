/**
 * The console's permission vocabulary — the strings `getMyAccess` answers with, and the ONE place
 * a screen names one.
 *
 * **The console does not re-derive authorization.** There is no role → permission map here, no
 * wildcard expansion, no `lightbridge-admin` special case: `lightbridge-authz` resolves the
 * caller's roles into a flat, already-expanded set of canonical `resource:action` strings and
 * hands it back from `procedure.getMyAccess` (`authz.cstack`: "read back out of the very auth
 * context every `@allow` clause in this file is evaluated against, NOT re-derived"). The session
 * carries that answer verbatim; everything below is membership tests against it.
 *
 * That is the whole reason this replaces `isAdmin(roles)`. `lightbridge-admin` was a role prod
 * minted for **every** signed-in person (ADR-0026: everyone owns an account; the prod claim mapper
 * turned `owner` into `lightbridge-admin`), so "is this caller an admin" was answered `true` for
 * the entire user base. A permission the backend actually enforces cannot be spoofed by a claim
 * mapper's default.
 *
 * Shared (not `server/`) because both halves need it: the route gates read it server-side through
 * `server/access.ts`, and the chrome reads it client-side through `client/use-can.ts` off the
 * session context the root layout seeded.
 */

/**
 * Every permission this app gates a screen, a nav row or a control on, keyed by a camelCase name.
 *
 * A string here MUST exist in the backend's `Permission` enum
 * (`lightbridge-authz-core/src/authz.rs`'s `as_str`) — a typo is not a compile error, it is a
 * permission nobody ever holds, which fails closed as a permanently hidden screen. `access.test.ts`
 * pins the exact spellings so a rename upstream shows up as a failing test rather than as a
 * console area that quietly disappeared.
 *
 * `session:read` is deliberately ABSENT: it does not exist in the backend enum yet (it lands with
 * `/admin/sessions`, story C7), and declaring a permission before the screen that needs it is the
 * dormant-code pattern this repo does not ship.
 */
export const PERMISSION = {
  /** Estate-wide usage reads (`scope: 'all'`) — `/admin/overview` and the `/admin/usage` area. */
  usageReadAll: 'usage:read-all',
  /** Deciding budget refill requests — `/admin/refills-queue`. */
  budgetReview: 'budget:review',
  /** Authoring refill policy revisions — `/admin/refill-policies*`. */
  budgetPolicyWrite: 'budget:policy-write',
  /** Creating/editing budget reset schedules — `/admin/budget-schedules*`. */
  budgetScheduleManage: 'budget:schedule-manage',
  /** Granting and revoking platform roles — `/admin/roles`. */
  rbacManage: 'rbac:manage',
  /** Reading the user directory (`searchUsers`, `resolveUserProfiles`). */
  userRead: 'user:read',
  /** Hard-deleting an API key — the one row action `ApiKeysLedger` hides without it. */
  apiKeyDelete: 'apikey:delete',
  /** Reading API keys — the account-wide hygiene card's own listing. */
  apiKeyRead: 'apikey:read',
  /** Reading projects — the account-wide project listing behind that same card. */
  projectRead: 'project:read',
  /** Reading the caller's own budget balance (`getMyBudgetBalance`). */
  budgetReadOwn: 'budget:read-own',
} as const;

export type ConsolePermission = (typeof PERMISSION)[keyof typeof PERMISSION];

/**
 * The permissions that put a caller inside the `/admin` area at all.
 *
 * Holding ANY ONE of them is what makes the settings area's "Admin" row appear and what lets the
 * admin chrome render — not all of them, and not a role. A reviewer who holds only `budget:review`
 * has exactly one admin destination and should still be able to reach it; requiring the full set
 * would hide the area from everyone but a full admin, which is the "admin is one indivisible
 * thing" assumption this whole story removes.
 *
 * `user:read` is NOT here: it is a supporting read (resolving a name for a row), never a
 * destination of its own, so holding it alone must not conjure an admin area with nothing in it.
 */
export const ADMIN_AREA_PERMISSIONS: readonly ConsolePermission[] = [
  PERMISSION.usageReadAll,
  PERMISSION.budgetReview,
  PERMISSION.budgetPolicyWrite,
  PERMISSION.budgetScheduleManage,
  PERMISSION.rbacManage,
];

/**
 * The platform roles a grant may name, stated ONCE.
 *
 * There is no procedure that returns this catalogue: it is the deployment's own
 * `oauth2.rbac.role_permissions` configuration, which `grantPlatformRole` validates against and
 * REFUSES an unknown role for (`authz.cstack`), but never enumerates over the wire. `getMyAccess`
 * cannot supply it either — it answers with the CALLER's roles, which is a subset of one person's
 * grants, not a vocabulary. So the grant dialog offers this list, and a deployment that configures
 * a different catalogue gets an honest server-side refusal rather than a silently useless row.
 *
 * Order is deliberate: most privileged first, the same order `docs/rbac.md` lists them in.
 */
export const PLATFORM_ROLES = [
  'lightbridge-admin',
  'lightbridge-editor',
  'lightbridge-viewer',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/**
 * Exact membership. No wildcard expansion on purpose: `getMyAccess` returns permissions already
 * expanded server-side, so a `'*'` reaching this function would mean the backend changed its
 * contract — and silently honouring it here would be the console re-deriving authorization again,
 * one `startsWith` at a time.
 */
export function hasPermission(
  permissions: readonly string[] | undefined,
  permission: ConsolePermission
): boolean {
  return permissions !== undefined && permissions.includes(permission);
}

/** True when the caller holds at least one of `candidates`. An empty candidate list is `false`. */
export function hasAnyPermission(
  permissions: readonly string[] | undefined,
  candidates: readonly ConsolePermission[]
): boolean {
  return candidates.some((candidate) => hasPermission(permissions, candidate));
}
