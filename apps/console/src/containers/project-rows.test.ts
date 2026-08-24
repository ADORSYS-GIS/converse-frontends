import type { Project } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import {
  NEAR_CEILING_FRACTION,
  manageTotals,
  parseQuota,
  projectStatus,
  toProjectRow,
} from './project-rows';

function project(overrides: Partial<Project> = {}): Project {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    id: 'gateway-prod',
    accountId: 'adorsys-gis',
    name: 'gateway-prod',
    allowedModels: null,
    modelPolicy: 'allow',
    defaultLimits: {},
    billingPlan: 'standard',
    billingIdentity: 'adorsys-gis',
    projectQuota: '500',
    isDefault: false,
    status: 'active',
    account: undefined as unknown as Project['account'],
    members: [],
    apiKeys: [],
    ...overrides,
  };
}

describe('parseQuota', () => {
  it('parses a decimal-string quota', () => {
    expect(parseQuota('500')).toBe(500);
    expect(parseQuota('142.55')).toBe(142.55);
  });

  it('returns null for absent or unparseable quotas rather than zero', () => {
    // Zero would render as a real ceiling of $0.00; null renders as an em dash.
    expect(parseQuota(null)).toBeNull();
    expect(parseQuota(undefined)).toBeNull();
    expect(parseQuota('')).toBeNull();
    expect(parseQuota('not-a-number')).toBeNull();
  });
});

describe('projectStatus', () => {
  it('is active by default', () => {
    expect(projectStatus(project(), null, 500)).toBe('active');
  });

  it.each(['archived', 'disabled'])('maps backend status %s to archived', (status) => {
    expect(projectStatus(project({ status }), 0, 500)).toBe('archived');
  });

  it('is near ceiling at the threshold', () => {
    expect(projectStatus(project(), 500 * NEAR_CEILING_FRACTION, 500)).toBe('near ceiling');
  });

  it('stays active just below the threshold', () => {
    expect(projectStatus(project(), 500 * NEAR_CEILING_FRACTION - 1, 500)).toBe('active');
  });

  it('never divides by a zero or absent ceiling', () => {
    expect(projectStatus(project(), 10, 0)).toBe('active');
    expect(projectStatus(project(), 10, null)).toBe('active');
  });
});

describe('toProjectRow', () => {
  it('maps identity, roster and key counts', () => {
    const row = toProjectRow(
      project({
        members: [{}, {}] as Project['members'],
        apiKeys: [{}] as Project['apiKeys'],
      })
    );
    expect(row).toMatchObject({
      id: 'gateway-prod',
      name: 'gateway-prod',
      account: 'adorsys-gis',
      members: 2,
      keys: 1,
      ceiling: 500,
    });
  });

  it('leaves spend null so the ledger shows a dash instead of a fabricated figure', () => {
    const row = toProjectRow(project());
    expect(row.spendMtd).toBeNull();
    expect(row.usedPercent).toBeNull();
  });

  it('tolerates absent relation arrays', () => {
    const row = toProjectRow(
      project({
        members: undefined as unknown as Project['members'],
        apiKeys: undefined as unknown as Project['apiKeys'],
      })
    );
    expect(row.members).toBe(0);
    expect(row.keys).toBe(0);
  });
});

describe('manageTotals', () => {
  it('sums the ceilings of the rows on screen', () => {
    const rows = [toProjectRow(project()), toProjectRow(project({ projectQuota: '250' }))];
    expect(manageTotals(rows, 7)).toEqual({
      shownLabel: '2 of 7',
      spendMtd: 0,
      ceiling: 750,
      usedPercent: 0,
    });
  });

  it('does not divide by a zero ceiling', () => {
    const rows = [toProjectRow(project({ projectQuota: null }))];
    expect(manageTotals(rows, 1).usedPercent).toBe(0);
  });
});
