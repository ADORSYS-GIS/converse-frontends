import type { Project } from '@lightbridge/authz-rpc';
import type { UsageQueryResponse } from '@lightbridge/api-rest';
import type { ProjectRow } from '@lightbridge/ui-web';
import { describe, expect, it } from 'vitest';

import { applyProjectSpend, projectStatus, sortProjectRows, toProjectRow } from './project-rows';

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

// ── applyProjectSpend — PROOF the per-project consumption query actually reaches ProjectRow ────
//
// `use-projects-screen.ts` wires this against the same `buildBudgetConsumptionByProjectRequest` +
// `queryUsage` pair `use-overview-screen.ts`'s already-shipped admin budget-pressure zone uses
// (identical request builder, identical response shape) — this file's own convention is to unit
// test the PURE mapping rather than the hook (see `projects-centre.test.tsx`'s/`overview-centre.
// test.tsx`'s "hook mocked wholesale, mapping tested here" split), so this is that mapping's test.

function usd(dollars: number): number {
  return dollars * 1_000_000;
}

function point(overrides: Partial<UsageQueryResponse['points'][number]>) {
  return {
    bucket_start: '2026-08-01T00:00:00.000Z',
    requests: 1,
    usage_value: 1,
    total_cost: usd(1),
    prompt_tokens: 1,
    completion_tokens: 1,
    total_tokens: 2,
    ...overrides,
  } as UsageQueryResponse['points'][number];
}

describe('applyProjectSpend', () => {
  const rows: ProjectRow[] = [
    toProjectRow(project({ id: 'gateway-prod', name: 'gateway-prod' })),
    toProjectRow(project({ id: 'batch-eval', name: 'batch-eval' })),
  ];

  it('leaves every row null (the em dash) while the query has not resolved', () => {
    expect(applyProjectSpend(rows, undefined, 'loading')).toEqual(rows);
    expect(applyProjectSpend(rows, undefined, 'error')).toEqual(rows);
  });

  it('leaves rows null on error even if a STALE response object is still sitting in the cache', () => {
    // Regression: a `useQuery` that has since errored can still hold `data` from a previous,
    // successful fetch — trusting `response` alone here would print last period's figures under
    // this period's heading.
    const stale: UsageQueryResponse = {
      truncated: false,
      points: [point({ project_id: 'gateway-prod', total_cost: usd(999) })],
    };
    expect(applyProjectSpend(rows, stale, 'error')[0].spendMtd).toBeNull();
  });

  it('maps a resolved response onto the matching row by project id, summed across points', () => {
    const response: UsageQueryResponse = {
      truncated: false,
      points: [
        point({ project_id: 'gateway-prod', total_cost: usd(30) }),
        point({ project_id: 'gateway-prod', total_cost: usd(12.5) }),
      ],
    };

    const result = applyProjectSpend(rows, response, 'ready');

    expect(result.find((row) => row.id === 'gateway-prod')?.spendMtd).toBe(42.5);
  });

  it('resolves a project absent from the response to a real 0, never back to null', () => {
    // The request is account-wide for the whole period — absence means no usage was recorded,
    // which is a fact ("$0.00"), not the "we don't know yet" an em dash would misstate it as.
    const response: UsageQueryResponse = {
      truncated: false,
      points: [point({ project_id: 'gateway-prod', total_cost: usd(10) })],
    };

    const result = applyProjectSpend(rows, response, 'ready');

    expect(result.find((row) => row.id === 'batch-eval')?.spendMtd).toBe(0);
  });
});

describe('sortProjectRows', () => {
  const rows: ProjectRow[] = [
    { ...toProjectRow(project({ id: 'c', name: 'charlie' })), spendMtd: 10 },
    { ...toProjectRow(project({ id: 'a', name: 'alpha' })), spendMtd: 30 },
    { ...toProjectRow(project({ id: 'b', name: 'bravo' })), spendMtd: null },
  ];

  it('sorts by name, ascending or descending', () => {
    expect(sortProjectRows(rows, { key: 'name', direction: 'asc' }).map((r) => r.name)).toEqual([
      'alpha',
      'bravo',
      'charlie',
    ]);
    expect(sortProjectRows(rows, { key: 'name', direction: 'desc' }).map((r) => r.name)).toEqual([
      'charlie',
      'bravo',
      'alpha',
    ]);
  });

  it('sorts by spend, treating a still-loading (null) row as the lowest value', () => {
    expect(sortProjectRows(rows, { key: 'spendMtd', direction: 'asc' }).map((r) => r.name)).toEqual(
      ['bravo', 'charlie', 'alpha']
    );
  });

  it('does not mutate the input array', () => {
    const copy = [...rows];
    sortProjectRows(rows, { key: 'name', direction: 'asc' });
    expect(rows).toEqual(copy);
  });
});
