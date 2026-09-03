import type React from 'react';
import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import type { DashboardPanelView } from '@lightbridge/ui-web/src/sections/dashboard-panels';
import { describe, expect, it } from 'vitest';

import type { DashboardPanelSpec } from './dashboard-spec';
import {
  comparisonSeries,
  distinctCountSeries,
  formatMetric,
  latencyPercentileSeries,
  latencyRowsByGroup,
  metricDelta,
  panelDimension,
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

const response = (points: UsageSeriesPoint[]): UsageQueryResponse => ({ truncated: false, points });

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

  // Owner check, 2026-09-03: the three channel rings on `/accounts/<id>/overview` must never come
  // back as blank space, and must never claim a unit they did not measure. `DonutChart`'s own
  // default is "No spend in this range." — right for a cost ring, wrong for the tokens and requests
  // rings beside it, and wrong for all three when the events exist but carry no `azp` at all.
  it('tells an empty channel ring what is missing, not that there was no spend', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'donut',
          metric: 'requests',
          query: { scope: 'account', scope_id: 'a1', group_by: ['azp'], limit: 10 },
        }),
        groupBy: ['azp'],
        response: response([]),
      })
    );
    expect(view).toMatchObject({
      kind: 'donut',
      emptyMessage: 'No channel recorded on these events.',
    });
  });

  it('leaves a dimension it cannot word honestly on the primitive default', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'donut',
          query: { scope: 'all', group_by: ['user_id'], limit: 10 },
        }),
        groupBy: ['user_id'],
        response: response([]),
      })
    );
    expect(view.kind === 'donut' && view.emptyMessage).toBeUndefined();
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
      cost: '$1.50',
      requests: '4',
      tokens: '1,200',
    });
    // The label cell is an ELEMENT (`IdentityLines`), not a string, since #448: a user row is a
    // name over an email, and the second line is the half that tells two people with the same
    // display name apart.
    expect(labelCellText(view)).toBe('u1');
  });
});

