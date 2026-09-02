import React from 'react';
import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import { IdentityLines } from '@lightbridge/ui-web/src/lib/identity-lines';
import { formatUsd } from '@lightbridge/ui-web/src/lib/money';
// The narrow `/types` path, NOT the section's barrel (converse-frontends#453): the barrel
// re-exports `panel-renderers.tsx`, and this module is reached from the export route's own
// server-side walk of the resolved panel list.
import type {
  DashboardPanelView,
  DashboardTableColumn,
  DashboardTableRow,
} from '@lightbridge/ui-web/src/sections/dashboard-panels/types';
import type { LedgerSort } from '@lightbridge/ui-web/src/components/ledger-table';
import type {
  MultiSeriesSpendScale,
  MultiSeriesSpendSeries,
} from '@lightbridge/ui-web/src/components/multi-series-spend-chart';
import type { StatCardDelta } from '@lightbridge/ui-web/src/components/stat-card';

import { comparisonLabel, type ResetCadence } from '../containers/comparison-window';
import { safeCost, UNASSIGNED_KEY } from '../containers/overview-usage';
import { IDENTITY_LABEL_FOR, type ActorKind, type LabelFor } from './actor-labels';
import {
  DEFAULT_TABLE_COLUMNS,
  derivedMetricName,
  type DashboardLens,
  type DashboardMetric,
  type DashboardPanelSpec,
  type DashboardTableColumnId,
} from './dashboard-spec';
import {
  activeActors,
  activeActorsByGroup,
  activeActorsPerBucket,
  avgCostPerMillionTokens,
  chatCount,
  lastActiveByGroup,
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

/**
 * Which actor kind a `group_by` dimension names, or `null` for a dimension with no identity to
 * resolve at all (`model`, `azp`, `billing_plan`, `metric_name`, …). Stated once so a renderer
 * never has to guess whether a group key is a cuid or a human-readable value.
 */
const DIMENSION_ACTOR_KIND: Record<string, ActorKind> = {
  user_id: 'user',
  account_id: 'account',
  project_id: 'project',
};

export function actorKindOf(dimension: string | undefined): ActorKind | null {
  return dimension ? (DIMENSION_ACTOR_KIND[dimension] ?? null) : null;
}

/**
 * One group key → the string a row/segment/series is labelled with.
 *
 * `UNASSIGNED_KEY` is the sentinel for spend the backend attributed to nothing, and it is LABELLED,
 * never dropped (ADR 0013 D5). An actor dimension goes through `labelFor`, which resolves a real
 * name where `resolveActorLabels` had one and falls back to `sentinelLabel` where it did not —
 * so an unresolved id keeps its row rather than disappearing from a spend ranking.
 */
function plainLabel(key: string): string {
  return key === UNASSIGNED_KEY ? 'Unassigned' : key;
}

function keyLabel(key: string, kind: ActorKind | null, labelFor: LabelFor): string {
  if (key === UNASSIGNED_KEY) return 'Unassigned';
  if (!kind) return key;
  return labelFor(kind, key).label;
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
  metric: DashboardMetric,
  labelFor: LabelFor = IDENTITY_LABEL_FOR
): { key: string; label: string; points: { x: Date; y: number }[] }[] {
  const kind = actorKindOf(dimension);
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
      label: key === '__total__' ? 'Total' : keyLabel(key, kind, labelFor),
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
    .map(([key, row]) => ({ key, model: plainLabel(key), ...row }))
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
  /**
   * The RESOLVED `group_by` — `spec.query.group_by` after `resolve-dashboard.ts` applied the page's
   * lens. A lens-driven panel's spec says `[user_id]` and its resolved query may say
   * `[account_id]`; reading the spec here would label account ids as users.
   */
  groupBy?: string[];
  /** `ResolvedPanel.lens` — set only on a lens-driven panel. */
  lens?: DashboardLens;
  /** `ResolvedPanel.link` — `options.link` with `$lens` already substituted. */
  link?: string;
  /** Resolves an actor id to a name; defaults to sentinels-only, which is what every panel gets
   *  while the batch lookup is in flight or after it failed. */
  labelFor?: LabelFor;
  /** `table` only — the URL-held sort and page, and the callbacks that write them back. */
  sort?: LedgerSort;
  onSortChange?: (sort: LedgerSort) => void;
  page?: number;
  onPageChange?: (page: number) => void;
}

/** Column headers for the closed `options.columns` vocabulary. `label`'s header is the panel's own
 *  `options.rowLabel` — a column header is a claim about what the rows ARE. */
const TABLE_COLUMN_DEFS: Record<DashboardTableColumnId, Omit<DashboardTableColumn, 'key'>> = {
  label: { header: 'Actor', sortable: true },
  type: { header: 'Type', sortable: true },
  cost: { header: 'Cost', align: 'right', kind: 'data', sortable: true },
  requests: { header: 'Requests', align: 'right', kind: 'data', sortable: true },
  tokens: { header: 'Tokens', align: 'right', kind: 'data', sortable: true },
  lastActive: { header: 'Last active', align: 'right', kind: 'data', sortable: true },
};

function tableColumns(
  columns: readonly DashboardTableColumnId[],
  rowLabel: string | undefined
): DashboardTableColumn[] {
  return columns.map((key) => ({
    key,
    ...TABLE_COLUMN_DEFS[key],
    header:
      key === 'label'
        ? (rowLabel ?? TABLE_COLUMN_DEFS.label.header)
        : TABLE_COLUMN_DEFS[key].header,
  }));
}

/** What a lens reads as a table cell — singular and capitalised, the way a person would say it. */
const LENS_NOUN: Record<DashboardLens, string> = {
  user: 'User',
  account: 'Account',
  project: 'Project',
};

/**
 * "Last active", stated at the resolution the data actually has: the START of the most recent
 * bucket in which the actor drew something, in UTC — never "3 hours ago", which would imply an
 * event-level timestamp the usage API does not return. A group with no active bucket renders a
 * dash, because "no activity we can date" is not a date.
 */
function formatLastActive(at: Date | undefined): string {
  if (!at || Number.isNaN(at.getTime())) return '—';
  const iso = at.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/**
 * The single entry point: one resolved panel plus its response(s) → the render-ready view its
 * type's renderer takes. Keyed by `spec.type` and, for `stat`, by `spec.metric` — the two axes the
 * spec actually varies.
 */
export function toPanelView(input: PanelViewInput): DashboardPanelView {
  const { spec, response } = input;
  // The RESOLVED group-by, so a lens-driven panel reads the dimension it actually queried.
  const groupBy = input.groupBy ?? spec.query.group_by;
  const dimension = groupBy?.[0];
  const topN = spec.options?.topN;
  const link = input.link ?? spec.options?.link;
  const labelFor = input.labelFor ?? IDENTITY_LABEL_FOR;
  const kind = actorKindOf(dimension);
  const label = (key: string) => keyLabel(key, kind, labelFor);

  switch (spec.type) {
    case 'stat':
      return statView(input);

    case 'stat-group':
      return statGroupView(input, groupBy);

    case 'series':
      return seriesView(input);

    case 'latency-series':
      return {
        kind: 'latency-series',
        series: seriesByGroup(response, dimension, 'latency', labelFor).slice(0, topN ?? 5),
        scale: input.scale,
        onScaleChange: input.onScaleChange,
      };

    case 'ranked':
      return {
        kind: 'ranked',
        rows: totalsByGroup(response, dimension ?? 'model', spec.metric).map((group) => ({
          key: group.key,
          label: label(group.key),
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
          label: label(group.key),
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
          label: label(group.key),
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

    case 'table':
      return tableView(input, groupBy);
  }
}

/**
 * A `stat-group` — a ROW of stat cards, one per group key.
 *
 * Two readings, and the metric picks between them. `derived:activeActors` counts DISTINCT actors of
 * the first `group_by` dimension, broken down by the second ("accounts with usage per billing
 * plan", owner Q4); every other metric sums the first dimension's own totals. Both are one query
 * and one panel; what differs is only which question the numbers answer, which is exactly what
 * `metric` is for.
 */
function statGroupView(input: PanelViewInput, groupBy: string[] | undefined): DashboardPanelView {
  const { spec, response } = input;
  const labelFor = input.labelFor ?? IDENTITY_LABEL_FOR;
  const topN = spec.options?.topN;

  if (derivedMetricName(spec.metric) === 'activeActors') {
    const countDimension = groupBy?.[0] ?? 'account_id';
    // The BREAKDOWN dimension is the second one; with only one dimension there is nothing to break
    // down by, so the panel degrades to a single card counting the whole response rather than
    // inventing a grouping.
    const groupDimension = groupBy?.[1];
    if (!groupDimension) {
      return {
        kind: 'stat-group',
        stats: [
          {
            key: countDimension,
            label: spec.title,
            metric: activeActors(response, countDimension as keyof UsageSeriesPoint).toLocaleString(
              'en-US'
            ),
          },
        ],
      };
    }
    return {
      kind: 'stat-group',
      stats: activeActorsByGroup(response, countDimension, groupDimension)
        .slice(0, topN ?? 4)
        .map((group) => ({
          key: group.key,
          label: keyLabel(group.key, actorKindOf(groupDimension), labelFor),
          metric: group.count.toLocaleString('en-US'),
        })),
    };
  }

  const dimension = groupBy?.[0] ?? 'model';
  return {
    kind: 'stat-group',
    stats: totalsByGroup(response, dimension, spec.metric)
      .slice(0, topN ?? 4)
      .map((group) => ({
        key: group.key,
        label: keyLabel(group.key, actorKindOf(dimension), labelFor),
        metric: formatMetric(group.value, spec.metric),
      })),
  };
}

/** Which figure a sort key reads off a row, for the client-side ordering the table owns while the
 *  query API has no `ORDER BY` of its own (an explicit, captioned assumption of story C5). */
type TableRowValues = {
  key: string;
  label: string;
  secondary?: string;
  subtle: boolean;
  type: string;
  cost: number;
  requests: number;
  tokens: number;
  lastActive?: Date;
};

function compareRows(a: TableRowValues, b: TableRowValues, sortKey: string): number {
  switch (sortKey) {
    case 'cost':
      return a.cost - b.cost;
    case 'requests':
      return a.requests - b.requests;
    case 'tokens':
      return a.tokens - b.tokens;
    case 'lastActive':
      // A row with no dated activity sorts to the BOTTOM in either direction rather than pretending
      // to be the oldest — "unknown" is not "long ago".
      return (a.lastActive?.getTime() ?? -Infinity) - (b.lastActive?.getTime() ?? -Infinity);
    case 'type':
      return a.type.localeCompare(b.type);
    default:
      return a.label.localeCompare(b.label);
  }
}

/**
 * A `table` panel — the one type whose column set, ordering and paging are all the console's own,
 * because the query API has none of them (no `ORDER BY`, no `OFFSET`, equality filters only).
 *
 * Sorting and paging are therefore client-side over the GROUPED response, which is honest exactly
 * as long as the truncation caption beside the table is visible — the page renders it whenever the
 * backend set `truncated`, and every panel states its own `limit` in the YAML.
 */
function tableView(input: PanelViewInput, groupBy: string[] | undefined): DashboardPanelView {
  const { spec, response } = input;
  const dimension = groupBy?.[0] ?? 'user_id';
  const kind = actorKindOf(dimension);
  const labelFor = input.labelFor ?? IDENTITY_LABEL_FOR;
  const columns = spec.options?.columns ?? DEFAULT_TABLE_COLUMNS;
  const link = input.link ?? spec.options?.link;

  const cost = new Map(totalsByGroup(response, dimension, 'cost').map((g) => [g.key, g.value]));
  const requests = new Map(
    totalsByGroup(response, dimension, 'requests').map((g) => [g.key, g.value])
  );
  const tokens = new Map(totalsByGroup(response, dimension, 'tokens').map((g) => [g.key, g.value]));
  const lastActive = lastActiveByGroup(response, dimension);

  // What a row IS, as a cell: the lens when the panel has one, else the `rowLabel` the YAML gave
  // its first column ("Channel"), else nothing worth printing.
  const rowType = input.lens ? LENS_NOUN[input.lens] : (spec.options?.rowLabel ?? '—');

  const values: TableRowValues[] = Array.from(cost.keys()).map((key) => {
    const resolved = kind && key !== UNASSIGNED_KEY ? labelFor(kind, key) : undefined;
    return {
      key,
      label: resolved?.label ?? plainLabel(key),
      secondary: resolved?.secondary,
      subtle: resolved?.subtle ?? key === UNASSIGNED_KEY,
      type: rowType,
      cost: cost.get(key) ?? 0,
      requests: requests.get(key) ?? 0,
      tokens: tokens.get(key) ?? 0,
      lastActive: lastActive.get(key),
    };
  });

  const sort = input.sort;
  if (sort) {
    const direction = sort.direction === 'asc' ? 1 : -1;
    values.sort((a, b) => compareRows(a, b, sort.key) * direction || a.key.localeCompare(b.key));
  } else {
    values.sort((a, b) => b.cost - a.cost || a.key.localeCompare(b.key));
  }

  const rows: DashboardTableRow[] = values.map((row) => ({
    key: row.key,
    href: panelRowHref(link, row.key),
    cells: {
      // Name AND email for a user (owner-confirmed shape); account owner / project parent
      // otherwise. Two lines, never concatenated into one — the second is supporting, not part of
      // the name.
      label: <IdentityLines label={row.label} detail={row.secondary} subtle={row.subtle} />,
      type: row.type,
      cost: formatUsd(row.cost),
      requests: row.requests.toLocaleString('en-US'),
      tokens: row.tokens.toLocaleString('en-US'),
      lastActive: formatLastActive(row.lastActive),
    },
  }));

  const page = input.page ?? 0;
  return {
    kind: 'table',
    columns: tableColumns(columns, spec.options?.rowLabel),
    rows,
    unit: spec.options?.unit ?? 'actors',
    total: rows.length,
    sort: input.sort,
    onSortChange: input.onSortChange,
    page,
    onPrev: input.onPageChange ? () => input.onPageChange?.(Math.max(page - 1, 0)) : undefined,
    onNext: input.onPageChange ? () => input.onPageChange?.(page + 1) : undefined,
  };
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
  // The RESOLVED dimensions, so a lens-driven series plots (and labels) what it actually queried.
  const dimensions = input.groupBy ?? spec.query.group_by ?? [];
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

  const series = seriesByGroup(
    response,
    dimensions[0],
    spec.metric,
    input.labelFor ?? IDENTITY_LABEL_FOR
  ).slice(0, spec.options?.topN ?? 5);
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
