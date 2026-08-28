import { describe, expect, it } from 'vitest';

import type { UsageQueryResponse } from '@lightbridge/api-rest';

import {
  buildBudgetConsumptionRequest,
  buildOverviewUsageRequest,
  currentPeriodRange,
  overviewGroupByToUsageGroupBy,
  sumTotalCost,
  toSpendShareSlices,
  toSpendSeries,
} from './overview-usage';

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
      range: '30d',
      bucket: 'day',
      groupBy: 'project',
      model: 'all',
      now: NOW,
    });

    expect(request.scope).toBe('account');
    expect(request.scope_id).toBe('acct_1');
  });

  it('scopes to the project when one is selected', () => {
    const request = buildOverviewUsageRequest({
      accountId: 'acct_1',
      projectId: 'proj_7',
      range: '30d',
      bucket: 'day',
      groupBy: 'project',
      model: 'all',
      now: NOW,
    });

    expect(request.scope).toBe('project');
    expect(request.scope_id).toBe('proj_7');
  });

  it('computes start_time as exactly `range` days before end_time', () => {
    const request = buildOverviewUsageRequest({
      accountId: 'acct_1',
      projectId: null,
      range: '7d',
      bucket: 'hour',
      groupBy: 'model',
      model: 'all',
      now: NOW,
    });

    expect(request.end_time).toBe('2026-08-28T12:00:00.000Z');
    expect(request.start_time).toBe('2026-08-21T12:00:00.000Z');
  });

  it('translates group-by through the #312 mapping table', () => {
    expect(
      buildOverviewUsageRequest({
        accountId: 'acct_1',
        range: '30d',
        bucket: 'day',
        groupBy: 'project',
        model: 'all',
        now: NOW,
      }).group_by
    ).toEqual(['project_id']);

    expect(
      buildOverviewUsageRequest({
        accountId: 'acct_1',
        range: '30d',
        bucket: 'day',
        groupBy: 'model',
        model: 'all',
        now: NOW,
      }).group_by
    ).toEqual(['model']);
  });

  it('omits the model filter for the "all" sentinel, sets it otherwise', () => {
    const allModels = buildOverviewUsageRequest({
      accountId: 'acct_1',
      range: '30d',
      bucket: 'day',
      groupBy: 'model',
      model: 'all',
      now: NOW,
    });
    expect(allModels.filters).toBeUndefined();

    const oneModel = buildOverviewUsageRequest({
      accountId: 'acct_1',
      range: '30d',
      bucket: 'day',
      groupBy: 'model',
      model: 'gpt-4o-mini',
      now: NOW,
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

describe('toSpendShareSlices', () => {
  it('sums cost per dimension value across the whole range', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ model: 'gpt-4o-mini', total_cost: 3 }),
        point({ model: 'gpt-4o-mini', total_cost: 4 }),
        point({ model: 'claude-sonnet', total_cost: 2 }),
      ],
    };

    const slices = toSpendShareSlices(response, 'model');

    expect(slices).toEqual(
      expect.arrayContaining([
        { key: 'gpt-4o-mini', label: 'gpt-4o-mini', value: 7 },
        { key: 'claude-sonnet', label: 'claude-sonnet', value: 2 },
      ])
    );
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
