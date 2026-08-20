import type { ApiKey } from '@lightbridge/hooks';

/**
 * Pure date/expiry helpers shared by the API-key create, settings/edit, and list views.
 *
 * Two different kinds of "expiry" flow through here and must not be confused:
 *  - Preset durations (30/60/90 days) are relative to *now*: `presetToExpiresAt` adds N days to
 *    the current instant and keeps the resulting time-of-day, so there is no date-only/timezone
 *    conversion involved.
 *  - The "Custom" date picker only ever collects a calendar day (`YYYY-MM-DD`, no time-of-day),
 *    so round-tripping it through an ISO `DateTime` needs an explicit, fixed anchor. This module
 *    always anchors at UTC midnight in both directions (`dateOnlyToExpiresAt` /
 *    `expiresAtToDateOnly`), matching what the pre-existing settings-view draft parser already
 *    did. Anchoring anywhere else (e.g. the browser's local midnight) would make the stored
 *    calendar day silently drift by one depending on the caller's timezone offset -- this module
 *    exists specifically to keep that bug from being reintroduced; see
 *    `apps/self-service/src/lib/__tests__/api-key-expiry.test.ts`'s timezone-drift tests.
 */

export const EXPIRY_PRESET_DAYS = {
  thirtyDays: 30,
  sixtyDays: 60,
  ninetyDays: 90,
} as const;

export type ExpiryDurationPreset = keyof typeof EXPIRY_PRESET_DAYS;
export type ExpiryPresetKey = ExpiryDurationPreset | 'custom';

export const EXPIRY_PRESET_ORDER: ExpiryPresetKey[] = [
  'thirtyDays',
  'sixtyDays',
  'ninetyDays',
  'custom',
];

/**
 * Ergonomic mirror of the backend's expiry cap -- every API key must have an expiration, and a
 * custom one may not be set more than this many days out (standing product requirement, 2026-08-20:
 * "all api-keys created from our system MUST have an expiry date... custom should be about around
 * max 90 days"). The backend (`lightbridge-authz`, see its companion change) is the actual
 * enforcement point and is planned to make this operator-configurable; this constant exists purely
 * so the picker doesn't offer, and submit doesn't send, a date the server would reject anyway. Do
 * not duplicate this number elsewhere -- every bound (`maxAllowedExpiresAt`, the "90 days" preset,
 * the date-picker `max`, and pre-submit validation) reads it from here.
 */
export const EXPIRY_MAX_DAYS = 90;

/**
 * How many days out counts as "expiring soon" in the list/detail views. Set to half of the
 * shortest offered preset (30 days) so a key minted on the shortest preset spends a visible
 * stretch of its life flagged before it lapses, without flagging keys for most of their life.
 */
export const EXPIRING_SOON_WINDOW_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** `now + days`, as a full ISO instant (time-of-day preserved from `now`). Used for the
 * duration presets, which are relative durations, not calendar-date selections. */
export function presetToExpiresAt(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() + days * MS_PER_DAY).toISOString();
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a `YYYY-MM-DD` custom-date draft into an ISO `DateTime` anchored at UTC midnight.
 * Returns `undefined` for anything that isn't a well-formed calendar date -- callers treat
 * `undefined` as "invalid, block Save", matching the rest of this app's inline validation.
 */
export function dateOnlyToExpiresAt(dateOnly: string): string | undefined {
  const trimmed = dateOnly.trim();
  if (!DATE_ONLY_PATTERN.test(trimmed)) return undefined;
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

/**
 * Renders a nullable ISO expiration back to the `YYYY-MM-DD` the date picker edits, reading the
 * UTC calendar day -- the exact inverse of `dateOnlyToExpiresAt`. Uses `toISOString().slice(0,
 * 10)` (UTC), never `getFullYear`/`getMonth`/`getDate` or `toLocaleDateString` (local time) --
 * those would read back the day *before* the stored UTC midnight for any timezone with a
 * negative UTC offset.
 */
export function expiresAtToDateOnly(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/** `now + EXPIRY_MAX_DAYS`, as a `Date`. The ceiling a custom expiry may not cross -- feeds both
 * the date picker's `max` bound (`maxAllowedDateOnly`) and `validateExpiresAt`. */
export function maxAllowedExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + EXPIRY_MAX_DAYS * MS_PER_DAY);
}

/** `YYYY-MM-DD` for `now + EXPIRY_MAX_DAYS` -- the `ExpirySelector` custom date field's `max`
 * bound, so the native picker cannot present a day beyond the cap in the first place. */
export function maxAllowedDateOnly(now: Date = new Date()): string {
  return expiresAtToDateOnly(maxAllowedExpiresAt(now).toISOString());
}

