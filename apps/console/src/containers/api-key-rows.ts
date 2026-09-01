import type { ApiKey } from '@lightbridge/authz-rpc';
import type { ApiKeyRow, ApiKeysHygiene, ApiKeyStatus, SegmentedOption } from '@lightbridge/ui-web';

/**
 * Pure adapters from the generated `ApiKey` model to the Api-Keys sections' props.
 *
 * They live outside the screen adapter so the mapping — which is where date/status presentation
 * decisions actually happen — is testable without refine, a provider tree or a DOM.
 */

/**
 * Ticket #319: `createApiKey`'s `expiresAt` is fully re-validated server-side against the
 * operator-configured `api_key_expiry` ceiling (`authz.cstack:529-536`, documented default 90
 * days) — but nothing on the RPC surface exposes that ceiling's *actual* configured value to the
 * client (`listBillingPlans` carries the billing catalogue, not this). The old bug was requesting
 * exactly the documented default with no margin at all, so a client clock running even slightly
 * ahead of the server's could get an otherwise-valid request rejected.
 *
 * The fix here is deliberately conservative rather than clever: offer a small set of day-count
 * presets, none of which reach the documented 90-day default, so ordinary clock skew never
 * matters. `MAX_KEY_EXPIRY_DAYS` is that default minus a 1-day margin. This is a client-side
 * safety choice, not a guess at a server-owned value — if an operator has configured a *lower*
 * ceiling than the documented default, the server still re-validates and still rejects, and that
 * rejection still surfaces through the real, typed error line (never swallowed or silently
 * retried with a smaller number).
 */
export const MAX_KEY_EXPIRY_DAYS = 89;
export const DEFAULT_KEY_EXPIRY_DAYS = 30;

export const EXPIRY_DAY_OPTIONS: SegmentedOption<string>[] = [
  { value: '7', label: '7 days' },
  { value: String(DEFAULT_KEY_EXPIRY_DAYS), label: `${DEFAULT_KEY_EXPIRY_DAYS} days` },
  { value: String(MAX_KEY_EXPIRY_DAYS), label: `${MAX_KEY_EXPIRY_DAYS} days` },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** `expiresAt` for a `createApiKey` call, `days` from `now` (a timestamp, not `Date.now()` — see
 * the module doc comment on reading the clock during render). */
export function computeExpiresAtIso(days: number, now: number): string {
  return new Date(now + days * DAY_MS).toISOString();
}

/** A key inside this window of its expiry reads as `expiring`, matching the ledger's status ramp. */
export const EXPIRING_SOON_DAYS = 30;

export function daysUntil(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return null;
  return Math.floor((timestamp - now) / (24 * 60 * 60 * 1000));
}

export function apiKeyStatus(key: ApiKey, now: number): ApiKeyStatus {
  if (key.revokedAt || key.status === 'revoked') return 'revoked';
  const remaining = daysUntil(key.expiresAt, now);
  if (remaining !== null && remaining <= EXPIRING_SOON_DAYS) return 'expiring';
  return 'active';
}

/** Dates render as plain ISO days; the mockup's relative phrasing needs a locale layer we do not have yet. */
export function formatDay(iso: string | null | undefined, fallback: string): string {
  if (!iso) return fallback;
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return fallback;
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function toApiKeyRow(key: ApiKey, now: number): ApiKeyRow {
  const status = apiKeyStatus(key, now);
  return {
    id: key.id,
    name: key.name,
    prefix: key.keyPrefix,
    status,
    statusLabel: status,
    created: formatDay(key.createdAt, '—'),
    lastUsed: formatDay(key.lastUsedAt, 'never used'),
    expires: formatDay(key.expiresAt, status === 'revoked' ? '—' : 'no expiry'),
  };
}

export function toApiKeyRows(keys: ApiKey[], now: number): ApiKeyRow[] {
  return keys.map((key) => toApiKeyRow(key, now));
}

export function apiKeysHygiene(keys: ApiKey[], now: number): ApiKeysHygiene {
  const rows = keys.map((key) => ({ key, status: apiKeyStatus(key, now) }));
  return {
    expiringCount: rows.filter((row) => row.status === 'expiring').length,
    expiringInDays: EXPIRING_SOON_DAYS,
    neverUsedCount: rows.filter((row) => row.status !== 'revoked' && !row.key.lastUsedAt).length,
    revokedRetainedCount: rows.filter((row) => row.status === 'revoked').length,
  };
}

/** One `apiKeys` list filter — a plain object, not the cratestack-generated `CrudFilter` type,
 *  to keep this module dependency-free of refine (same split every other filter/request builder
 *  in this app follows). */
export type ApiKeysFilter =
  | { field: 'projectId'; operator: 'eq'; value: string }
  | { field: 'projectId'; operator: 'in'; value: string[] };

/**
 * Every account-scoped `apiKeys` query's own project filter (Phase 2d, account-scoping audit,
 * converse-frontends#368/#392). `ApiKey` carries `projectId`, never `accountId`
 * (`authz.cstack:393-431`) — there is no direct "every key under this account" filter field — so
 * this resolves it the same way every account-scoped apiKeys read in the console now does:
 * `projectId in [the account's own project ids]`, using cratestack's `in` operator
 * (`@cratestack/refine`'s `filter-operators.ts` lists it as supported, joined comma-separated on
 * the wire).
 *
 * `projectId` — a caller-picked single project, e.g. the toolbar's own filter — always wins over
 * the broader account-wide `in`: it is a strict subset of the account anyway, and `eq` keeps the
 * common case (a project actually chosen) the cheapest query shape.
 *
 * Returns `null`, never `{ field: 'projectId', operator: 'in', value: [] }`, when there is no
 * project to filter by yet (`accountProjectIds` empty and no explicit `projectId`) — an empty
 * `in` list is genuinely ambiguous on the wire (cratestack's own `filterValue` renders it as the
 * empty string, `projectId__in=`, which is not a documented "match nothing" contract). Every call
 * site treats `null` as "do not fire this query at all," never as "fire it unfiltered" — see
 * `use-api-keys-screen.ts`/`use-overview-screen.ts`'s own `queryOptions.enabled` guards.
 */
export function apiKeysAccountFilters(input: {
  projectId: string | null;
  accountProjectIds: readonly string[];
}): ApiKeysFilter[] | null {
  if (input.projectId) {
    return [{ field: 'projectId', operator: 'eq', value: input.projectId }];
  }
  if (input.accountProjectIds.length === 0) return null;
  return [{ field: 'projectId', operator: 'in', value: [...input.accountProjectIds] }];
}

export function apiKeysStatusSummary(keys: ApiKey[], now: number): string {
  const rows = keys.map((key) => apiKeyStatus(key, now));
  const active = rows.filter((status) => status === 'active').length;
  const expiring = rows.filter((status) => status === 'expiring').length;
  const revoked = rows.filter((status) => status === 'revoked').length;
  const parts = [`${active} active`, `${revoked} revoked`];
  if (expiring > 0) {
    parts.push(`${expiring} expiring within ${EXPIRING_SOON_DAYS} days`);
  }
  return parts.join(' · ');
}