// ── converse-frontends#448: the lens, the actor table, the plan stat-group ───────────────────
describe('toPanelView — the actor table', () => {
  const actorSpec = spec({
    type: 'table',
    query: { scope: 'all', group_by: ['user_id'], limit: 100 },
    options: {
      lens: 'user',
      rowLabel: 'Actor',
      unit: 'actors',
      columns: ['label', 'type', 'cost', 'requests', 'tokens', 'lastActive'],
      link: '/admin/usage/actors/:key?type=$lens',
    },
  });

  const labelFor = (kind: 'user' | 'account' | 'project', id: string) =>
    id === 'u1'
      ? { label: 'Ada Lovelace', secondary: 'ada@example.com', subtle: false }
      : { label: id, subtle: false };

  const rows = (over: Partial<Parameters<typeof toPanelView>[0]> = {}) => {
    const view = toPanelView(
      input({
        spec: actorSpec,
        groupBy: ['user_id'],
        lens: 'user',
        link: '/admin/usage/actors/:key?type=user',
        labelFor,
        response: response([
          point({
            user_id: 'u1',
            bucket_start: '2026-09-03T00:00:00Z',
            total_cost: 3_000_000,
            requests: 9,
            total_tokens: 900,
          }),
          point({
            user_id: 'u2',
            bucket_start: '2026-09-01T00:00:00Z',
            total_cost: 1_000_000,
            requests: 4,
            total_tokens: 100,
          }),
        ]),
        ...over,
      })
    );
    if (view.kind !== 'table') throw new Error('not a table view');
    return view;
  };

  it('draws exactly the columns the YAML declared, in order', () => {
    expect(rows().columns.map((column) => column.key)).toEqual([
      'label',
      'type',
      'cost',
      'requests',
      'tokens',
      'lastActive',
    ]);
    expect(rows().columns[0].header).toBe('Actor');
  });

  it('shows the resolved name over the email, and says what a row IS', () => {
    const cells = rows().rows[0].cells;
    expect(labelCell(rows())).toMatchObject({
      label: 'Ada Lovelace',
      detail: 'ada@example.com',
    });
    expect(cells.type).toBe('User');
  });

  it('dates last activity from the most recent bucket, in UTC, at bucket resolution', () => {
    expect(rows().rows[0].cells.lastActive).toBe('2026-09-03 00:00 UTC');
  });

  it('links each row at the lens-resolved actor route', () => {
    expect(rows().rows[0].href).toBe('/admin/usage/actors/u1?type=user');
  });

  it('defaults to cost descending, with no sort in the URL', () => {
    expect(rows().rows.map((row) => row.key)).toEqual(['u1', 'u2']);
  });

  it('sorts client-side on the URL-held key and direction', () => {
    expect(
      rows({ sort: { key: 'requests', direction: 'asc' } }).rows.map((row) => row.key)
    ).toEqual(['u2', 'u1']);
    expect(rows({ sort: { key: 'tokens', direction: 'desc' } }).rows.map((row) => row.key)).toEqual(
      ['u1', 'u2']
    );
  });

  it('carries the page index through rather than slicing — the page SIZE is the panel own', () => {
    const view = rows({ page: 2, onPageChange: () => {} });
    expect(view.page).toBe(2);
    // Every row is still present; `TableBody` is what windows them at its own density.
    expect(view.rows).toHaveLength(2);
    expect(view.total).toBe(2);
  });

  it('keeps an unresolved actor row, labelled, rather than dropping its spend', () => {
    const view = rows({
      response: response([point({ user_id: 'u_ghost', total_cost: 5_000_000, requests: 1 })]),
    });
    expect(view.rows).toHaveLength(1);
    expect(labelCell(view).label).toBe('u_ghost');
  });

  it('reads the LENS-resolved dimension, not the spec own — an account is not a user', () => {
    const view = toPanelView(
      input({
        spec: actorSpec,
        groupBy: ['account_id'],
        lens: 'account',
        link: '/admin/usage/actors/:key?type=account',
        labelFor: (_kind, id) => ({ label: `acct ${id}`, subtle: false }),
        response: response([point({ account_id: 'a1', total_cost: 1_000_000, requests: 1 })]),
      })
    );
    if (view.kind !== 'table') throw new Error('not a table view');
    expect(view.rows[0].key).toBe('a1');
    expect(view.rows[0].cells.type).toBe('Account');
    expect(view.rows[0].href).toBe('/admin/usage/actors/a1?type=account');
  });

  it('keeps the pre-#448 four-column shape when the YAML declares no columns', () => {
    const view = toPanelView(
      input({
        spec: spec({ type: 'table', query: { scope: 'all', group_by: ['account_id'], limit: 10 } }),
        groupBy: ['account_id'],
        response: response([point({ account_id: 'a1', total_cost: 1_000_000 })]),
      })
    );
    expect(view.kind === 'table' && view.columns.map((c) => c.key)).toEqual([
      'label',
      'cost',
      'requests',
      'tokens',
    ]);
  });
});

describe('toPanelView — the plan stat-group', () => {
  it('counts distinct accounts per billing plan, one card each', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'stat-group',
          metric: 'derived:activeActors',
          query: { scope: 'all', group_by: ['account_id', 'billing_plan'], limit: 100 },
        }),
        groupBy: ['account_id', 'billing_plan'],
        response: response([
          point({ account_id: 'a1', billing_plan: 'pro', requests: 2 }),
          point({ account_id: 'a2', billing_plan: 'pro', requests: 2 }),
          point({ account_id: 'a3', billing_plan: 'free', requests: 2 }),
        ]),
      })
    );
    expect(view.kind === 'stat-group' && view.stats).toEqual([
      { key: 'pro', label: 'pro', metric: '2' },
      { key: 'free', label: 'free', metric: '1' },
    ]);
  });

  it('degrades to one honest card when there is no second dimension to break down by', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'stat-group',
          title: 'Active accounts',
          metric: 'derived:activeActors',
          query: { scope: 'all', group_by: ['account_id'], limit: 100 },
        }),
        groupBy: ['account_id'],
        response: response([point({ account_id: 'a1', requests: 2 })]),
      })
    );
    expect(view.kind === 'stat-group' && view.stats).toEqual([
      { key: 'account_id', label: 'Active accounts', metric: '1' },
    ]);
  });

  it('still SUMS for a non-derived metric — the two readings are what `metric` picks between', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'stat-group',
          metric: 'cost',
          query: { scope: 'all', group_by: ['billing_plan'], limit: 100 },
        }),
        groupBy: ['billing_plan'],
        response: response([point({ billing_plan: 'pro', total_cost: 2_000_000 })]),
      })
    );
    expect(view.kind === 'stat-group' && view.stats).toEqual([
      { key: 'pro', label: 'pro', metric: '$2.00' },
    ]);
  });
});

