import type { Project } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import { toProjectSettingsRow, toProjectSettingsRows } from './project-settings-rows';

function project(overrides: Partial<Project> = {}): Project {
  return {
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    id: 'proj_7f21',
    accountId: 'auth0|9f3a',
    name: 'gateway-prod',
    allowedModels: null,
    modelPolicy: 'allow_all',
    defaultLimits: {},
    billingPlan: 'pro',
    billingIdentity: 'adorsys-gis/gateway',
    projectQuota: 'scale',
    isDefault: true,
    status: 'active',
    account: {} as Project['account'],
    members: [],
    apiKeys: [],
    ...overrides,
  };
}

describe('toProjectSettingsRow', () => {
  it('carries every settings field a Project actually has', () => {
    expect(toProjectSettingsRow(project())).toEqual({
      id: 'proj_7f21',
      name: 'gateway-prod',
      billingIdentity: 'adorsys-gis/gateway',
      billingPlan: 'pro',
      quotaTier: 'scale',
      modelPolicy: 'allow_all',
      status: 'active',
      isDefault: true,
    });
  });

  it('carries the quota tier as its catalogue id, never coerced to a number', () => {
    const row = toProjectSettingsRow(project({ projectQuota: 'growth' }));

    expect(row.quotaTier).toBe('growth');
    expect(Number.isNaN(Number(row.quotaTier))).toBe(true);
  });

  it('maps an unassigned quota tier to null, not to zero', () => {
    expect(toProjectSettingsRow(project({ projectQuota: null })).quotaTier).toBeNull();
  });

  it('passes status through verbatim rather than resolving it to a three-value union', () => {
    // The Manage ledger's own `projectStatus()` maps anything outside `active | suspended` to
    // `unknown`, which is right for a status CELL that must pick one of three renderings. On a
    // settings row the honest thing is what the backend actually sent — this screen exists to say
    // what the project IS.
    expect(toProjectSettingsRow(project({ status: 'suspended' })).status).toBe('suspended');
    expect(toProjectSettingsRow(project({ status: 'pending-review' })).status).toBe(
      'pending-review'
    );
  });

  it('drops the opaque Json columns rather than rendering a blob as a settings row', () => {
    const row = toProjectSettingsRow(
      project({ allowedModels: ['gpt-4'], defaultLimits: { rpm: 60 } })
    );

    expect(row).not.toHaveProperty('allowedModels');
    expect(row).not.toHaveProperty('defaultLimits');
  });

  it('invents no spend, budget, member or key figures', () => {
    // `Project` carries no currency column at all, and the list endpoint returns neither the
    // roster nor the key set — so any such field could only be a fabricated zero (the correction
    // issue #270 already made to the Manage ledger).
    const row = toProjectSettingsRow(project());

    for (const absent of ['spendMtd', 'budget', 'ceiling', 'memberCount', 'keyCount']) {
      expect(row).not.toHaveProperty(absent);
    }
  });

  it('maps a list in order', () => {
    const rows = toProjectSettingsRows([
      project({ id: 'a', name: 'alpha' }),
      project({ id: 'b', name: 'beta' }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(['a', 'b']);
  });
});
