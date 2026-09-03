import React from 'react';
import type { UsageOperation, UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
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

import { comparisonLabel, type UsageWindow } from '../containers/comparison-window';
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
  costPerRequest,
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

/** Which `UsageSeriesPoint` field a panel's `group_by` dimension lands in. A dimension a
 *  deployment's backend does not carry has no point field to read, so the adapter falls back to
 *  the labelled sentinel and the panel's subtitle says so — no crash, no fabrication. (Lane A3's
 *  three bridge columns, `azp`/`operation`/`billing_plan`, have since landed and are typed on the
 *  generated point; this stays the general rule for the next one.) */
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
 * A group key with no identity to resolve at all — `UNASSIGNED_KEY` is the sentinel for spend the
 * backend attributed to nothing, and it is LABELLED, never dropped (ADR 0013 D5).
 */
function plainLabel(key: string): string {
  return key === UNASSIGNED_KEY ? 'Unassigned' : key;
}

/**
 * `operation` — lane A3's derived dimension (lightbridge-authz#648) — read as English.
 *
 * The column is a CLOSED vocabulary the ingest path folds a request path into
 * (`/v1/chat/completions` → `chat_completions`, `/v1/responses` → `responses`, `/v1/messages` →
 * `messages`, `/v1/embeddings` → `embeddings`, anything else → `other`), so the mapping is a
 * finite list rather than a title-casing heuristic — and an unlisted value keeps its WIRE name
 * rather than being prettified into something that looks official. `other` is deliberately
 * labelled "Other" and never dropped: it is the bucket every surface the gateway does not
 * recognise lands in, which is exactly the row an operator needs to see before believing a chat
 * total.
 *
 * Typed `Record<UsageOperation, string>` against the GENERATED enum on purpose: when the backend
 * adds a sixth operation, this file fails to compile rather than quietly printing its wire name in
 * a ranked row. That is the whole difference between a closed vocabulary and a guess.
 *
 * Stated once here because three surfaces read it — the channel page's ranked breakdown, the chats
 * page's per-operation series, and C10's report walk over the same views.
 */
const OPERATION_LABELS: Record<UsageOperation, string> = {
  chat_completions: 'Chat completions',
  responses: 'Responses',
  messages: 'Messages',
  embeddings: 'Embeddings',
  other: 'Other',
};

/** Dimensions whose VALUES have a fixed human rendering (no identity lookup involved). */
const DIMENSION_VALUE_LABELS: Record<string, Record<string, string>> = {
  operation: OPERATION_LABELS,
};

/**
 * One group key → the string a row/segment/series is labelled with, given the DIMENSION it came
 * from.
 *
 * Three cases, in order: the labelled `Unassigned` sentinel; an actor dimension, resolved through
 * `labelFor`; a dimension with a closed value vocabulary (`operation`), humanised from the map
 * above. Anything else — `model`, `azp`, `billing_plan` — is already a human-readable value and is
 * printed verbatim rather than guessed at.
 */
function keyLabel(key: string, dimension: string | undefined, labelFor: LabelFor): string {
  if (key === UNASSIGNED_KEY) return 'Unassigned';
  const kind = actorKindOf(dimension);
  if (kind) return labelFor(kind, key).label;
  const vocabulary = dimension ? DIMENSION_VALUE_LABELS[dimension] : undefined;
  return vocabulary?.[key] ?? key;
}

/**
 * A LOCAL name for an opaque group key — one the console already holds, without asking the backend
 * (C12, converse-frontends#455).
 *
 * It sits IN FRONT of `labelFor` rather than replacing it, for two reasons. First, coverage:
 * `resolveActorLabels` answers for users, accounts and projects, and nothing else — an API-key id
 * has no actor kind at all, so the project lens's "Spend by API key" would print raw cuids without
 * this. Second, authorization: that procedure needs `user:read`, which the account dashboard's
 * readers will not hold once platform roles land (story C9), while `scope.allProjects` is already
 * in memory for the page's own project picker. Answering from what is already held is both cheaper
 * and available to more people.
 *
 * `undefined` means "no better name than the id" — the honest fallback for an entity deleted since
 * the usage was recorded, and what hands the key on to `labelFor`.
 */
export type DashboardLabelResolver = (dimension: string, key: string) => string | undefined;

/**
 * The one place a group key becomes a label: local names first, then the backend's actor labels,
 * then the id itself. `UNASSIGNED_KEY` is labelled, never dropped and never renamed by a resolver.
 */
function labelOf(
  key: string,
  dimension: string | undefined,
  labelFor: LabelFor,
  localLabels: DashboardLabelResolver | undefined
): string {
  if (key === UNASSIGNED_KEY) return 'Unassigned';
  const local = dimension && localLabels ? localLabels(dimension, key) : undefined;
  return local || keyLabel(key, dimension, labelFor);
}

/**
 * Which dimension a panel READS — `options.dimension` when it names one, otherwise the query's
 * first `group_by` entry (C12, converse-frontends#455).
 *
 * `dimension: none` reads nothing: the panel plots or ranks the response's ungrouped total. That is
 * what lets a family fan-out serve a total chart off the SAME grouped query its by-account chart
 * reads, rather than a second fan-out of N more requests.
 */
export function panelDimension(
  spec: DashboardPanelSpec,
  groupBy: readonly string[] | undefined
): string | undefined {
  const declared = spec.options?.dimension;
  if (declared === 'none') return undefined;
  return declared ?? (groupBy ?? spec.query.group_by)?.[0];
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
 * glyph and the wording, and the wording NAMES the comparison window BY DATE ("12% vs Aug 25 –
 * Aug 31") rather than the vague "vs prev period" the pre-#446 per-container helpers used, or the
 * cadence phrase ("vs previous week") that replaced it — a phrase cannot be checked against the
 * ledger, and while the engine could still silently widen a window it was not always even true
 * (converse-frontends#448).
 *
 * `previous <= 0` with real current activity reads as "new this period"; a percentage off a zero
 * base is not a number.
 */
export function metricDelta(
  current: number,
  previous: number,
  compareWindow: UsageWindow
): StatCardDelta {
  const window = comparisonLabel(compareWindow);
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
  labelFor: LabelFor = IDENTITY_LABEL_FOR,
  localLabels?: DashboardLabelResolver
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
      label: key === '__total__' ? 'Total' : labelOf(key, dimension, labelFor, localLabels),
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

/**
 * The two lines an UNGROUPED `latency-series` panel plots: p50 and p95, per bucket
 * (converse-frontends#449, `/admin/usage/chats`).
 *
 * **Why this is honest, and why it is not `seriesByGroup(…, 'latency')`.** The usage backend runs
 * `percentile_cont` per bucket GROUP at query time, so `latency_p50_ms` on a point is a real
 * percentile of that bucket's own samples — not an interpolation between window aggregates. Each
 * plotted point is therefore a measurement, which is precisely the ground on which ADR 0013 D5's
 * "latency is stat cards until history depth justifies a series" is amended (C11 carries the
 * write-up). `seriesByGroup` would give p50 alone, and a latency chart without its tail is the
 * more comforting half of the reading.
 *
 * A bucket the backend returned with NO latency-bearing samples is skipped entirely rather than
 * plotted at 0 — "nothing reported" and "0 ms" are different facts, and a zero here would draw a
 * spike toward the floor that looks like the fastest minute of the window.
 *
 * An ungrouped response has one point per bucket; a grouped one would have several, so the values
 * are folded with `max` — the WORST percentile in the bucket, matching `latencyRowsByGroup`'s own
 * rule that a mean of percentiles is not a percentile of anything.
 */
export function latencyPercentileSeries(response: UsageQueryResponse): MultiSeriesSpendSeries[] {
  const p50 = new Map<number, number>();
  const p95 = new Map<number, number>();

  for (const point of response.points) {
    const t = new Date(point.bucket_start).getTime();
    if (!Number.isFinite(t)) continue;
    const samples = Number.isFinite(point.latency_samples) ? point.latency_samples : 0;
    if (samples <= 0) continue;
    if (typeof point.latency_p50_ms === 'number') {
      p50.set(t, Math.max(p50.get(t) ?? 0, point.latency_p50_ms));
    }
    if (typeof point.latency_p95_ms === 'number') {
      p95.set(t, Math.max(p95.get(t) ?? 0, point.latency_p95_ms));
    }
  }

  const line = (key: string, label: string, values: Map<number, number>) => ({
    key,
    label,
    points: Array.from(values.entries())
      .sort(([a], [b]) => a - b)
      .map(([t, y]) => ({ x: new Date(t), y })),
  });

  // Both lines are returned even when one is empty: a chart that silently drops p95 would read as
  // "the tail is fine", and the axis is the same milliseconds either way.
  return [line('p50', 'p50', p50), line('p95', 'p95', p95)];
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
  /** `ResolvedPanel.compareWindow` — the twin's own window, which the delta names by date. */
  compareWindow?: UsageWindow;
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
  /** Names the console already holds, consulted before `labelFor` — see `DashboardLabelResolver`. */
  localLabels?: DashboardLabelResolver;
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
  const dimension = panelDimension(spec, groupBy);
  const topN = spec.options?.topN;
  const link = input.link ?? spec.options?.link;
  const labelFor = input.labelFor ?? IDENTITY_LABEL_FOR;
  const label = (key: string, forDimension = dimension) =>
    labelOf(key, forDimension, labelFor, input.localLabels);

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
        // UNGROUPED → the two PERCENTILES as the two lines (`/admin/usage/chats`); grouped → one
        // p50 line per group key, which is the only per-group latency a single line can carry
        // without claiming the tail belongs to a group it was never computed within.
        series: dimension
          ? seriesByGroup(response, dimension, 'latency', labelFor, input.localLabels).slice(
              0,
              topN ?? 5
            )
          : latencyPercentileSeries(response),
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
        // `ShareBar` has no Top-N notion of its own (unlike `RankedSeriesRows`), so a share panel
        // that names one folds the tail into ONE labelled `Other (N)` segment here — never drops
        // it, which would make the bar's own parts stop summing to the total beside it.
        segments: collapseTail(
          totalsByGroup(response, dimension ?? 'model', spec.metric).map((group) => ({
            key: group.key,
            label: label(group.key, dimension ?? 'model'),
            value: group.value,
            formattedValue: formatMetric(group.value, spec.metric),
          })),
          topN,
          spec.metric
        ),
      };

    case 'donut': {
      const donutDimension = dimension ?? 'model';
      const groups = totalsByGroup(response, donutDimension, spec.metric);
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
        emptyMessage: donutEmptyMessage(donutDimension),
      };
    }

    case 'latency-cards':
      return {
        kind: 'latency-cards',
        rows: latencyRowsByGroup(response, dimension ?? 'model').map((row) => ({
          ...row,
          model: label(row.key, dimension ?? 'model'),
        })),
      };

    case 'table':
      return tableView(input, groupBy);
  }
}

/**
 * What a ring says when the grouped response came back with no rows at all.
 *
 * `DonutChart`'s own default is "No spend in this range." — right for a cost ring and WRONG for the
 * two beside it: a `tokens` or `requests` ring that reports on spend states a unit it never
 * measured. And on the three channel rings the honest reading is narrower still (owner check,
 * 2026-09-03): the events may well exist and simply carry no `azp`, in which case "no spend" would
 * send a reader looking for missing traffic rather than for a gateway that stopped stamping the
 * client id.
 *
 * Keyed on the DIMENSION, not the metric, because that is what the sentence is about. Anything not
 * listed keeps the primitive's default — a message this module cannot word honestly is one it
 * should not word at all.
 */
const DONUT_EMPTY_MESSAGE: Record<string, string> = {
  azp: 'No channel recorded on these events.',
  model: 'No model recorded on these events.',
  operation: 'No operation recorded on these events.',
  billing_plan: 'No billing plan recorded on these events.',
};

function donutEmptyMessage(dimension: string): string | undefined {
  return DONUT_EMPTY_MESSAGE[dimension];
}

/** Top-N + one summed `Other (N)` tail segment, for the one panel type whose primitive cannot cap
 *  itself. `undefined`/oversized `topN` returns the list unchanged rather than a spurious tail. */
function collapseTail(
  segments: { key: string; label: string; value: number; formattedValue: string }[],
  topN: number | undefined,
  metric: DashboardMetric
): { key: string; label: string; value: number; formattedValue: string }[] {
  if (topN === undefined || segments.length <= topN) return segments;
  const tail = segments.slice(topN);
  const value = tail.reduce((sum, segment) => sum + segment.value, 0);
  return [
    ...segments.slice(0, topN),
    {
      key: '__other__',
      label: `Other (${tail.length})`,
      value,
      formattedValue: formatMetric(value, metric),
    },
  ];
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
          label: keyLabel(group.key, groupDimension, labelFor),
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
        label: keyLabel(group.key, dimension, labelFor),
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
    // A locally-held name wins over the backend's, for the coverage and authorization reasons
    // `DashboardLabelResolver` states — but it never overrides the `Unassigned` sentinel, and it
    // never suppresses the resolved SECOND line (an account's owner, a user's email), which is a
    // fact the local map does not hold.
    const local = key !== UNASSIGNED_KEY ? input.localLabels?.(dimension, key) : undefined;
    return {
      key,
      // `keyLabel` for the non-actor case, so a table grouped by a dimension with a closed value
      // vocabulary (`operation`) reads the same English its ranked sibling does.
      label: local || (resolved?.label ?? keyLabel(key, dimension, labelFor)),
      secondary: resolved?.secondary,
      subtle: local ? false : (resolved?.subtle ?? key === UNASSIGNED_KEY),
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
    panelDimension(spec, dimensions),
    spec.metric,
    input.labelFor ?? IDENTITY_LABEL_FOR,
    input.localLabels
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
  const { spec, response, compareResponse, compareWindow } = input;
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

  if (derived === 'costPerRequest') {
    const value = costPerRequest(response);
    return {
      kind: 'stat',
      label: spec.title,
      // A dash, never `$0.00` — a mean over zero requests is not a number (the hook this replaced
      // printed `$0.00` here; see `costPerRequest`'s own doc comment).
      metric: value === null ? '—' : formatUsd(value),
    };
  }

  if (derived === 'activeActors') {
    const dimension = (panelDimension(spec, input.groupBy) ?? 'user_id') as keyof UsageSeriesPoint;
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
      compareResponse && compareWindow
        ? metricDelta(current, sumMetric(compareResponse, spec.metric), compareWindow)
        : undefined,
  };
}