describe('toPanelView — labels on ranked, share, donut and series', () => {
  const labelFor = (_kind: 'user' | 'account' | 'project', id: string) =>
    id === 'u1' ? { label: 'Ada Lovelace', subtle: false } : { label: id, subtle: false };

  const withUsers = (type: 'ranked' | 'share' | 'donut' | 'series') =>
    toPanelView(
      input({
        spec: spec({ type, query: { scope: 'all', group_by: ['user_id'], limit: 10 } }),
        groupBy: ['user_id'],
        labelFor,
        response: response([point({ user_id: 'u1', total_cost: 1_000_000, requests: 1 })]),
      })
    );

  it.each(['ranked', 'share', 'donut'] as const)('resolves actor ids in a %s panel', (type) => {
    const view = withUsers(type);
    const first =
      view.kind === 'ranked' ? view.rows[0] : view.kind === 'share' ? view.segments[0] : null;
    const label = first?.label ?? (view.kind === 'donut' ? view.segments[0].label : undefined);
    expect(label).toBe('Ada Lovelace');
  });

  it('resolves actor ids in a series panel too', () => {
    const view = withUsers('series');
    expect(view.kind === 'series' && view.series[0].label).toBe('Ada Lovelace');
  });

  it('never resolves a dimension that has no identity — a model is its own name', () => {
    const view = toPanelView(
      input({
        spec: spec({ type: 'ranked', query: { scope: 'all', group_by: ['model'], limit: 10 } }),
        groupBy: ['model'],
        labelFor: () => ({ label: 'WRONG', subtle: false }),
        response: response([point({ model: 'gpt-4o', total_cost: 1_000_000 })]),
      })
    );
    expect(view.kind === 'ranked' && view.rows[0].label).toBe('gpt-4o');
  });
});

/** The `label` cell's own props — the cell is `IdentityLines`, so a test asserting on the row's
 *  identity reads the props rather than a string. */
function labelCell(view: DashboardPanelView): { label: string; detail?: string; subtle?: boolean } {
  if (view.kind !== 'table') throw new Error('not a table view');
  const cell = view.rows[0].cells.label as React.ReactElement<{
    label: string;
    detail?: string;
    subtle?: boolean;
  }>;
  return cell.props;
}

function labelCellText(view: DashboardPanelView): string {
  return labelCell(view).label;
}

const DAY = 86_400_000;

describe('comparisonSeries', () => {
  it('sums the previous window ungrouped and re-bases it forward so the two overlay', () => {
    const series = comparisonSeries(
      response([
        point({ bucket_start: '2026-07-01T00:00:00Z', model: 'a', total_cost: 1_000_000 }),
        point({ bucket_start: '2026-07-01T00:00:00Z', model: 'b', total_cost: 2_000_000 }),
        point({ bucket_start: '2026-07-02T00:00:00Z', model: 'a', total_cost: 4_000_000 }),
      ]),
      'cost',
      31 * DAY
    );
    // Grouped points collapse into ONE per bucket — a comparison is a whole-period reading.
    expect(series.points).toEqual([
      { x: new Date('2026-08-01T00:00:00Z'), y: 3 },
      { x: new Date('2026-08-02T00:00:00Z'), y: 4 },
    ]);
  });

  it('is dashed and labelled, so it needs no legend to be told apart', () => {
    const series = comparisonSeries(response([]), 'cost', 0);
    expect(series.dashed).toBe(true);
    expect(series.label).toBe('Previous period');
  });
});

