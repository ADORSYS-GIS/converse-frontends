import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import { describe, expect, it } from 'vitest';

import type { DashboardPanelSpec } from './dashboard-spec';
import {
  formatMetric,
  latencyRowsByGroup,
  metricDelta,
  panelRowHref,
  readMetric,
  sumMetric,
  toPanelView,
  totalsByGroup,
} from './panel-adapters';

function point(overrides: Partial<UsageSeriesPoint>): UsageSeriesPoint {
  return {
    bucket_start: '2026-09-01T00:00:00Z',
    completion_tokens: 0,
    latency_samples: 0,
    prompt_tokens: 0,
    requests: 0,
    total_cost: 0,
    total_tokens: 0,
    usage_value: 0,
    ...overrides,
  };
}

const response = (points: UsageSeriesPoint[]): UsageQueryResponse => ({ points });

const spec = (overrides: Partial<DashboardPanelSpec>): DashboardPanelSpec =>
  ({
    id: 'p',
    type: 'stat',
    title: 'Panel',
    span: 1,
    metric: 'cost',
    query: { scope: 'all', limit: 100 },
    ...overrides,
  }) as DashboardPanelSpec;

const input = (overrides: Partial<Parameters<typeof toPanelView>[0]>) => ({
  spec: spec({}),
  response: response([]),
  scale: 'linear' as const,
  onScaleChange: () => {},
  ...overrides,
});

describe('readMetric', () => {
  it('converts cost from micro-USD, and reads counts as-is', () => {
    expect(readMetric(point({ total_cost: 2_500_000 }), 'cost')).toBeCloseTo(2.5, 10);
    expect(readMetric(point({ requests: 12 }), 'requests')).toBe(12);
    expect(readMetric(point({ total_tokens: 900 }), 'tokens')).toBe(900);
  });

  /** "Nothing reported" and "0 ms" are different facts — a null p50 must not drag a reading down. */
  it('contributes nothing for a bucket with no latency at all', () => {
    expect(readMetric(point({ latency_p50_ms: null }), 'latency')).toBe(0);
    expect(readMetric(point({ latency_p50_ms: 140 }), 'latency')).toBe(140);
  });
});

describe('sumMetric', () => {
  it('sums cost, requests and tokens', () => {
    const points = [
      point({ total_cost: 1_000_000, requests: 2 }),
      point({ total_cost: 500_000, requests: 3 }),
    ];
    expect(sumMetric(response(points), 'cost')).toBeCloseTo(1.5, 10);
    expect(sumMetric(response(points), 'requests')).toBe(5);
  });

  /** A mean of per-bucket percentiles is not a percentile of anything — the worst bucket is a
   *  real, defensible reading; an average would claim precision the data does not carry. */
  it('takes the WORST bucket for latency, never an average of percentiles', () => {
    expect(
      sumMetric(
        response([point({ latency_p50_ms: 90 }), point({ latency_p50_ms: 320 })]),
        'latency'
      )
    ).toBe(320);
  });
});

describe('metricDelta', () => {
  it('names the comparison window explicitly', () => {
    expect(metricDelta(112, 100, 'weekly')).toEqual({
      direction: 'up',
      label: '12% vs previous week',
    });
    expect(metricDelta(88, 100, 'monthly')).toEqual({
      direction: 'down',
      label: '12% vs previous month',
    });
  });

  it('reads a zero base as "new this period", never a percentage of nothing', () => {
    expect(metricDelta(5, 0, 'monthly')).toEqual({ direction: 'up', label: 'new this period' });
    expect(metricDelta(0, 0, 'monthly')).toEqual({ direction: 'flat', label: 'no change' });
  });

  it('calls a sub-half-percent move flat rather than "0%"', () => {
    expect(metricDelta(100.2, 100, 'weekly').direction).toBe('flat');
  });
});

describe('totalsByGroup', () => {
  it('ranks descending and folds a null group key into the labelled sentinel', () => {
    const totals = totalsByGroup(
      response([
        point({ model: 'gpt-4o', total_cost: 3_000_000 }),
        point({ model: null, total_cost: 5_000_000 }),
        point({ model: 'claude', total_cost: 1_000_000 }),
      ]),
      'model',
      'cost'
    );
    expect(totals.map((t) => t.key)).toEqual(['unassigned', 'gpt-4o', 'claude']);
  });

  /** A dimension lane A3 has not landed yet has no point field to read — the sentinel, not a
   *  crash and not a fabricated value. */
  it('degrades to the sentinel for a dimension the response does not carry', () => {
    const totals = totalsByGroup(response([point({ total_cost: 1_000_000 })]), 'azp', 'cost');
    expect(totals).toEqual([{ key: 'unassigned', value: 1 }]);
  });
});

