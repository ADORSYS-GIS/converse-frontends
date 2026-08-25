import type { ApiKey } from '@lightbridge/authz-rpc';
import type { ApiKeyRow, ApiKeysHygiene, ApiKeyStatus } from '@lightbridge/ui-web';

/**
 * Pure adapters from the generated `ApiKey` model to the Api-Keys sections' props.
 *
 * They live outside the screen adapter so the mapping — which is where date/status presentation
 * decisions actually happen — is testable without refine, a provider tree or a DOM.
 */

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