describe('distinctCountSeries', () => {
  it('counts distinct group values per bucket, one line per dimension', () => {
    const series = distinctCountSeries(
      response([
        point({
          bucket_start: '2026-09-01T00:00:00Z',
          account_id: 'a1',
          project_id: 'p1',
          requests: 3,
        }),
        point({
          bucket_start: '2026-09-01T00:00:00Z',
          account_id: 'a1',
          project_id: 'p2',
          requests: 1,
        }),
        point({
          bucket_start: '2026-09-02T00:00:00Z',
          account_id: 'a2',
          project_id: 'p3',
          requests: 2,
        }),
      ]),
      ['account_id', 'project_id']
    );
    expect(series.map((s) => s.label)).toEqual(['Active accounts', 'Active projects']);
    expect(series[0].points.map((p) => p.y)).toEqual([1, 1]);
    expect(series[1].points.map((p) => p.y)).toEqual([2, 1]);
  });

  it('zero-fills a bucket a dimension saw nothing in rather than dropping it', () => {
    const series = distinctCountSeries(
      response([
        point({ bucket_start: '2026-09-01T00:00:00Z', account_id: 'a1', requests: 3 }),
        // Real bucket, no requests: not evidence of activity, but still part of the x-domain.
        point({ bucket_start: '2026-09-02T00:00:00Z', account_id: 'a1', requests: 0 }),
      ]),
      ['account_id']
    );
    expect(series[0].points.map((p) => p.y)).toEqual([1, 0]);
  });
});

describe('toPanelView — series', () => {
  it('appends the dashed comparison overlay when a compare twin resolved', () => {
    const view = toPanelView(
      input({
        spec: spec({ type: 'series', metric: 'cost', compare: true }),
        response: response([
          point({ bucket_start: '2026-08-01T00:00:00Z', total_cost: 5_000_000 }),
        ]),
        compareResponse: response([
          point({ bucket_start: '2026-07-01T00:00:00Z', total_cost: 4_000_000 }),
        ]),
        compareShiftMs: 31 * DAY,
      })
    );
    expect(view.kind === 'series' && view.series.map((s) => s.label)).toEqual([
      'Total',
      'Previous period',
    ]);
    expect(view.kind === 'series' && view.series[1].dashed).toBe(true);
  });

  it('draws no overlay at all when the twin failed — the figure is real, only the delta is not', () => {
    const view = toPanelView(
      input({
        spec: spec({ type: 'series', metric: 'cost', compare: true }),
        response: response([
          point({ bucket_start: '2026-08-01T00:00:00Z', total_cost: 5_000_000 }),
        ]),
      })
    );
    expect(view.kind === 'series' && view.series).toHaveLength(1);
  });

  it('plots a derived distinct-count metric as counts, never dollars', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'series',
          metric: 'derived:activeActorsPerBucket',
          query: { scope: 'all', group_by: ['account_id', 'project_id'], limit: 10 },
        }),
        response: response([
          point({
            bucket_start: '2026-09-01T00:00:00Z',
            account_id: 'a1',
            project_id: 'p1',
            requests: 2,
          }),
        ]),
      })
    );
    expect(view.kind === 'series' && view.series.map((s) => s.label)).toEqual([
      'Active accounts',
      'Active projects',
    ]);
    expect(view.kind === 'series' && view.formatYTick?.(1200)).toBe('1,200');
  });
});

