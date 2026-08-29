import type { Project } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import { manageTotals, projectStatus, toProjectRow } from './project-rows';

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
    projectQuota: 'growth',
    isDefault: false,
    status: 'active',
    account: undefined as unknown as Project['account'],
    members: [],
    apiKeys: [],
    ...overrides,
  };
}

describe('projectStatus', () => {
  it('is active for the real backend "active" value', () => {
    expect(projectStatus(project({ status: 'active' }))).toBe('active');
  });

  it('is suspended for the real backend "suspended" value — never active', () => {
    expect(projectStatus(project({ status: 'suspended' }))).toBe('suspended');
  });

  it.each(['archived', 'disabled', '', 'anything-else'])(
    'maps an unrecognized backend status %j to "unknown" rather than crashing or defaulting to active',
    (status) => {
      expect(projectStatus(project({ status }))).toBe('unknown');
    }
  );
});

describe('toProjectRow', () => {
  it('maps identity fields and carries the quota tier id through as-is', () => {
    const row = toProjectRow(project({ projectQuota: 'growth' }));
    expect(row).toMatchObject({
      id: 'gateway-prod',
      name: 'gateway-prod',
      account: 'adorsys-gis',
      quotaTier: 'growth',
      status: 'active',
      statusLabel: 'active',
    });
  });

  it('never coerces a quota tier id through Number() — a non-numeric tier stays the tier label', () => {
    const row = toProjectRow(project({ projectQuota: 'not-a-number' }));
    expect(row.quotaTier).toBe('not-a-number');
  });

  it('renders no tier as null, not a fabricated zero', () => {
    const row = toProjectRow(project({ projectQuota: null }));
    expect(row.quotaTier).toBeNull();
  });

  it('renders a suspended project as suspended, never active', () => {
    const row = toProjectRow(project({ status: 'suspended' }));
    expect(row.status).toBe('suspended');
    expect(row.statusLabel).toBe('suspended');
  });

  it('leaves spend null so the ledger shows a dash instead of a fabricated figure', () => {
    const row = toProjectRow(project());
    expect(row.spendMtd).toBeNull();
  });

  it('does not carry members/apiKeys counts — the list endpoint never returns those relations', () => {
    const row = toProjectRow(project());
    expect(row).not.toHaveProperty('members');
    expect(row).not.toHaveProperty('keys');
  });
});

describe('manageTotals', () => {
  it('never sums spend into a fabricated $0.00 — it stays null like every row cell', () => {
    const rows = [toProjectRow(project()), toProjectRow(project({ projectQuota: 'starter' }))];
    expect(manageTotals(rows, 7)).toEqual({
      shownLabel: '2 of 7',
      spendMtd: null,
    });
  });

  it('has no ceiling/usedPercent field — quota tiers are categorical and cannot be summed', () => {
    const rows = [toProjectRow(project())];
    const totals = manageTotals(rows, 1);
    expect(totals).not.toHaveProperty('ceiling');
    expect(totals).not.toHaveProperty('usedPercent');
  });
});
