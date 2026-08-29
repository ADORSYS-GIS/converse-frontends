import { describe, expect, it } from 'vitest';

import type { UsageQueryResponse } from '@lightbridge/api-rest';

import {
  buildBudgetConsumptionRequest,
  buildOverviewUsageRequest,
  currentPeriodRange,
  overviewGroupByToUsageGroupBy,
  resolveOverviewWindow,
  sumTotalCost,
  toSpendShareSegments,
  toSpendSeries,
} from './overview-usage';

const WINDOW_7D = {
  start: new Date(Date.UTC(2026, 7, 22)),
  end: new Date(Date.UTC(2026, 7, 29)),
};
const WINDOW_30D = {
  start: new Date(Date.UTC(2026, 6, 30)),
  end: new Date(Date.UTC(2026, 7, 29)),
};
const WINDOW_90D = {
  start: new Date(Date.UTC(2026, 4, 31)),
  end: new Date(Date.UTC(2026, 7, 29)),
};
const NOW = new Date('2026-08-28T12:00:00.000Z');

describe('overviewGroupByToUsageGroupBy', () => {
  it('maps the URL contract group-by to the real UsageGroupBy enum (#312 gap, not widened)', () => {
    expect(overviewGroupByToUsageGroupBy('project')).toBe('project_id');
    expect(overviewGroupByToUsageGroupBy('model')).toBe('model');
  });
});

describe('buildOverviewUsageRequest', () => {
  it('scopes to the account when no project is selected', () => {
    const request = buildOverviewUsageRequest({
      accountId: 'acct_1',
      projectId: null,
      window: WINDOW_30D,
      bucket: 'day',
      groupBy: 'project',
      model: 'all',
    });

    expect(request.scope).toBe('account');
    expect(request.scope_id).toBe('acct_1');
  });

  it('scopes to the project when one is selected', () => {
    const request = buildOverviewUsageRequest({
      accountId: 'acct_1',
      projectId: 'proj_7',
      window: WINDOW_30D,
      bucket: 'day',
      groupBy: 'project',
      model: 'all',
    });

    expect(request.scope).toBe('project');
    expect(request.scope_id).toBe('proj_7');
  });

  it('carries the resolved window straight through as start_time/end_time', () => {
    const request = buildOverviewUsageRequest({
      accountId: 'acct_1',
      projectId: null,
      window: WINDOW_7D,
      bucket: 'hour',
      groupBy: 'model',
      model: 'all',
    });

    expect(request.start_time).toBe(WINDOW_7D.start.toISOString());
    expect(request.end_time).toBe(WINDOW_7D.end.toISOString());
  });

  it('translates group-by through the #312 mapping table', () => {
    expect(
      buildOverviewUsageRequest({
        accountId: 'acct_1',
        window: WINDOW_30D,
        bucket: 'day',
        groupBy: 'project',
        model: 'all',
      }).group_by
    ).toEqual(['project_id']);

    expect(
      buildOverviewUsageRequest({
        accountId: 'acct_1',
        window: WINDOW_30D,
        bucket: 'day',
        groupBy: 'model',
        model: 'all',
      }).group_by
    ).toEqual(['model']);
  });

  it('omits the model filter for the "all" sentinel, sets it otherwise', () => {
    const allModels = buildOverviewUsageRequest({
      accountId: 'acct_1',
      window: WINDOW_30D,
      bucket: 'day',
      groupBy: 'model',
      model: 'all',
    });
    expect(allModels.filters).toBeUndefined();

    const oneModel = buildOverviewUsageRequest({
      accountId: 'acct_1',
      window: WINDOW_30D,
      bucket: 'day',
      groupBy: 'model',
      model: 'gpt-4o-mini',
    });
    expect(oneModel.filters).toEqual({ model: 'gpt-4o-mini' });
  });
});

function point(overrides: Partial<UsageQueryResponse['points'][number]>) {
  return {
    bucket_start: '2026-08-01T00:00:00.000Z',
    requests: 1,
    usage_value: 1,
    total_cost: 1,
    prompt_tokens: 1,
    completion_tokens: 1,
    total_tokens: 2,
    ...overrides,
  } as UsageQueryResponse['points'][number];
}

describe('toSpendSeries', () => {
  it('groups points by the requested dimension and sorts each series oldest-first', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ project_id: 'proj_a', bucket_start: '2026-08-02T00:00:00.000Z', total_cost: 5 }),
        point({ project_id: 'proj_b', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 2 }),
        point({ project_id: 'proj_a', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 3 }),
      ],
    };

    const series = toSpendSeries(response, 'project');

    expect(series).toHaveLength(2);
    const projA = series.find((s) => s.key === 'proj_a');
    expect(projA?.points.map((p) => p.y)).toEqual([3, 5]);
    expect(projA?.points[0].x.getTime()).toBeLessThan(projA!.points[1].x.getTime());
  });

  it('falls back to "unassigned" when the dimension field is null (never drops the point)', () => {
    const response: UsageQueryResponse = {
      points: [point({ project_id: null, total_cost: 4 })],
    };

    const series = toSpendSeries(response, 'project');

    expect(series).toEqual([
      { key: 'unassigned', label: 'unassigned', points: [{ x: expect.any(Date), y: 4 }] },
    ]);
  });

  it('clamps a malformed total_cost to 0 rather than crashing or plotting NaN', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ project_id: 'proj_a', total_cost: Number.NaN }),
        point({ project_id: 'proj_a', total_cost: -10 }),
      ],
    };

    const series = toSpendSeries(response, 'project');

    expect(series[0].points.every((p) => p.y === 0)).toBe(true);
  });

  it('returns no series for an empty response (a real, queried, zero result — not fabricated)', () => {
    expect(toSpendSeries({ points: [] }, 'project')).toEqual([]);
  });
});

describe('toSpendShareSegments', () => {
  it('sums cost per dimension value across the whole range', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ model: 'gpt-4o-mini', total_cost: 3 }),
        point({ model: 'gpt-4o-mini', total_cost: 4 }),
        point({ model: 'claude-sonnet', total_cost: 2 }),
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
      points: [point({ total_cost: 1.5 }), point({ total_cost: 2.25 })],
    };

    expect(sumTotalCost(response)).toBeCloseTo(3.75);
  });

  it('returns 0, not NaN or a thrown error, for an empty response', () => {
    expect(sumTotalCost({ points: [] })).toBe(0);
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
    });
  });

});

describe('resolveOverviewWindow', () => {
  const NOW_FIXED = new Date('2026-08-29T12:00:00.000Z');

  it('rolls the preset back from now when no explicit span is set', () => {
    const { start, end } = resolveOverviewWindow('7d', '', '', NOW_FIXED);

    expect(end).toEqual(NOW_FIXED);
    expect(start.toISOString()).toBe('2026-08-22T12:00:00.000Z');
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