describe('toPanelView — table labels', () => {
  it('says what a row IS when the panel declares it, and counts in that unit', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'table',
          query: { scope: 'all', group_by: ['account_id'], limit: 10 },
          options: { rowLabel: 'Account', unit: 'accounts' },
        }),
        response: response([point({ account_id: 'a1', total_cost: 1_000_000 })]),
      })
    );
    expect(view.kind === 'table' && view.columns[0].header).toBe('Account');
    expect(view.kind === 'table' && view.unit).toBe('accounts');
  });

  it('falls back to the actor wording when a panel declares neither', () => {
    const view = toPanelView(
      input({
        spec: spec({ type: 'table', query: { scope: 'all', group_by: ['user_id'], limit: 10 } }),
        response: response([]),
      })
    );
    expect(view.kind === 'table' && view.columns[0].header).toBe('Actor');
    expect(view.kind === 'table' && view.unit).toBe('actors');
  });
});

describe('formatMetric', () => {
  it('ladders money, groups counts, and rounds latency to whole milliseconds', () => {
    expect(formatMetric(1234.5, 'cost')).toContain('1');
    expect(formatMetric(41208, 'requests')).toBe('41,208');
    expect(formatMetric(140.7, 'latency')).toBe('141 ms');
  });
});

/**
 * C12 (converse-frontends#455) — the three adapter extensions the account and settings overview
 * pages needed: which dimension a panel reads, what an opaque key is CALLED, and a share bar's
 * own Top-N (`ShareBar` has no such notion of its own, unlike `RankedSeriesRows`).
 */
describe('panelDimension', () => {
  it('defaults to the query’s first group-by dimension', () => {
    expect(
      panelDimension(spec({ query: { scope: 'all', group_by: ['model'], limit: 10 } }), undefined)
    ).toBe('model');
  });

  /** What makes ONE grouped request serve several panels — worth far more under a family fan-out,
   *  where every distinct query shape costs N requests rather than one. */
  it('reads a dimension the panel names explicitly, even when it is not the first', () => {
    expect(
      panelDimension(
        spec({
          query: { scope: 'all', group_by: ['account_id', 'model'], limit: 10 },
          options: { dimension: 'model' },
        }),
        undefined
      )
    ).toBe('model');
  });

  it('reads NO dimension for `none` — the ungrouped total off a grouped response', () => {
    expect(
      panelDimension(
        spec({
          query: { scope: 'all', group_by: ['account_id', 'model'], limit: 10 },
          options: { dimension: 'none' },
        }),
        undefined
      )
    ).toBeUndefined();
  });

  it('sums a grouped response into ONE series when the panel reads no dimension', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'series',
          metric: 'cost',
          query: { scope: 'all', group_by: ['account_id', 'model'], limit: 10 },
          options: { dimension: 'none' },
        }),
        response: response([
          point({ account_id: 'a', model: 'x', total_cost: 1_000_000 }),
          point({ account_id: 'b', model: 'y', total_cost: 2_000_000 }),
        ]),
      })
    );
    expect(view.kind === 'series' && view.series).toHaveLength(1);
    expect(view.kind === 'series' && view.series[0].points[0].y).toBeCloseTo(3, 10);
  });

  it('splits the SAME response per account when the panel reads account_id', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'series',
          metric: 'cost',
          query: { scope: 'all', group_by: ['account_id', 'model'], limit: 10 },
          options: { dimension: 'account_id' },
        }),
        response: response([
          point({ account_id: 'a', model: 'x', total_cost: 1_000_000 }),
          point({ account_id: 'b', model: 'y', total_cost: 2_000_000 }),
        ]),
      })
    );
    expect(view.kind === 'series' && view.series.map((s) => s.key)).toEqual(['b', 'a']);
  });
});

