import { describe, expect, it } from 'vitest';

import type { UsageQueryResponse } from '@lightbridge/api-rest';

import {
  activeApiKeysCountFilters,
  buildBudgetConsumptionByProjectRequest,
  buildBudgetConsumptionRequest,
  currentPeriodRange,
  isUsageResponseTruncated,
  resolveOverviewWindow,
  resolveRangeWindow,
  safeCost,
  sumTotalCost,
  toSpendShareSegments,
  USAGE_QUERY_LIMIT,
} from './overview-usage';

const NOW = new Date('2026-08-28T12:00:00.000Z');

/** Micro-USD, the unit `total_cost` arrives in on the wire (`usage_events.total_cost`; see
 *  `microUsdToUsd`'s doc comment). Written out at every call site so a reader can see the unit
 *  boundary the mapping layer exists to cross, instead of inferring it from a bare number. */
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

describe('safeCost', () => {
  it('clamps a malformed or negative total_cost to 0 rather than crashing or returning NaN', () => {
    expect(safeCost(point({ total_cost: Number.NaN }))).toBe(0);
    expect(safeCost(point({ total_cost: -10 }))).toBe(0);
  });

  it('converts a real micro-USD total_cost to dollars', () => {
    expect(safeCost(point({ total_cost: usd(5) }))).toBeCloseTo(5);
  });
});

describe('toSpendShareSegments', () => {
  it('sums cost per dimension value across the whole range', () => {
    const response: UsageQueryResponse = {
      truncated: false,
      points: [
        point({ model: 'gpt-4o-mini', total_cost: usd(3) }),
        point({ model: 'gpt-4o-mini', total_cost: usd(4) }),
        point({ model: 'claude-sonnet', total_cost: usd(2) }),
      ],
    };

    const slices = toSpendShareSegments(response, 'model');

    expect(slices).toEqual(
      expect.arrayContaining([
        { key: 'gpt-4o-mini', label: 'gpt-4o-mini', value: 7, formattedValue: '$7.00' },
        { key: 'claude-sonnet', label: 'claude-sonnet', value: 2, formattedValue: '$2.00' },
      ])
    );
  });

  it('returns segments sorted by value, descending — ShareBar colours by array index', () => {
    // `ShareBar` resolves each segment's grey from its RANK (its position in the array), so an
    // unsorted list would hand the lightest, most prominent step to whichever key the usage
    // backend happened to mention first rather than to the largest share.
    const response: UsageQueryResponse = {
      truncated: false,
      points: [
        point({ model: 'small', total_cost: 1 }),
        point({ model: 'largest', total_cost: 9 }),
        point({ model: 'middle', total_cost: 4 }),
      ],
    };

    const segments = toSpendShareSegments(response, 'model');

    expect(segments.map((segment) => segment.key)).toEqual(['largest', 'middle', 'small']);
  });
});

describe('sumTotalCost', () => {
  it('sums every point regardless of grouping', () => {
    const response: UsageQueryResponse = {
      truncated: false,
      points: [point({ total_cost: usd(1.5) }), point({ total_cost: usd(2.25) })],
    };

    expect(sumTotalCost(response)).toBeCloseTo(3.75);
  });

  it('returns 0, not NaN or a thrown error, for an empty response', () => {
    expect(sumTotalCost({ truncated: false, points: [] })).toBe(0);
  });
});

describe('isUsageResponseTruncated', () => {
  it('is true only when the response hit the limit exactly', () => {
    const atLimit: UsageQueryResponse = {
      truncated: false,
      points: Array.from({ length: 5 }, () => point({})),
    };
    expect(isUsageResponseTruncated(atLimit, 5)).toBe(true);
  });

  it('is false when the response returned fewer points than the limit', () => {
    const underLimit: UsageQueryResponse = {
      truncated: false,
      points: Array.from({ length: 4 }, () => point({})),
    };
    expect(isUsageResponseTruncated(underLimit, 5)).toBe(false);
  });

  // Every request builder left in this module sets the limit explicitly — the dashboard's own
  // builders moved into `resolve-dashboard.ts`, where the YAML makes `limit` a required field and
  // `dashboard-spec.test.ts` refuses a panel without one.
  it('every real request builder sets the same shared limit', () => {
    expect(buildBudgetConsumptionRequest('acct_1', NOW).limit).toBe(USAGE_QUERY_LIMIT);
    expect(buildBudgetConsumptionByProjectRequest('acct_1', NOW).limit).toBe(USAGE_QUERY_LIMIT);
  });
});

