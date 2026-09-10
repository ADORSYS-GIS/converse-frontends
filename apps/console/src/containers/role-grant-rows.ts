import type { PlatformRoleGrant, UserProfile } from '@lightbridge/authz-rpc';
import type { PlatformGrantAuthor, PlatformRoleGrantRow } from '@lightbridge/ui-web';

import { toRequester } from './refill-rows';

/**
 * Pure adapters from the generated `PlatformRoleGrant` model to `/admin/roles`' ledger rows
 * (converse-frontends#452, backed by lightbridge-authz#656).
 *
 * Every identity on the screen — the holder AND the granter — is a `users.id` that only
 * `resolveUserProfiles` can turn into a name, so both go through `refill-rows.ts`'s own
 * `toRequester`: the four-state "resolved / resolving / unresolved" reasoning is identical here,
 * and a second copy of it is how the two screens' sentinels would drift apart.
 */

/**
 * Every user id ONE page of grants needs a name for — holders and granters together, de-duplicated
 * and sorted.
 *
 * Sorted because the sorted list is the react-query cache key: `['a','b']` and `['b','a']` are the
 * same request but two cache entries otherwise, which turns one batch per page into two.
 *
 * A NULL `grantedBy` is skipped rather than resolved: it is the CLI bootstrap, a fact about the
 * row, not a person to look up.
 */
export function grantIdentityIdsOf(grants: readonly PlatformRoleGrant[]): string[] {
  const ids = new Set<string>();
  for (const grant of grants) {
    ids.add(grant.userId);
    if (grant.grantedBy) ids.add(grant.grantedBy);
  }
  return [...ids].sort();
}

/** `granted_by` → who made the grant. NULL is `cli`, the bootstrap, never an unknown person. */
export function toGrantAuthor(
  grantedBy: string | null | undefined,
  profiles: ReadonlyMap<string, UserProfile> | undefined
): PlatformGrantAuthor {
  if (!grantedBy) return { kind: 'cli' };
  const requester = toRequester(grantedBy, profiles);
  // `toRequester`'s `unknown` branch is unreachable here — it fires only for a null id, which the
  // guard above already routed to `cli`. Mapped anyway rather than cast, so a future change to
  // that function cannot silently produce a branch this union does not have.
  return requester.kind === 'unknown' ? { kind: 'unresolved', userId: grantedBy } : requester;
}

/**
 * A timestamp as this screen shows it: `YYYY-MM-DD HH:mm` in the reader's own zone, seconds
 * dropped.
 *
 * Not a relative age (the refills queue's "2 days ago"): a queue is about how long something has
 * been waiting, an audit trail is about WHEN it happened, and "3 months ago" is unusable for
 * lining a grant up against an incident timeline. An unparseable value renders verbatim rather
 * than as a fabricated date.
 */
export function formatGrantTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ` +
    `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
  );
}

/**
 * One grant row.
 *
 * `callerUserId` is `getMyAccess`'s own `userId` — the PERSON behind the acting account, which is
 * exactly what `platform_role_grants.user_id` is keyed on (ADR-0026: one person may own several
 * accounts, so the account id would match nothing). An empty string (no verified access) makes
 * `isSelf` false everywhere, which only ever costs an extra warning, never suppresses one.
 */
export function toPlatformRoleGrantRow(
  grant: PlatformRoleGrant,
  profiles: ReadonlyMap<string, UserProfile> | undefined,
  callerUserId: string
): PlatformRoleGrantRow {
  return {
    id: grant.id,
    user: toRequester(grant.userId, profiles),
    role: grant.role,
    grantedBy: toGrantAuthor(grant.grantedBy, profiles),
    grantedAt: formatGrantTimestamp(grant.grantedAt),
    revokedAt: grant.revokedAt ? formatGrantTimestamp(grant.revokedAt) : undefined,
    reason: grant.reason ?? undefined,
    isSelf: callerUserId !== '' && grant.userId === callerUserId,
  };
}