describe('resolveLabel', () => {
  const labels = (dimension: string, key: string) =>
    dimension === 'project_id' && key === 'proj_7' ? 'gateway-prod' : undefined;

  const projectRanked = spec({
    type: 'ranked',
    metric: 'cost',
    query: { scope: 'account', group_by: ['project_id'], limit: 10 },
  });

  /** The console's most visible papercut if it regressed: an opaque cuid2 on the most-read chart
   *  in the product. */
  it('names a project id the console already knows about', () => {
    const view = toPanelView(
      input({
        spec: projectRanked,
        response: response([point({ project_id: 'proj_7', total_cost: 1_000_000 })]),
        localLabels: labels,
      })
    );
    expect(view.kind === 'ranked' && view.rows[0].label).toBe('gateway-prod');
    // The KEY stays the id — it is the identity a row link and a selection match on.
    expect(view.kind === 'ranked' && view.rows[0].key).toBe('proj_7');
  });

  it('falls back to the id when nothing resolves, never to a fabricated name', () => {
    const view = toPanelView(
      input({
        spec: projectRanked,
        response: response([point({ project_id: 'proj_gone', total_cost: 1_000_000 })]),
        localLabels: labels,
      })
    );
    expect(view.kind === 'ranked' && view.rows[0].label).toBe('proj_gone');
  });

  it('never lets a resolver rename the unassigned sentinel', () => {
    const view = toPanelView(
      input({
        spec: projectRanked,
        response: response([point({ project_id: null, total_cost: 1_000_000 })]),
        localLabels: () => 'WRONG',
      })
    );
    expect(view.kind === 'ranked' && view.rows[0].label).toBe('Unassigned');
    expect(view.kind === 'ranked' && view.rows[0].subtle).toBe(true);
  });

  it('resolves labels on series, latency cards and table rows too', () => {
    const seriesView = toPanelView(
      input({
        spec: spec({
          type: 'series',
          metric: 'cost',
          query: { scope: 'account', group_by: ['project_id'], limit: 10 },
        }),
        response: response([point({ project_id: 'proj_7', total_cost: 1_000_000 })]),
        localLabels: labels,
      })
    );
    expect(seriesView.kind === 'series' && seriesView.series[0].label).toBe('gateway-prod');

    const latencyView = toPanelView(
      input({
        spec: spec({
          type: 'latency-cards',
          metric: 'latency',
          query: { scope: 'account', group_by: ['project_id'], limit: 10 },
        }),
        response: response([
          point({ project_id: 'proj_7', latency_samples: 10, latency_p50_ms: 100 }),
        ]),
        localLabels: labels,
      })
    );
    expect(latencyView.kind === 'latency-cards' && latencyView.rows[0].model).toBe('gateway-prod');

    const tableView = toPanelView(
      input({
        spec: spec({
          type: 'table',
          metric: 'cost',
          query: { scope: 'account', group_by: ['project_id'], limit: 10 },
        }),
        response: response([point({ project_id: 'proj_7', total_cost: 1_000_000 })]),
        localLabels: labels,
      })
    );
    // The table's label cell is an `IdentityLines` element (C5's two-line actor identity), so the
    // assertion reads its prop rather than a string — the local name still wins, and it is not
    // rendered subtle, because a resolved name is not a sentinel.
    const labelCell =
      tableView.kind === 'table'
        ? (tableView.rows[0].cells.label as React.ReactElement<{ label: string; subtle: boolean }>)
        : null;
    expect(labelCell?.props.label).toBe('gateway-prod');
    expect(labelCell?.props.subtle).toBe(false);
  });
});