describe('currentPeriodRange', () => {
  it('starts at the first of the calendar month (UTC) and ends at `now`', () => {
    const { start, end } = currentPeriodRange(NOW);

    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(end).toBe(NOW);
  });
});

describe('buildBudgetConsumptionRequest', () => {
  it('is always account-scoped, ungrouped, for the current period', () => {
    const request = buildBudgetConsumptionRequest('acct_1', NOW);

    expect(request).toEqual({
      scope: 'account',
      scope_id: 'acct_1',
      start_time: '2026-08-01T00:00:00.000Z',
      end_time: '2026-08-28T12:00:00.000Z',
      limit: USAGE_QUERY_LIMIT,
    });
  });
});

describe('buildBudgetConsumptionByProjectRequest', () => {
  it('is the same account-scoped period window, broken down by project', () => {
    const request = buildBudgetConsumptionByProjectRequest('acct_1', NOW);

    expect(request).toEqual({
      scope: 'account',
      scope_id: 'acct_1',
      start_time: '2026-08-01T00:00:00.000Z',
      end_time: '2026-08-28T12:00:00.000Z',
      group_by: ['project_id'],
      limit: USAGE_QUERY_LIMIT,
    });
  });

  it('shares the ungrouped request’s window exactly, so the parts sum to the whole', () => {
    const whole = buildBudgetConsumptionRequest('acct_1', NOW);
    const parts = buildBudgetConsumptionByProjectRequest('acct_1', NOW);

    expect(parts.start_time).toBe(whole.start_time);
    expect(parts.end_time).toBe(whole.end_time);
    expect(parts.scope).toBe(whole.scope);
    expect(parts.scope_id).toBe(whole.scope_id);
  });

  it('never scopes to a project, whatever the console scope holds', () => {
    // The admin overview is every project in the account by definition; budget is account-scoped
    // in the schema regardless (`budget_account_id is always identical to account_id`).
    expect(buildBudgetConsumptionByProjectRequest('acct_1', NOW).scope).toBe('account');
  });
});

describe('resolveRangeWindow', () => {
  it('rolls a fixed-day preset back from now', () => {
    const now = new Date('2026-08-29T12:00:00.000Z');
    const { start, end } = resolveRangeWindow('7d', now);

    expect(end).toBe(now);
    expect(start.toISOString()).toBe('2026-08-22T12:00:00.000Z');
  });

  it("'mtd' spans the calendar month (UTC start of month -> now), not a rolling 30 days", () => {
    const now = new Date('2026-08-29T12:00:00.000Z');
    const { start, end } = resolveRangeWindow('mtd', now);

    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(end).toBe(now);
  });

  it("'mtd' on the 1st of the month, just after midnight UTC, is a same-day span", () => {
    const firstOfMonth = new Date('2026-08-01T00:30:00.000Z');
    const { start, end } = resolveRangeWindow('mtd', firstOfMonth);

    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(end).toBe(firstOfMonth);
    // Thirty minutes, not a month — the classic off-by-one this boundary case exists to catch.
    expect(end.getTime() - start.getTime()).toBe(30 * 60_000);
  });
});

describe('resolveOverviewWindow', () => {
  const NOW_FIXED = new Date('2026-08-29T12:00:00.000Z');

  it('rolls the preset back from now when no explicit span is set', () => {
    const { start, end } = resolveOverviewWindow('7d', '', '', NOW_FIXED);

    expect(end).toEqual(NOW_FIXED);
    expect(start.toISOString()).toBe('2026-08-22T12:00:00.000Z');
  });

  it("resolves 'mtd' to the calendar-month span when no explicit span is set", () => {
    const { start, end } = resolveOverviewWindow('mtd', '', '', NOW_FIXED);

    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(end).toEqual(NOW_FIXED);
  });

  it("lets an explicit span win over 'mtd' the same way it wins over a rolling preset", () => {
    const { start, end } = resolveOverviewWindow('mtd', '2026-08-12', '2026-08-20', NOW_FIXED);

    expect(start.toISOString()).toBe('2026-08-12T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-20T23:59:59.999Z');
  });

  it('lets an explicit span win over the preset still in the URL', () => {
    const { start, end } = resolveOverviewWindow('30d', '2026-08-12', '2026-08-20', NOW_FIXED);

    expect(start.toISOString()).toBe('2026-08-12T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-20T23:59:59.999Z');
  });

  it('falls back to the preset for a malformed span rather than throwing', () => {
    const { start } = resolveOverviewWindow('7d', 'not-a-date', '2026-08-20', NOW_FIXED);

    expect(start.toISOString()).toBe('2026-08-22T12:00:00.000Z');
  });

  it('falls back to the preset for a reversed span', () => {
    const { start } = resolveOverviewWindow('7d', '2026-08-20', '2026-08-12', NOW_FIXED);

    expect(start.toISOString()).toBe('2026-08-22T12:00:00.000Z');
  });

  it('needs BOTH ends before an explicit span counts', () => {
    const { start } = resolveOverviewWindow('7d', '2026-08-12', '', NOW_FIXED);

    expect(start.toISOString()).toBe('2026-08-22T12:00:00.000Z');
  });
});

