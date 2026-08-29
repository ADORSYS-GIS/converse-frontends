import { describe, expect, it } from 'vitest';

import type { UsageQueryResponse } from '@lightbridge/api-rest';

import { OVERVIEW_BUCKETS } from '../client/url-state';
import {
  buildBudgetConsumptionRequest,
  buildOverviewUsageRequest,
  currentPeriodRange,
  overviewGroupByToUsageGroupBy,
  sumTotalCost,
  toLatencySeries,
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

  /**
   * The bug this suite did not catch: the Overview sent `bucket: 'day'` and every dashboard load
   * came back `400 Bad request: bucket must look like \`5 minutes\`, \`1 hour\`, or \`1 day\``.
   *
   * Asserted against the backend's OWN regex, copied verbatim from
   * `lightbridge-authz` `crates/lightbridge-authz-usage/src/repo.rs`'s `validate_bucket_interval`,
   * rather than against a hand-written list of expected strings. A list would happily accept
   * `'1 week'` -- which reads correct, is what anyone would write for the `week` bucket, and is
   * explicitly refused by that validator (`validate_bucket_interval_rejects_unexpected_values`
   * asserts it). This encodes the real contract, so a new bucket option cannot be added without
   * either mapping it to something the backend accepts or turning this red.
   */
  const BACKEND_BUCKET_RE = /^\d+\s+(second|seconds|minute|minutes|hour|hours|day|days)$/;

  it.each(OVERVIEW_BUCKETS)('sends bucket %s as an interval the backend accepts', (bucket) => {
    const request = buildOverviewUsageRequest({
      accountId: 'acct_1',
      range: '30d',
      bucket,
      groupBy: 'project',
      model: 'all',
      now: NOW,
    });
    expect(request.bucket).toMatch(BACKEND_BUCKET_RE);
  });

  it('maps each bucket to the expected interval width', () => {
    const bucketFor = (bucket: (typeof OVERVIEW_BUCKETS)[number]) =>
      buildOverviewUsageRequest({
        accountId: 'acct_1',
        range: '30d',
        bucket,
        groupBy: 'project',
        model: 'all',
        now: NOW,
      }).bucket;

    expect(bucketFor('hour')).toBe('1 hour');
    expect(bucketFor('day')).toBe('1 day');
    // NOT '1 week' -- the backend regex has no `week` arm at all.
    expect(bucketFor('week')).toBe('7 days');
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

/** Dollars -> the micro-USD the usage backend actually sends
 *  (`usage_events.total_cost`; see `microUsdToUsd`'s doc comment). Written out at every call site
 *  so a reader can see the unit boundary the mapping layer exists to cross, instead of inferring
 *  it from a bare number. */
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

describe('toSpendSeries', () => {
  it('groups points by the requested dimension and sorts each series oldest-first', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ project_id: 'proj_a', bucket_start: '2026-08-02T00:00:00.000Z', total_cost: usd(5) }),
        point({ project_id: 'proj_b', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: usd(2) }),
        point({ project_id: 'proj_a', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: usd(3) }),
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
      points: [point({ project_id: null, total_cost: usd(4) })],
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
        point({ model: 'gpt-4o-mini', total_cost: usd(3) }),
        point({ model: 'gpt-4o-mini', total_cost: usd(4) }),
        point({ model: 'claude-sonnet', total_cost: usd(2) }),
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

describe('toLatencySeries', () => {
  it('keeps one per-bucket p95 value per group — real observed data, not synthesised from the percentile', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ model: 'gpt-4o-mini', latency_samples: 120, latency_p95_ms: 310 }),
        point({ model: 'gpt-4o-mini', latency_samples: 140, latency_p95_ms: 340 }),
        point({ model: 'claude-sonnet', latency_samples: 200, latency_p95_ms: 900 }),
      ],
    };

    const { series, seriesWithoutLatency, totalSamples } = toLatencySeries(response, 'model');

    const gpt = series.find((s) => s.key === 'gpt-4o-mini');
    expect(gpt?.values).toEqual([310, 340]);
    expect(gpt?.value).toBe('peak p95 340 ms');
    const claude = series.find((s) => s.key === 'claude-sonnet');
    expect(claude?.values).toEqual([900]);
    expect(claude?.value).toBe('peak p95 900 ms');
    expect(seriesWithoutLatency).toEqual([]);
    expect(totalSamples).toBe(460);
  });

  it('a group whose buckets all report zero samples still gets a row, named as reporting none', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ model: 'gpt-4o-mini', latency_samples: 100, latency_p95_ms: 300 }),
        point({ model: 'embed-3', latency_samples: 0, latency_p95_ms: null }),
      ],
    };

    const { series, seriesWithoutLatency } = toLatencySeries(response, 'model');

    const embed = series.find((s) => s.key === 'embed-3');
    expect(embed).toEqual({ key: 'embed-3', label: 'embed-3', values: [], value: 'no latency reported' });
    // The model with real data is untouched by its sibling reporting nothing.
    expect(series.find((s) => s.key === 'gpt-4o-mini')?.values).toEqual([300]);
    expect(seriesWithoutLatency).toEqual(['embed-3']);
  });

  it('every group reporting zero samples still returns one row per group, all honestly empty', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ model: 'gpt-4o-mini', latency_samples: 0, latency_p95_ms: null }),
        point({ model: 'claude-sonnet', latency_samples: 0, latency_p95_ms: null }),
      ],
    };

    const { series, seriesWithoutLatency, totalSamples } = toLatencySeries(response, 'model');

    expect(series).toHaveLength(2);
    expect(series.every((s) => s.values.length === 0 && s.value === 'no latency reported')).toBe(
      true
    );
    expect(seriesWithoutLatency).toEqual(['gpt-4o-mini', 'claude-sonnet']);
    expect(totalSamples).toBe(0);
  });

  it('drops a null percentile riding alongside a non-zero sample count (defensive against a malformed response)', () => {
    const response: UsageQueryResponse = {
      points: [point({ model: 'gpt-4o-mini', latency_samples: 50, latency_p95_ms: null })],
    };

    const { series, seriesWithoutLatency, totalSamples } = toLatencySeries(response, 'model');

    // The sample count is still real (it counts toward totalSamples/telemetry) even though this
    // particular bucket had nothing plottable — the two facts are independent.
    expect(series).toEqual([
      { key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: [], value: 'no latency reported' },
    ]);
    expect(seriesWithoutLatency).toEqual(['gpt-4o-mini']);
    expect(totalSamples).toBe(50);
  });

  it('ignores a non-null percentile on a bucket that reported zero samples (malformed response, gated on the sample count, not the percentile alone)', () => {
    const response: UsageQueryResponse = {
      points: [point({ model: 'gpt-4o-mini', latency_samples: 0, latency_p95_ms: 500 })],
    };

    const { series, seriesWithoutLatency } = toLatencySeries(response, 'model');

    // latency_samples === 0 means "no event in this bucket reported latency at all"
    // (`openapi/usage.backend.yaml`'s own doc comment) — a stray percentile value alongside it is
    // a malformed response, never a real observation, so it must not surface as one.
    expect(series).toEqual([
      { key: 'gpt-4o-mini', label: 'gpt-4o-mini', values: [], value: 'no latency reported' },
    ]);
    expect(seriesWithoutLatency).toEqual(['gpt-4o-mini']);
  });

  it('a single sparse bucket still produces one real kept value, not an interpolated shape', () => {
    const response: UsageQueryResponse = {
      points: [point({ model: 'embed-3', latency_samples: 3, latency_p95_ms: 88 })],
    };

    const { series } = toLatencySeries(response, 'model');

    expect(series).toEqual([
      { key: 'embed-3', label: 'embed-3', values: [88], value: 'peak p95 88 ms' },
    ]);
  });

  it('returns no series for an empty response', () => {
    expect(toLatencySeries({ points: [] }, 'model')).toEqual({
      series: [],
      seriesWithoutLatency: [],
      totalSamples: 0,
    });
  });
});

describe('sumTotalCost', () => {
  it('sums every point regardless of grouping', () => {
    const response: UsageQueryResponse = {
      points: [point({ total_cost: usd(1.5) }), point({ total_cost: usd(2.25) })],
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