describe('share panels with a Top-N', () => {
  const shareSpec = (topN?: number) =>
    spec({
      type: 'share',
      metric: 'cost',
      query: { scope: 'all', group_by: ['model'], limit: 10 },
      options: topN === undefined ? undefined : { topN },
    });

  const manyModels = response(
    ['a', 'b', 'c', 'd', 'e', 'f'].map((model, i) =>
      point({ model, total_cost: (6 - i) * 1_000_000 })
    )
  );

  /** The tail is FOLDED, never dropped: a share bar whose parts stop summing to the total beside
   *  it is worse than a long bar. */
  it('folds the tail into one labelled Other segment that preserves the total', () => {
    const view = toPanelView(input({ spec: shareSpec(3), response: manyModels }));
    if (view.kind !== 'share') throw new Error('expected a share view');
    expect(view.segments.map((s) => s.key)).toEqual(['a', 'b', 'c', '__other__']);
    expect(view.segments.at(-1)?.label).toBe('Other (3)');
    const total = view.segments.reduce((sum, segment) => sum + segment.value, 0);
    expect(total).toBeCloseTo(21, 10);
  });

  it('leaves the list alone when it is shorter than the cap, or when none is set', () => {
    const capped = toPanelView(input({ spec: shareSpec(10), response: manyModels }));
    expect(capped.kind === 'share' && capped.segments).toHaveLength(6);
    const uncapped = toPanelView(input({ spec: shareSpec(), response: manyModels }));
    expect(uncapped.kind === 'share' && uncapped.segments).toHaveLength(6);
  });
});

describe('derived:costPerRequest as a stat panel', () => {
  const costPerRequestSpec = spec({
    type: 'stat',
    title: 'Cost / request',
    metric: 'derived:costPerRequest',
  });

  it('states the mean cost of one request', () => {
    const view = toPanelView(
      input({
        spec: costPerRequestSpec,
        response: response([point({ requests: 4, total_cost: 2_000_000 })]),
      })
    );
    expect(view.kind === 'stat' && view.metric).toContain('0.50');
  });

  /** The one behaviour deliberately NOT carried over from `lensTotals`, which returned 0 here and
   *  printed `$0.00` — "we measured it and requests are free". */
  it('renders a dash, never $0.00, when the window carried no requests', () => {
    const view = toPanelView(
      input({ spec: costPerRequestSpec, response: response([point({ total_cost: 1_000_000 })]) })
    );
    expect(view.kind === 'stat' && view.metric).toBe('—');
  });
});

// ── Story C6 (converse-frontends#449): the two adapter capabilities the drill-down pages added ──

describe('latencyPercentileSeries', () => {
  const bucket = (start: string, p50: number, p95: number, samples: number) =>
    point({
      bucket_start: start,
      latency_p50_ms: p50,
      latency_p95_ms: p95,
      latency_samples: samples,
    });

  it('plots p50 AND p95 per bucket — the tail is half the reading', () => {
    const series = latencyPercentileSeries(
      response([
        bucket('2026-09-01T00:00:00Z', 300, 1200, 40),
        bucket('2026-09-01T01:00:00Z', 420, 1800, 55),
      ])
    );

    expect(series.map((line) => line.key)).toEqual(['p50', 'p95']);
    expect(series[0].points.map((p) => p.y)).toEqual([300, 420]);
    expect(series[1].points.map((p) => p.y)).toEqual([1200, 1800]);
    expect(series[0].points.map((p) => p.x.toISOString())).toEqual([
      '2026-09-01T00:00:00.000Z',
      '2026-09-01T01:00:00.000Z',
    ]);
  });

  /** A bucket with no latency-bearing sample is ABSENT, never plotted at 0 — a zero here would
   *  draw a spike toward the floor that reads as the fastest minute of the window. */
  it('skips a bucket that reported no samples rather than plotting it at zero', () => {
    const series = latencyPercentileSeries(
      response([
        bucket('2026-09-01T00:00:00Z', 300, 1200, 40),
        point({ bucket_start: '2026-09-01T01:00:00Z', latency_samples: 0 }),
      ])
    );
    expect(series[0].points).toHaveLength(1);
    expect(series[1].points).toHaveLength(1);
  });

  /** Several rows in one bucket fold with `max` — the WORST percentile, never a mean of
   *  percentiles, which is not a percentile of anything. */
  it('takes the worst percentile when a bucket carries several groups', () => {
    const series = latencyPercentileSeries(
      response([
        bucket('2026-09-01T00:00:00Z', 300, 1200, 40),
        bucket('2026-09-01T00:00:00Z', 900, 900, 10),
      ])
    );
    expect(series[0].points).toEqual([{ x: new Date('2026-09-01T00:00:00Z'), y: 900 }]);
    expect(series[1].points).toEqual([{ x: new Date('2026-09-01T00:00:00Z'), y: 1200 }]);
  });

  it('still returns both lines for an empty window, so the panel keeps its axis', () => {
    expect(latencyPercentileSeries(response([])).map((line) => line.label)).toEqual(['p50', 'p95']);
  });

  it('is what an UNGROUPED latency-series panel renders, and a grouped one keeps per-group p50', () => {
    const ungrouped = toPanelView(
      input({
        spec: spec({
          type: 'latency-series',
          metric: 'latency',
          query: { scope: 'all', limit: 10 },
        }),
        response: response([bucket('2026-09-01T00:00:00Z', 300, 1200, 40)]),
      })
    );
    expect(ungrouped.kind === 'latency-series' && ungrouped.series.map((s) => s.key)).toEqual([
      'p50',
      'p95',
    ]);

    const grouped = toPanelView(
      input({
        spec: spec({
          type: 'latency-series',
          metric: 'latency',
          query: { scope: 'all', group_by: ['model'], limit: 10 },
        }),
        response: response([{ ...bucket('2026-09-01T00:00:00Z', 300, 1200, 40), model: 'gpt-4o' }]),
      })
    );
    expect(grouped.kind === 'latency-series' && grouped.series.map((s) => s.key)).toEqual([
      'gpt-4o',
    ]);
  });
});

