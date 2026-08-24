import type { ApiKey } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import {
  EXPIRING_SOON_DAYS,
  apiKeyStatus,
  apiKeysHygiene,
  apiKeysStatusSummary,
  daysUntil,
  formatDay,
  toApiKeyRow,
} from './api-key-rows';

const NOW = Date.parse('2026-03-01T00:00:00.000Z');

function apiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    createdAt: '2026-01-04T10:00:00.000Z',
    updatedAt: '2026-01-04T10:00:00.000Z',
    id: 'key-1',
    projectId: 'project-1',
    name: 'ci-deploy',
    keyPrefix: 'lb_live_a91f',
    status: 'active',
    expiresAt: '2026-09-04T00:00:00.000Z',
    lastUsedAt: '2026-02-28T09:00:00.000Z',
    lastIp: null,
    revokedAt: null,
    deletedAt: null,
    billingPlan: 'standard',
    project: undefined as unknown as ApiKey['project'],
    ...overrides,
  };
}

describe('daysUntil', () => {
  it('counts whole days ahead', () => {
    expect(daysUntil('2026-03-11T00:00:00.000Z', NOW)).toBe(10);
  });

  it('is negative for a past date', () => {
    // 2026 is not a leap year: 20 Feb -> 1 Mar is nine days.
    expect(daysUntil('2026-02-20T00:00:00.000Z', NOW)).toBe(-9);
  });

  it('returns null for absent or unparseable values', () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil(undefined, NOW)).toBeNull();
    expect(daysUntil('not-a-date', NOW)).toBeNull();
  });
});

describe('apiKeyStatus', () => {
  it('is active well before expiry', () => {
    expect(apiKeyStatus(apiKey(), NOW)).toBe('active');
  });

  it('is active for a key with no expiry at all', () => {
    expect(apiKeyStatus(apiKey({ expiresAt: null }), NOW)).toBe('active');
  });

  it('is expiring inside the window', () => {
    expect(apiKeyStatus(apiKey({ expiresAt: '2026-03-10T00:00:00.000Z' }), NOW)).toBe('expiring');
  });

  it('is expiring exactly at the window boundary', () => {
    const boundary = new Date(NOW + EXPIRING_SOON_DAYS * 86_400_000).toISOString();
    expect(apiKeyStatus(apiKey({ expiresAt: boundary }), NOW)).toBe('expiring');
  });

  it('reports revoked from either the timestamp or the status field', () => {
    expect(apiKeyStatus(apiKey({ revokedAt: '2026-02-01T00:00:00.000Z' }), NOW)).toBe('revoked');
    expect(apiKeyStatus(apiKey({ status: 'revoked' }), NOW)).toBe('revoked');
  });

  it('prefers revoked over expiring for a revoked key that also expired', () => {
    expect(
      apiKeyStatus(apiKey({ status: 'revoked', expiresAt: '2026-03-02T00:00:00.000Z' }), NOW)
    ).toBe('revoked');
  });
});

describe('formatDay', () => {
  it('renders an ISO day', () => {
    expect(formatDay('2026-01-04T10:00:00.000Z', '—')).toBe('2026-01-04');
  });

  it('falls back for absent and unparseable values', () => {
    expect(formatDay(null, 'never used')).toBe('never used');
    expect(formatDay('nonsense', '—')).toBe('—');
  });
});

describe('toApiKeyRow', () => {
  it('maps a generated ApiKey onto the page view row', () => {
    expect(toApiKeyRow(apiKey(), NOW)).toEqual({
      id: 'key-1',
      name: 'ci-deploy',
      prefix: 'lb_live_a91f',
      status: 'active',
      statusLabel: 'active',
      created: '2026-01-04',
      lastUsed: '2026-02-28',
      expires: '2026-09-04',
    });
  });

  it('says "never used" rather than showing an empty cell', () => {
    expect(toApiKeyRow(apiKey({ lastUsedAt: null }), NOW).lastUsed).toBe('never used');
  });

  it('says "no expiry" for a live key without one, and an em dash once revoked', () => {
    expect(toApiKeyRow(apiKey({ expiresAt: null }), NOW).expires).toBe('no expiry');
    expect(toApiKeyRow(apiKey({ expiresAt: null, status: 'revoked' }), NOW).expires).toBe('—');
  });
});

describe('apiKeysHygiene', () => {
  it('counts expiring, never-used and retained-revoked keys', () => {
    const keys = [
      apiKey({ id: 'a' }),
      apiKey({ id: 'b', expiresAt: '2026-03-05T00:00:00.000Z' }),
      apiKey({ id: 'c', lastUsedAt: null }),
      apiKey({ id: 'd', status: 'revoked' }),
      apiKey({ id: 'e', status: 'revoked', lastUsedAt: null }),
    ];
    expect(apiKeysHygiene(keys, NOW)).toEqual({
      expiringCount: 1,
      expiringInDays: EXPIRING_SOON_DAYS,
      // 'e' is revoked, so it does not also count as an unused live key.
      neverUsedCount: 1,
      revokedRetainedCount: 2,
    });
  });

  it('reports zeroes for an empty key set', () => {
    expect(apiKeysHygiene([], NOW)).toMatchObject({
      expiringCount: 0,
      neverUsedCount: 0,
      revokedRetainedCount: 0,
    });
  });
});

describe('apiKeysStatusSummary', () => {
  it('summarises active and revoked counts', () => {
    expect(apiKeysStatusSummary([apiKey(), apiKey({ status: 'revoked' })], NOW)).toBe(
      '1 active · 1 revoked'
    );
  });

  it('appends the expiring clause only when something is expiring', () => {
    expect(apiKeysStatusSummary([apiKey({ expiresAt: '2026-03-05T00:00:00.000Z' })], NOW)).toBe(
      `0 active · 0 revoked · 1 expiring within ${EXPIRING_SOON_DAYS} days`
    );
  });
});