describe('series labelling', () => {
  const response: UsageQueryResponse = {
    truncated: false,
    points: [
      point({ project_id: 'zezxvt21irmoi0kzm22el7gu', total_cost: 5 }),
      point({ project_id: undefined, total_cost: 2 }),
    ],
  };
  const labelFor = (key: string) =>
    key === 'zezxvt21irmoi0kzm22el7gu' ? 'gateway-prod' : key === 'unassigned' ? 'Unassigned' : key;

  it('labels share segments with the resolved name while keeping the id as the key', () => {
    const segments = toSpendShareSegments(response, 'project_id', labelFor);

    expect(segments.map((s) => s.label).sort()).toEqual(['Unassigned', 'gateway-prod']);
    // The key stays the id — the share bar and `?series=` both match on it.
    expect(segments.find((s) => s.label === 'gateway-prod')?.key).toBe('zezxvt21irmoi0kzm22el7gu');
  });

  it('falls back to the raw key when nothing resolves it — e.g. a since-deleted project', () => {
    const segments = toSpendShareSegments(response, 'project_id', (key) => key);

    expect(segments.some((s) => s.label === 'zezxvt21irmoi0kzm22el7gu')).toBe(true);
  });

  it('defaults to identity, so an un-labelled caller still gets working output', () => {
    const segments = toSpendShareSegments(response, 'project_id');

    expect(segments.some((s) => s.label === 'zezxvt21irmoi0kzm22el7gu')).toBe(true);
  });
});

describe('activeApiKeysCountFilters', () => {
  it('always filters to status eq active, so the count excludes revoked keys', () => {
    // Live findings #5 (2026-08-30): the "Active API keys" stat card previously read an
    // unfiltered `useList` total, which counted revoked keys as if they were live.
    expect(activeApiKeysCountFilters(null, ['proj_1', 'proj_2'])).toEqual([
      { field: 'projectId', operator: 'in', value: ['proj_1', 'proj_2'] },
      { field: 'status', operator: 'eq', value: 'active' },
    ]);
  });

  it('adds a projectId filter only when the scope has a project selected', () => {
    expect(activeApiKeysCountFilters('proj_7', ['proj_1', 'proj_2', 'proj_7'])).toEqual([
      { field: 'projectId', operator: 'eq', value: 'proj_7' },
      { field: 'status', operator: 'eq', value: 'active' },
    ]);
  });

  // Phase 2d (account-scoping audit, converse-frontends#368/#392): the stat card used to read
  // `apiKeys.result.total` scoped by status alone — no project filter at all when the toolbar was
  // at "All projects" — which counted every key the IDENTITY could see, not just this account's.
  it('scopes the account-wide count to this account’s own project ids, not every project the identity can see', () => {
    const accountA = activeApiKeysCountFilters(null, ['proj_a1', 'proj_a2']);
    const accountB = activeApiKeysCountFilters(null, ['proj_b1']);

    expect(accountA).toEqual([
      { field: 'projectId', operator: 'in', value: ['proj_a1', 'proj_a2'] },
      { field: 'status', operator: 'eq', value: 'active' },
    ]);
    expect(accountB).toEqual([
      { field: 'projectId', operator: 'in', value: ['proj_b1'] },
      { field: 'status', operator: 'eq', value: 'active' },
    ]);
    expect(accountA).not.toEqual(accountB);
  });

  it('returns null — never an unfiltered count — when the account has no known project ids yet', () => {
    expect(activeApiKeysCountFilters(null, [])).toBeNull();
  });
});