/** `YYYY-MM-DD` for `now + 1 day` -- the `ExpirySelector` custom date field's `min` bound. Set to
 * tomorrow, not today: the custom picker only ever collects a calendar day, which
 * `dateOnlyToExpiresAt` anchors at UTC midnight, so picking "today" resolves to a timestamp that
 * is already in the past (or, at best, exactly now) for any caller interacting after midnight
 * UTC -- which `validateExpiresAt` below rejects. Tomorrow is the earliest calendar day whose
 * anchored instant is guaranteed to be strictly in the future. */
export function minAllowedDateOnly(now: Date = new Date()): string {
  return expiresAtToDateOnly(new Date(now.getTime() + MS_PER_DAY).toISOString());
}

export type ExpiresAtValidationResult =
  { ok: true } | { ok: false; reason: 'missing' | 'invalid' | 'pastOrPresent' | 'exceedsMax' };

/**
 * The single gate every `expiresAt` this app submits must pass, whether it came from a preset, a
 * custom date, or (the reason this exists as its own function, not folded into the picker) some
 * other path a future change might introduce. Every API key must have an expiration -- `null`/
 * `undefined` are `'missing'`, never a silent success -- strictly in the future (`'pastOrPresent'`
 * rejects a value equal to or before `now`), and no more than `EXPIRY_MAX_DAYS` out
 * (`'exceedsMax'`). This is the client-side mirror of the backend's own validation, not a
 * replacement for it -- the backend enforces the real gate independently and can reject a value
 * this function accepted (e.g. clock skew, an operator-lowered cap); callers must still handle a
 * backend rejection as a normal error response, not assume this function is the last word.
 */
export function validateExpiresAt(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): ExpiresAtValidationResult {
  if (expiresAt === null || expiresAt === undefined) return { ok: false, reason: 'missing' };
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return { ok: false, reason: 'invalid' };
  if (date.getTime() <= now.getTime()) return { ok: false, reason: 'pastOrPresent' };
  if (date.getTime() > maxAllowedExpiresAt(now).getTime())
    return { ok: false, reason: 'exceedsMax' };
  return { ok: true };
}

/** Boolean shorthand over {@link validateExpiresAt} for call sites that only need a yes/no (the
 * `ExpirySelector` custom-date resolver) rather than the specific rejection reason. */
export function isExpiresAtWithinAllowedRange(expiresAt: string, now: Date = new Date()): boolean {
  return validateExpiresAt(expiresAt, now).ok;
}

export function isExpired(expiresAt?: string | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= now.getTime();
}

/** Whole days remaining until `expiresAt` (rounded up), or `null` when there is no expiration
 * or the value doesn't parse. Zero or negative once the key has expired. */
export function daysUntilExpiry(expiresAt?: string | null, now: Date = new Date()): number | null {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - now.getTime()) / MS_PER_DAY);
}

export type ExpiryUrgency = 'none' | 'far' | 'soon' | 'expired';

/** Classifies an expiration for display purposes: `'none'` (no expiry set), `'far'` (set, well
 * out), `'soon'` (within `EXPIRING_SOON_WINDOW_DAYS`, still valid), or `'expired'` (in the
 * past). */
export function getExpiryUrgency(expiresAt?: string | null, now: Date = new Date()): ExpiryUrgency {
  if (!expiresAt) return 'none';
  const days = daysUntilExpiry(expiresAt, now);
  if (days === null) return 'none';
  if (days <= 0) return 'expired';
  if (days <= EXPIRING_SOON_WINDOW_DAYS) return 'soon';
  return 'far';
}

export type DerivedKeyStatus = 'active' | 'revoked' | 'expired';

/**
 * The status a key should *read* as, distinct from `ApiKey.status` (the raw backend field,
 * which only ever holds `'active'` or `'revoked'` -- the backend does not flip it to anything
 * expiry-related on its own). A key can be `status: 'active'` in the database yet already
 * rejected at validation time because it's past `expiresAt` (see `authz-opa`'s validation
 * endpoint, which rejects revoked *and* expired keys); this derives the label that makes that
 * state legible instead of misreporting it as `'active'`.
 *
 * Deliberately does not gate button `disabled` state -- rotate/revoke stay keyed off the real
 * backend `status` (an expired-but-not-revoked key can still be rotated or explicitly revoked).
 */
export function getDerivedStatus(
  key: Pick<ApiKey, 'status' | 'expiresAt'>,
  now: Date = new Date()
): DerivedKeyStatus {
  if (key.status === 'revoked') return 'revoked';
  if (isExpired(key.expiresAt, now)) return 'expired';
  return 'active';
}
