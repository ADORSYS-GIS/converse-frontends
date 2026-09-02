import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import { formatUsd } from '@lightbridge/ui-web/src/lib/money';
import type {
  DashboardPanelView,
  DashboardTableColumn,
  DashboardTableRow,
} from '@lightbridge/ui-web/src/sections/dashboard-panels';
import type {
  MultiSeriesSpendScale,
  MultiSeriesSpendSeries,
} from '@lightbridge/ui-web/src/components/multi-series-spend-chart';
import type { StatCardDelta } from '@lightbridge/ui-web/src/components/stat-card';

import { comparisonLabel, type ResetCadence } from '../containers/comparison-window';
import { safeCost, UNASSIGNED_KEY } from '../containers/overview-usage';
import { derivedMetricName, type DashboardMetric, type DashboardPanelSpec } from './dashboard-spec';
import {
  activeActors,
  activeActorsPerBucket,
  avgCostPerMillionTokens,
  chatCount,
} from './derived-metrics';

/**
 * Usage response → `DashboardPanelView` — the per-metric adapters `use-dashboard.ts` keys by a
 * panel's `metric` field (converse-frontends#446, decision D-K).
 *
 * This is the layer that used to be a hand-written container per screen. Every function here is
 * PURE (no React, no query client), for the same reason `resolve-dashboard.ts` is: C10 renders the
 * same panel list server-side for the PDF report, and Storybook renders it from fixtures. It
 * reuses `overview-usage.ts`'s existing guards rather than restating them — `safeCost` (micro-USD
 * → USD, malformed/negative clamped per point) and `UNASSIGNED_KEY` (the sentinel for spend the
 * backend attributed to nothing) are the same ones every other adapter in this app already uses.
 *
 * Two rules carried through from ADR 0013 D5, so a YAML author cannot break them by accident:
 *  - **NULL group keys are never a series.** They fold into a labelled "Unassigned" row where a
 *    row is honest, and are excluded outright from a distinct COUNT — "usage attributed to nobody"
 *    is not one more actor.
 *  - **Never fabricate a figure.** A ratio with no denominator renders as a dash, not `$0.00`.
 */

/** Which `UsageSeriesPoint` field a panel's `group_by` dimension lands in. A dimension lane A3 has
 *  not landed yet (`azp`, `operation`, `billing_plan`) simply has no point field to read, so the
 *  adapter falls back to the sentinel and the panel's subtitle says so — no crash, no fabrication. */
function groupValue(point: UsageSeriesPoint, dimension: string): string {
  const value = (point as unknown as Record<string, unknown>)[dimension];
  return typeof value === 'string' && value.length > 0 ? value : UNASSIGNED_KEY;
}

function labelFor(key: string): string {
  return key === UNASSIGNED_KEY ? 'Unassigned' : key;
}

function safeRequests(point: UsageSeriesPoint): number {
  return Number.isFinite(point.requests) && point.requests > 0 ? point.requests : 0;
}

function safeTokens(point: UsageSeriesPoint): number {
  return Number.isFinite(point.total_tokens) && point.total_tokens > 0 ? point.total_tokens : 0;
}

/** The one place a panel's `metric` becomes "which number do I read off a point". */
export function readMetric(point: UsageSeriesPoint, metric: DashboardMetric): number {
  switch (metric) {
    case 'cost':
      return safeCost(point);
    case 'requests':
      return safeRequests(point);
    case 'tokens':
      return safeTokens(point);
    case 'latency':
      // A per-point p50 is the honest per-bucket reading the backend computes; `null` (no
      // latency-bearing event in the bucket) is NOT 0 — "nothing reported" and "0 ms" are
      // different facts — so it contributes nothing rather than dragging an average to zero.
      return typeof point.latency_p50_ms === 'number' ? point.latency_p50_ms : 0;
    default:
      // A derived metric is computed over the WHOLE response, never per point — `statView` routes
      // it before ever reaching here.
      return 0;
  }
}