describe('the operation dimension reads as English', () => {
  const operationResponse = response([
    point({ operation: 'chat_completions', requests: 40 }),
    point({ operation: 'responses', requests: 30 }),
    point({ operation: 'messages', requests: 20 }),
    point({ operation: 'embeddings', requests: 10 }),
    point({ operation: 'other', requests: 5 }),
  ]);

  it('humanises every value of A3’s closed vocabulary, "Other" included', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'ranked',
          metric: 'requests',
          query: { scope: 'all', group_by: ['operation'], limit: 10 },
        }),
        response: operationResponse,
      })
    );

    expect(view.kind === 'ranked' && view.rows.map((row) => row.label)).toEqual([
      'Chat completions',
      'Responses',
      'Messages',
      'Embeddings',
      'Other',
    ]);
  });

  /** An unlisted value keeps its WIRE name rather than being prettified into something that looks
   *  official — the backend's vocabulary is closed, and guessing at a new member would be the
   *  console inventing a fact. */
  it('leaves a value the vocabulary does not know exactly as the backend sent it', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'ranked',
          metric: 'requests',
          query: { scope: 'all', group_by: ['operation'], limit: 10 },
        }),
        response: response([
          // Cast through `unknown`: the generated enum does not have this member, which is
          // exactly the state a deployment running a NEWER backend than this console would be in.
          point({
            operation: 'batch_predictions',
            requests: 3,
          } as unknown as Partial<UsageSeriesPoint>),
        ]),
      })
    );
    expect(view.kind === 'ranked' && view.rows[0].label).toBe('batch_predictions');
  });

  it('labels a per-operation SERIES the same way it labels ranked rows', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'series',
          metric: 'requests',
          query: { scope: 'all', group_by: ['operation'], limit: 10 },
        }),
        response: operationResponse,
      })
    );
    expect(view.kind === 'series' && view.series[0].label).toBe('Chat completions');
  });

  /** Every other non-actor dimension is already human-readable and is printed verbatim — a model
   *  name must not be run through a humaniser that could rewrite it. */
  it('leaves model, azp and billing_plan untouched', () => {
    const view = toPanelView(
      input({
        spec: spec({
          type: 'ranked',
          metric: 'cost',
          query: { scope: 'all', group_by: ['azp'], limit: 10 },
        }),
        response: response([point({ azp: 'opencode-cli', total_cost: 2_000_000 })]),
      })
    );
    expect(view.kind === 'ranked' && view.rows[0].label).toBe('opencode-cli');
  });
});
