/**
 * Client-side mirror of `lightbridge-authz-core::authz` (see the backend's
 * `crates/lightbridge-authz-core/src/authz.rs` and `docs/rbac.md`). Every permission the backend
 * enforces, in the same declaration order, so wildcard expansion here matches the server's.
 *
 * This is a *UI convenience*, not a security boundary — the backend is the source of truth and
 * still enforces every permission server-side. Getting this out of sync only shows/hides the
 * wrong control; it can never grant access the server wouldn't otherwise allow.
 *
 * Pure, dependency-free by design so it can be unit tested without pulling in the auth stack.
 */
export const ALL_PERMISSIONS = [
  'account:create',
  'account:read',
  'account:update',
  'account:delete',
  'account:disable',
  'project:create',
  'project:read',
  'project:update',
  'project:delete',
  'project:disable',
  'project:member',
  'apikey:create',
  'apikey:read',
  'apikey:update',
  'apikey:delete',
  'apikey:revoke',
  'apikey:rotate',
  'apikey:validate',
  'budget:read',
  'budget:read-own',
  'budget:self-refill',
  'budget:review',
  'budget:grant',
  'budget:revoke',
  'budget:audit-read',
  'budget:policy-read',
  'budget:policy-write',
  'budget:policy-simulate',
  'budget:policy-activate',
  'session:revoke-own',
  'session:revoke',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

/**
 * Built-in role -> grant mapping, ported from `default_role_permissions()`. Used when the
 * backend has no `oauth2.rbac.role_permissions` override configured (the common case).
 */
/*
 * NOTE ON `lightbridge-editor`: its `project:*` grant now expands to include the new
 * `project:member`, so editors can manage project rosters and set members' quota tiers. That is a
 * real widening of what an editor may do, and it is intentional — it mirrors the backend, whose
 * `Permission` enum places `ProjectMember` in the project group so `project:*` expands identically.
 * The two must agree: this array's ORDER and CONTENTS mirror the backend's `Permission::ALL`.
 * If editors should not manage rosters, both sides have to list grants individually instead of
 * using the wildcard.
 *
 * NOTE ON `budget:*`/`session:*`: `lightbridge-admin`'s bare `'*'` grant now also expands to the
 * eleven `budget:*` permissions (including `budget:read-own`) and the two `session:*` permissions
 * added alongside `ALL_PERMISSIONS` above. Which role(s) should carry `budget:self-refill` and the
 * other self-service grants was open in ADORSYS-GIS/lightbridge-authz#294; that resolved via
 * lightbridge-authz#325, which granted `budget:self-refill`/`budget:read-own`/`session:revoke-own`
 * to `editor`, and `budget:read-own`/`session:revoke-own` (but not self-refill) to `viewer` — mirrored
 * here from prod's `oauth2.rbac.role_permissions` in ai-helm-values'
 * `environments/prod/values/lightbridge-app.yaml`. Both roles still get no other `budget:*` grant
 * (review/grant/revoke/audit/policy-* stay admin-only).
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  'lightbridge-admin': ['*'],
  'lightbridge-editor': [
    'account:create',
    'account:read',
    'project:*',
    'apikey:*',
    'budget:self-refill',
    'budget:read-own',
    'session:revoke-own',
  ],
  'lightbridge-viewer': [
    'account:create',
    'account:read',
    'project:read',
    'apikey:read',
    'budget:read-own',
    'session:revoke-own',
  ],
};

function resourceOf(permission: Permission): string {
  return permission.split(':')[0];
}

/**
 * Expand a single grant string into the permissions it confers. Unknown grants expand to
 * nothing and never widen access — mirrors `expand_grant` in `authz.rs`.
 */
export function expandGrant(grant: string): Permission[] {
  const trimmed = grant.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed === '*') {
    return [...ALL_PERMISSIONS];
  }
  if (trimmed.endsWith(':*')) {
    const resource = trimmed.slice(0, -2);
    return ALL_PERMISSIONS.filter((permission) => resourceOf(permission) === resource);
  }
  return ALL_PERMISSIONS.filter((permission) => permission === trimmed);
}

/**
 * Resolve the permission set for a caller given their JWT role strings, mirroring
 * `permissions_for_roles`. Unknown roles contribute nothing.
 */
export function permissionsForRoles(
  roles: string[],
  rolePermissions: Record<string, string[]> = DEFAULT_ROLE_PERMISSIONS
): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    const grants = rolePermissions[role];
    if (!grants) continue;
    for (const grant of grants) {
      for (const permission of expandGrant(grant)) {
        set.add(permission);
      }
    }
  }
  return set;
}

export type PermissionSet = {
  has: (permission: Permission) => boolean;
  permissions: Set<Permission>;
};