/** How a metric's totals are stated. Money laddered through `formatUsd`; counts grouped; latency
 *  in whole milliseconds. */
export function formatMetric(value: number, metric: DashboardMetric): string {
  switch (metric) {
    case 'cost':
      return formatUsd(value);
    case 'latency':
      return `${Math.round(value)} ms`;
    default:
      return value.toLocaleString('en-US');
  }
}

/** Summed across every point — the figure a `stat` panel states, and the denominator a `share`,
 *  `ranked` or `donut` panel's percentages are taken over. */
export function sumMetric(response: UsageQueryResponse, metric: DashboardMetric): number {
  if (metric === 'latency') {
    // A mean of per-bucket p50s is not a percentile, so this is deliberately the WORST bucket's
    // p50 rather than an average that would claim more precision than it has.
    return response.points.reduce((worst, point) => Math.max(worst, readMetric(point, metric)), 0);
  }
  return response.points.reduce((sum, point) => sum + readMetric(point, metric), 0);
}

/**
 * The delta a `compare: true` panel carries. Never green/red (console-ui skill) — direction is the
 * glyph and the wording, and the wording NAMES the window ("12% vs previous week") rather than the
 * vague "vs prev period" the pre-#446 per-container helpers used.
 *
 * `previous <= 0` with real current activity reads as "new this period"; a percentage off a zero
 * base is not a number.
 */
export function metricDelta(
  current: number,
  previous: number,
  cadence: ResetCadence
): StatCardDelta {
  const window = comparisonLabel(cadence);
  if (previous <= 0) {
    return current > 0
      ? { direction: 'up', label: 'new this period' }
      : { direction: 'flat', label: 'no change' };
  }
  const percent = ((current - previous) / previous) * 100;
  if (Math.abs(percent) < 0.5) return { direction: 'flat', label: `no change ${window}` };
  return {
    direction: percent > 0 ? 'up' : 'down',
    label: `${Math.round(Math.abs(percent))}% ${window}`,
  };
}

/** Totals per group key, in descending order — the shared shape behind `ranked`, `share`,
 *  `donut` and `table`. */