describe('latencyRowsByGroup', () => {
  it('sums samples and keeps the worst percentile per group', () => {
    const rows = latencyRowsByGroup(
      response([
        point({
          model: 'gpt-4o',
          latency_samples: 60,
          latency_p50_ms: 100,
          latency_p95_ms: 300,
          latency_p99_ms: 500,
        }),
        point({
          model: 'gpt-4o',
          latency_samples: 60,
          latency_p50_ms: 140,
          latency_p95_ms: 280,
          latency_p99_ms: 900,
        }),
      ]),
      'model'
    );
    expect(rows[0]).toMatchObject({
      model: 'gpt-4o',
      samples: 120,
      p50Ms: 140,
      p95Ms: 300,
      p99Ms: 900,
    });
  });

  it('leaves a zero-sample group at zero samples so LatencyStatCards hides it', () => {
    const rows = latencyRowsByGroup(
      response([point({ model: 'mistral', latency_samples: 0, latency_p50_ms: null })]),
      'model'
    );
    expect(rows[0].samples).toBe(0);
  });
});

describe('panelRowHref', () => {
  it('substitutes :key and encodes it', () => {
    expect(panelRowHref('/admin/usage/actors/:key?type=user', 'a b')).toBe(
      '/admin/usage/actors/a%20b?type=user'
    );
  });

  it('never links the unassigned sentinel — there is no page behind "nobody"', () => {
    expect(panelRowHref('/x/:key', 'unassigned')).toBeUndefined();
    expect(panelRowHref(undefined, 'u1')).toBeUndefined();
  });
});

describe('toPanelView', () => {
  it('builds a stat with a delta only when a comparison response arrived', () => {
    const view = toPanelView(
      input({
        spec: spec({ compare: true }),
        response: response([point({ total_cost: 2_000_000 })]),
        compareResponse: response([point({ total_cost: 1_000_000 })]),
        compareCadence: 'monthly',
      })
    );
    expect(view).toMatchObject({ kind: 'stat', metric: '$2.00' });
    expect(view.kind === 'stat' && view.delta?.label).toBe('100% vs previous month');

    const noCompare = toPanelView(
      input({ response: response([point({ total_cost: 2_000_000 })]) })
    );
    expect(noCompare.kind === 'stat' && noCompare.delta).toBeUndefined();
  });

  it('renders a dash, never $0.00, for a cost-per-token with no tokens', () => {
    const view = toPanelView(
      input({
        spec: spec({ metric: 'derived:avgCostPerMillionTokens' }),
        response: response([point({ total_cost: 5_000_000 })]),
      })
    );
    expect(view).toMatchObject({ kind: 'stat', metric: '—' });
  });

  it('gives a donut its ring centre total and its segments', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'donut',
          metric: 'requests',
          query: { scope: 'all', group_by: ['model'], limit: 10 },
        }),
        response: response([
          point({ model: 'gpt-4o', requests: 70 }),
          point({ model: 'claude', requests: 30 }),
        ]),
      })
    );
    expect(view).toMatchObject({ kind: 'donut', centreMetric: '100', centreLabel: 'TOTAL' });
    expect(view.kind === 'donut' && view.segments.map((s) => s.key)).toEqual(['gpt-4o', 'claude']);
  });

  it('links ranked rows through options.link', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'ranked',
          query: { scope: 'all', group_by: ['user_id'], limit: 10 },
          options: { link: '/admin/usage/actors/:key?type=user' },
        }),
        response: response([point({ user_id: 'u1', total_cost: 1_000_000 })]),
      })
    );
    expect(view.kind === 'ranked' && view.hrefFor?.(view.rows[0])).toBe(
      '/admin/usage/actors/u1?type=user'
    );
  });

  it('never fabricates a $ axis on a COUNT series', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'series',
          metric: 'requests',
          query: { scope: 'all', group_by: ['model'], limit: 10 },
        }),
        response: response([point({ model: 'gpt-4o', requests: 12 })]),
      })
    );
    expect(view.kind === 'series' && view.formatYTick?.(1200)).toBe('1,200');
  });

  it('builds one table row per group, with the three metric columns', () => {
    const view = toPanelView(
      input({
        spec: spec({ type: 'table', query: { scope: 'all', group_by: ['user_id'], limit: 10 } }),
        response: response([
          point({ user_id: 'u1', total_cost: 1_500_000, requests: 4, total_tokens: 1200 }),
        ]),
      })
    );
    expect(view.kind === 'table' && view.rows[0].cells).toMatchObject({
      label: 'u1',
      cost: '$1.50',
      requests: '4',
      tokens: '1,200',
    });
  });
});

describe('formatMetric', () => {
  it('ladders money, groups counts, and rounds latency to whole milliseconds', () => {
    expect(formatMetric(1234.5, 'cost')).toContain('1');
    expect(formatMetric(41208, 'requests')).toBe('41,208');
    expect(formatMetric(140.7, 'latency')).toBe('141 ms');
  });
});