export function totalsByGroup(
  response: UsageQueryResponse,
  dimension: string,
  metric: DashboardMetric
): { key: string; value: number }[] {
  const totals = new Map<string, number>();
  for (const point of response.points) {
    const key = groupValue(point, dimension);
    totals.set(key, (totals.get(key) ?? 0) + readMetric(point, metric));
  }
  return Array.from(totals.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

/** Per-group day/hour series — the shape both series-flavoured panels plot. */
export function seriesByGroup(
  response: UsageQueryResponse,
  dimension: string | undefined,
  metric: DashboardMetric
): { key: string; label: string; points: { x: Date; y: number }[] }[] {
  const byKey = new Map<string, Map<number, number>>();
  const totals = new Map<string, number>();

  for (const point of response.points) {
    const key = dimension ? groupValue(point, dimension) : '__total__';
    const t = new Date(point.bucket_start).getTime();
    const value = readMetric(point, metric);
    const buckets = byKey.get(key) ?? new Map<number, number>();
    buckets.set(t, (buckets.get(t) ?? 0) + value);
    byKey.set(key, buckets);
    totals.set(key, (totals.get(key) ?? 0) + value);
  }

  return Array.from(totals.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => ({
      key,
      label: key === '__total__' ? 'Total' : labelFor(key),
      points: Array.from(byKey.get(key) ?? [])
        .sort(([a], [b]) => a - b)
        .map(([t, y]) => ({ x: new Date(t), y })),
    }));
}

/**
 * How a `group_by` dimension reads as a COUNT series label — `activeActorsPerBucket`'s two lines
 * are "how many distinct accounts / projects", not one line per account, so the label has to come
 * from the dimension rather than from a group key. An unlisted dimension keeps its own wire name
 * rather than being guessed at or dropped.
 */
const DIMENSION_COUNT_LABELS: Record<string, string> = {
  account_id: 'Active accounts',
  project_id: 'Active projects',
  user_id: 'Active users',
  api_key_id: 'Active API keys',
  model: 'Models in use',
};

/** The `derived:activeActorsPerBucket` series shape — one distinct-count line per group-by
 *  dimension, sharing one x-domain (see that function's own doc comment). */
export function distinctCountSeries(
  response: UsageQueryResponse,
  dimensions: readonly string[]
): MultiSeriesSpendSeries[] {
  return activeActorsPerBucket(response, dimensions).map(({ dimension, points }) => ({
    key: dimension,
    label: DIMENSION_COUNT_LABELS[dimension] ?? dimension,
    points,
  }));
}

/**
 * The comparison overlay a `compare: true` SERIES panel carries: the previous window's own
 * aggregate, re-based FORWARD by `shiftMs` so it lies under the current window instead of
 * doubling the chart's x-domain, and `dashed` so it is distinguishable without a legend (this
 * console has none, by ruling).
 *
 * Always ungrouped, whatever the panel's `group_by` is: a comparison is a reading of the WHOLE
 * period against the whole previous one. Overlaying one previous line per model on top of one
 * current line per model would double the series count and make neither readable.
 */
export function comparisonSeries(
  response: UsageQueryResponse,
  metric: DashboardMetric,
  shiftMs: number
): MultiSeriesSpendSeries {
  const totals = new Map<number, number>();
  for (const point of response.points) {
    const t = new Date(point.bucket_start).getTime();
    if (!Number.isFinite(t)) continue;
    totals.set(t, (totals.get(t) ?? 0) + readMetric(point, metric));
  }
  return {
    key: '__previous__',
    label: 'Previous period',
    dashed: true,
    points: Array.from(totals.entries())
      .sort(([a], [b]) => a - b)
      .map(([t, y]) => ({ x: new Date(t + shiftMs), y })),
  };
}

/** Per-model latency rows — read straight off the response's own per-bucket percentiles, which is
 *  what makes `latency-cards` honest (the backend computes `percentile_cont` per bucket group at
 *  query time). Samples sum across buckets; the percentiles are the WORST bucket's, never an
 *  average of percentiles, which is not a percentile of anything. */
export function latencyRowsByGroup(
  response: UsageQueryResponse,
  dimension: string
): {
  key: string;
  model: string;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number | null;
  samples: number;
}[] {
  const rows = new Map<
    string,
    { p50Ms: number; p95Ms: number; p99Ms: number | null; samples: number }
  >();

  for (const point of response.points) {
    const key = groupValue(point, dimension);
    const row = rows.get(key) ?? { p50Ms: 0, p95Ms: 0, p99Ms: null, samples: 0 };
    const samples = Number.isFinite(point.latency_samples) ? point.latency_samples : 0;
    if (samples <= 0) {
      rows.set(key, row);
      continue;
    }
    row.samples += samples;
    if (typeof point.latency_p50_ms === 'number')
      row.p50Ms = Math.max(row.p50Ms, point.latency_p50_ms);
    if (typeof point.latency_p95_ms === 'number')
      row.p95Ms = Math.max(row.p95Ms, point.latency_p95_ms);
    if (typeof point.latency_p99_ms === 'number') {
      row.p99Ms = Math.max(row.p99Ms ?? 0, point.latency_p99_ms);
    }
    rows.set(key, row);
  }

  return Array.from(rows.entries())
    .map(([key, row]) => ({ key, model: labelFor(key), ...row }))
    .sort((a, b) => b.samples - a.samples);
}

/** `options.link`'s `:key` template → a real href for one row's group value. */
export function panelRowHref(template: string | undefined, key: string): string | undefined {
  if (!template || key === UNASSIGNED_KEY) return undefined;
  return template.replace(':key', encodeURIComponent(key));
}

export interface PanelViewInput {
  spec: DashboardPanelSpec;
  response: UsageQueryResponse;
  /** The comparison twin's response, when `compare: true` and it resolved. */
  compareResponse?: UsageQueryResponse;
  compareCadence?: ResetCadence;
  /** `ResolvedPanel.compareShiftMs` — how far forward to re-base the twin's timestamps so a
   *  SERIES overlay lands under the current window. Irrelevant to a `stat`, which sums a scalar. */
  compareShiftMs?: number;
  /** Controlled scale for the two series-shaped panels — the console holds it in the URL. */
  scale: MultiSeriesSpendScale;
  onScaleChange: (scale: MultiSeriesSpendScale) => void;
}

/** Every `table` panel states the same three figures; only what a ROW is varies, so only the
 *  first column's header is a parameter (`options.rowLabel`). */
function tableColumns(rowLabel: string | undefined): DashboardTableColumn[] {
  return [
    { key: 'label', header: rowLabel ?? 'Actor', sortable: true },
    { key: 'cost', header: 'Cost', align: 'right', kind: 'data', sortable: true },
    { key: 'requests', header: 'Requests', align: 'right', kind: 'data', sortable: true },
    { key: 'tokens', header: 'Tokens', align: 'right', kind: 'data', sortable: true },
  ];
}

/**
 * The single entry point: one resolved panel plus its response(s) → the render-ready view its
 * type's renderer takes. Keyed by `spec.type` and, for `stat`, by `spec.metric` — the two axes the
 * spec actually varies.
 */
export function toPanelView(input: PanelViewInput): DashboardPanelView {
  const { spec, response } = input;
  const dimension = spec.query.group_by?.[0];
  const topN = spec.options?.topN;
  const link = spec.options?.link;

  switch (spec.type) {
    case 'stat':
      return statView(input);

    case 'stat-group': {
      const groups = totalsByGroup(response, dimension ?? 'model', spec.metric).slice(0, topN ?? 4);
      return {
        kind: 'stat-group',
        stats: groups.map((group) => ({
          key: group.key,
          label: labelFor(group.key),
          metric: formatMetric(group.value, spec.metric),
        })),
      };
    }

    case 'series':
      return seriesView(input);

    case 'latency-series':
      return {
        kind: 'latency-series',
        series: seriesByGroup(response, dimension, 'latency').slice(0, topN ?? 5),
        scale: input.scale,
        onScaleChange: input.onScaleChange,
      };

    case 'ranked':
      return {
        kind: 'ranked',
        rows: totalsByGroup(response, dimension ?? 'model', spec.metric).map((group) => ({
          key: group.key,
          label: labelFor(group.key),
          value: group.value,
          formattedValue: formatMetric(group.value, spec.metric),
          subtle: group.key === UNASSIGNED_KEY,
        })),
        topN,
        hrefFor: link ? (row) => panelRowHref(link, row.key) : undefined,
      };

    case 'share':
      return {
        kind: 'share',
        segments: totalsByGroup(response, dimension ?? 'model', spec.metric).map((group) => ({
          key: group.key,
          label: labelFor(group.key),
          value: group.value,
          formattedValue: formatMetric(group.value, spec.metric),
        })),
      };

    case 'donut': {
      const groups = totalsByGroup(response, dimension ?? 'model', spec.metric);
      const total = groups.reduce((sum, group) => sum + Math.max(group.value, 0), 0);
      return {
        kind: 'donut',
        segments: groups.map((group) => ({
          key: group.key,
          label: labelFor(group.key),
          value: group.value,
          formattedValue: formatMetric(group.value, spec.metric),
        })),
        topN,
        centreMetric: formatMetric(total, spec.metric),
        centreLabel: 'TOTAL',
      };
    }

    case 'latency-cards':
      return { kind: 'latency-cards', rows: latencyRowsByGroup(response, dimension ?? 'model') };

    case 'table': {
      const dimensionKey = dimension ?? 'user_id';
      const cost = new Map(
        totalsByGroup(response, dimensionKey, 'cost').map((g) => [g.key, g.value])
      );
      const requests = new Map(
        totalsByGroup(response, dimensionKey, 'requests').map((g) => [g.key, g.value])
      );
      const tokens = new Map(
        totalsByGroup(response, dimensionKey, 'tokens').map((g) => [g.key, g.value])
      );

      const rows: DashboardTableRow[] = Array.from(cost.keys()).map((key) => ({
        key,
        href: panelRowHref(link, key),
        cells: {
          label: labelFor(key),
          cost: formatUsd(cost.get(key) ?? 0),
          requests: (requests.get(key) ?? 0).toLocaleString('en-US'),
          tokens: (tokens.get(key) ?? 0).toLocaleString('en-US'),
        },
      }));

      return {
        kind: 'table',
        columns: tableColumns(spec.options?.rowLabel),
        rows,
        unit: spec.options?.unit ?? 'actors',
        total: rows.length,
      };
    }
  }
}

/**
 * A `series` panel — the one type that can carry BOTH a derived metric (a distinct count per
 * bucket, which no column holds) and a comparison overlay (`compare: true`).
 *
 * A derived series is deliberately exclusive of the comparison overlay: "how many accounts were
 * active" against "how many were active last month" is a legitimate question, but it is a second
 * COUNT line, not the ungrouped total `comparisonSeries` builds, and no page has asked for it —
 * so it is left unbuilt rather than half-built.
 */
function seriesView(input: PanelViewInput): DashboardPanelView {
  const { spec, response, compareResponse, compareShiftMs } = input;
  const dimensions = spec.query.group_by ?? [];
  const derived = derivedMetricName(spec.metric);

  const base = {
    kind: 'series' as const,
    scale: input.scale,
    onScaleChange: input.onScaleChange,
  };

  if (derived === 'activeActorsPerBucket') {
    return {
      ...base,
      series: distinctCountSeries(response, dimensions.length > 0 ? dimensions : ['user_id']),
      formatValue: countFormatter,
      formatYTick: countFormatter,
    };
  }

  const series = seriesByGroup(response, dimensions[0], spec.metric).slice(
    0,
    spec.options?.topN ?? 5
  );
  if (compareResponse && compareShiftMs !== undefined) {
    series.push(comparisonSeries(compareResponse, spec.metric, compareShiftMs));
  }

  return {
    ...base,
    series,
    formatValue: (value) => formatMetric(value, spec.metric),
    // A COUNT axis must never carry a fabricated `$` — the exact reason `formatYTick` exists on
    // `MultiSeriesSpendChart`.
    formatYTick: spec.metric === 'cost' ? undefined : (value) => formatMetric(value, spec.metric),
  };
}

const countFormatter = (value: number) => Math.round(value).toLocaleString('en-US');

/** A `stat` panel — the one type whose metric can be DERIVED rather than summed. */
function statView(input: PanelViewInput): DashboardPanelView {
  const { spec, response, compareResponse, compareCadence } = input;
  const derived = derivedMetricName(spec.metric);

  if (derived === 'avgCostPerMillionTokens') {
    const value = avgCostPerMillionTokens(response);
    return {
      kind: 'stat',
      label: spec.title,
      // A dash, never `$0.00` — there is no honest cost-per-token for a window with no tokens.
      metric: value === null ? '—' : `${formatUsd(value)} / 1M`,
    };
  }

  if (derived === 'activeActors') {
    const dimension = (spec.query.group_by?.[0] ?? 'user_id') as keyof UsageSeriesPoint;
    return {
      kind: 'stat',
      label: spec.title,
      metric: activeActors(response, dimension).toLocaleString('en-US'),
    };
  }

  if (derived === 'chatCount') {
    return {
      kind: 'stat',
      label: spec.title,
      metric: chatCount(response).toLocaleString('en-US'),
    };
  }

  const current = sumMetric(response, spec.metric);
  return {
    kind: 'stat',
    label: spec.title,
    metric: formatMetric(current, spec.metric),
    delta:
      compareResponse && compareCadence
        ? metricDelta(current, sumMetric(compareResponse, spec.metric), compareCadence)
        : undefined,
  };
}
