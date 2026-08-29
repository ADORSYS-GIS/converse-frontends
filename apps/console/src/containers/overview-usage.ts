import type {
  UsageGroupBy,
  UsageQueryRequest,
  UsageQueryResponse,
  UsageSeriesPoint,
} from '@lightbridge/api-rest';
import { formatMs, formatUsd } from '@lightbridge/ui-web';
import type {
  LatencyRidgelineSeries,
  ShareBarSegment,
  SpendSeriesSeries,
} from '@lightbridge/ui-web';

import type { OVERVIEW_BUCKETS, OVERVIEW_GROUP_BYS, OVERVIEW_RANGES } from '../client/url-state';
import { microUsdToUsd } from '../server/consumption-csv';

/**
 * Pure request/response adapters between the Overview screen's URL-driven view state and
 * `POST /usage/v1/usage/query` (#305/#306) — kept dependency-free of React/refine/TanStack Query
 * so the mapping itself (the part most likely to have an off-by-one or a wrong dimension) is
 * covered by plain unit tests, the same split `refill-rows.ts` already uses for its own
 * generated-model -> row adapters.
 */

export type OverviewRange = (typeof OVERVIEW_RANGES)[number];
export type OverviewBucket = (typeof OVERVIEW_BUCKETS)[number];
export type OverviewGroupBy = (typeof OVERVIEW_GROUP_BYS)[number];

export const RANGE_DAYS: Record<OverviewRange, number> = { '7d': 7, '30d': 30, '90d': 90 };

/**
 * `range` + optional explicit `from`/`to` -> one UTC window.
 *
 * An explicit span wins over the preset: `?range=30d&from=2026-08-12&to=2026-08-20` must show
 * 12–20 Aug, not re-roll the last 30 days. Malformed or reversed dates fall back to the preset
 * rather than throwing — a hand-edited URL should degrade, not break the page.
 */
export function resolveOverviewWindow(
  range: OverviewRange,
  from: string,
  to: string,
  now: Date
): { start: Date; end: Date } {
  const start = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const end = to ? new Date(`${to}T23:59:59.999Z`) : null;
  const usable =
    start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end;

  if (usable) return { start, end };
  return { start: new Date(now.getTime() - RANGE_DAYS[range] * 86_400_000), end: now };
}

/** `YYYY-MM-DD` in UTC — the form `from`/`to` take in the URL. */
export function toUrlDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * **console-ui#312's own gap, not made worse here.** The Overview URL contract's `groupBy` offers
 * `'project' | 'model'` (`url-state.ts`'s `OVERVIEW_GROUP_BYS`) — a UI-facing pair chosen before
 * the usage contract's real `UsageGroupBy` enum (`account_id | project_id | api_key_id | user_id |
 * user_name | model | metric_name | signal_type`) was read closely. `'project'` is not
 * `'project_id'`; this table is the one, single, explicit place that bridges the two, so the
 * mismatch is visible and grep-able rather than silently absorbed into a request builder.
 * Renaming the URL param to match the contract is #312's job, not this ticket's — this is the
 * minimal correct fix for #304's actual need: a request that only ever uses a value the contract
 * accepts.
 */
const OVERVIEW_GROUP_BY_TO_USAGE_GROUP_BY: Record<OverviewGroupBy, UsageGroupBy> = {
  project: 'project_id',
  model: 'model',
};

export function overviewGroupByToUsageGroupBy(groupBy: OverviewGroupBy): UsageGroupBy {
  return OVERVIEW_GROUP_BY_TO_USAGE_GROUP_BY[groupBy];
}

/** The dimension field a `UsageSeriesPoint` carries the group-by value under — the one field of
 *  `overviewGroupByToUsageGroupBy`'s output that also names a `UsageSeriesPoint` property. */
const GROUP_BY_POINT_FIELD: Record<OverviewGroupBy, keyof UsageSeriesPoint> = {
  project: 'project_id',
  model: 'model',
};

export interface OverviewUsageQueryInput {
  accountId: string;
  /** `null`/`''` = account-wide; a project id scopes the query to that project instead. */
  projectId?: string | null;
  /** The resolved UTC window. Presets are resolved to dates by the caller (`resolveOverviewWindow`)
   *  so this builder never has to know whether the user picked a preset or a calendar span. */
  window: { start: Date; end: Date };
  bucket: OverviewBucket;
  groupBy: OverviewGroupBy;
  /** `'all'` (the rail's own sentinel — see `use-overview-screen.ts`'s `MODEL_OPTIONS`) omits the filter. */
  model: string;
}

/** Builds the `UsageQueryRequest` for the SPEND/SPEND SHARE dashboards from the Overview's own
 *  URL-driven view state (range/bucket/group-by/model) plus the console scope (account/project). */
export function buildOverviewUsageRequest(input: OverviewUsageQueryInput): UsageQueryRequest {
  const { start: startTime, end: endTime } = input.window;
  const scoped = Boolean(input.projectId);

  return {
    scope: scoped ? 'project' : 'account',
    scope_id: scoped ? (input.projectId as string) : input.accountId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    bucket: USAGE_BUCKET_INTERVAL[input.bucket],
    group_by: [overviewGroupByToUsageGroupBy(input.groupBy)],
    filters: input.model !== 'all' ? { model: input.model } : undefined,
  };
}

/**
 * The URL's bucket vocabulary translated into the interval strings the usage API accepts.
 *
 * The backend validates against `^\d+\s+(second|seconds|minute|minutes|hour|hours|day|days)$`
 * (`lightbridge-authz` `crates/lightbridge-authz-usage/src/repo.rs`'s `validate_bucket_interval`),
 * so a bare `'day'` is a `400 Bad request: bucket must look like ...` on every dashboard load --
 * which is exactly what it was doing.
 *
 * The URL keeps the short vocabulary deliberately: `?bucket=day` is the readable, shareable form,
 * and it is what `OVERVIEW_BUCKETS`/`BUCKET_LABELS` are keyed on. Translating at the API boundary
 * keeps the wire format an implementation detail of this request builder rather than leaking a
 * Postgres interval literal into every shared link.
 *
 * `week` maps to `7 days`, not `1 week`: the regex above has no `week` arm at all, and
 * `validate_bucket_interval_rejects_unexpected_values` asserts `"1 week"` is refused. `7 days` is
 * both accepted and the same bucket width.
 */
const USAGE_BUCKET_INTERVAL: Record<OverviewBucket, string> = {
  hour: '1 hour',
  day: '1 day',
  week: '7 days',
};

/** A finite, non-negative cost — a malformed or negative `total_cost` from the backend renders as
 *  `0` for THIS point only rather than throwing and taking the whole chart down with it (#304's
 *  "a malformed response does not crash the caller" AC extended to the mapping layer, not just
 *  the transport one `usage-client.ts` already covers). */
function safeCost(point: UsageSeriesPoint): number {
  const microUsd =
    Number.isFinite(point.total_cost) && point.total_cost > 0 ? point.total_cost : 0;
  return microUsdToUsd(microUsd);
}

function groupKey(point: UsageSeriesPoint, groupBy: OverviewGroupBy): string {
  const value = point[GROUP_BY_POINT_FIELD[groupBy]];
  return typeof value === 'string' && value.length > 0 ? value : 'unassigned';
}

/** Maps `UsageQueryResponse.points` into `SpendSeriesSeries[]` for `SpendDashboard`, one series
 *  per distinct value of the request's own `group_by` dimension, oldest-first within each series.
 *  There is no friendly-name lookup for the group-by dimension yet (raw project/model ids double
 *  as both `key` and `label`) — the same known gap `overviewGroupByToUsageGroupBy` documents. */
export function toSpendSeries(
  response: UsageQueryResponse,
  groupBy: OverviewGroupBy
): SpendSeriesSeries[] {
  const seriesByKey = new Map<string, SpendSeriesSeries>();

  for (const point of response.points) {
    const key = groupKey(point, groupBy);
    let series = seriesByKey.get(key);
    if (!series) {
      series = { key, label: key, points: [] };
      seriesByKey.set(key, series);
    }
    series.points.push({ x: new Date(point.bucket_start), y: safeCost(point) });
  }

  for (const series of seriesByKey.values()) {
    series.points.sort((a, b) => a.x.getTime() - b.x.getTime());
  }

  return Array.from(seriesByKey.values());
}

/** Maps the same response into `ShareBarSegment[]` for `SpendShareSection` — one segment per
 *  group-by dimension value, summed across the whole range, in the same key order `toSpendSeries`
 *  uses so the chart and the share bar share one series identity for selection syncing.
 *
 *  Segments arrive sorted by value, descending: `ShareBar` colours by ARRAY INDEX (rank), so an
 *  unsorted list would hand rank 1's lightest grey to whichever key the response happened to
 *  mention first rather than to the largest share. */
export function toSpendShareSegments(
  response: UsageQueryResponse,
  groupBy: OverviewGroupBy
): ShareBarSegment[] {
  const totalsByKey = new Map<string, number>();

  for (const point of response.points) {
    const key = groupKey(point, groupBy);
    totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + safeCost(point));
  }

  return Array.from(totalsByKey.entries())
    .map(([key, value]) => ({ key, label: key, value, formattedValue: formatUsd(value) }))
    .sort((a, b) => b.value - a.value);
}

/** A bucket only contributes a real number when it actually carried a latency measurement
 *  (`latency_samples > 0`) and the requested percentile survived the trip as a finite number.
 *  Guards both independently rather than trusting the backend's own "null iff zero samples"
 *  contract to hold at the wire boundary -- a malformed response degrades to "nothing kept for
 *  this bucket" rather than plotting `NaN`/`null` as a real sample. */
function safeSampleCount(point: UsageSeriesPoint): number {
  return Number.isFinite(point.latency_samples) && point.latency_samples > 0
    ? point.latency_samples
    : 0;
}

function keepableP95(point: UsageSeriesPoint): number | null {
  if (safeSampleCount(point) === 0) return null;
  const p95 = point.latency_p95_ms;
  return typeof p95 === 'number' && Number.isFinite(p95) ? p95 : null;
}

export interface LatencyAdaptation {
  series: LatencyRidgelineSeries[];
  /** Group keys present in the response that reported zero latency samples across the whole range. */
  seriesWithoutLatency: string[];
  /** Total latency samples across every group — 0 means the whole range reported none. */
  totalSamples: number;
}

/**
 * Maps `UsageQueryResponse.points` into `LatencyRidgelineSeries[]` for `LatencyRidgeline` — the
 * per-series honesty contract this whole story exists to build (see `use-overview-screen.ts`'s
 * doc comment). One series per distinct value of the request's own `group_by` dimension, same
 * grouping/ordering as `toSpendSeries`/`toSpendShareSegments`.
 *
 * `values` is the list of PER-BUCKET `latency_p95_ms` observations for that group, keeping only
 * buckets that actually carried samples (`keepableP95`). This is real observed data — never
 * synthesised from a percentile, never interpolated, never repeated to fake a density. Doing
 * either would be exactly the fabrication ADR-0008 Decision 7's status note (amended by this
 * change) and this repo's own budget-decision-contract precedent (rule-data over invented
 * numbers) both rule out: a ridgeline's shape is read as a distribution of real samples, and a
 * bucketed p95 repeated N times would draw a shape that never happened.
 *
 * A group whose buckets all report zero samples still gets a row (`values: []`, `value: 'no
 * latency reported'`) rather than being dropped — the reader needs to see the model exists and
 * genuinely reported nothing, not have it silently vanish from the ridgeline. Its key is also
 * returned in `seriesWithoutLatency` so the caller can name it in a footnote.
 */
export function toLatencySeries(
  response: UsageQueryResponse,
  groupBy: OverviewGroupBy
): LatencyAdaptation {
  const seriesByKey = new Map<string, { key: string; label: string; values: number[] }>();
  let totalSamples = 0;

  for (const point of response.points) {
    const key = groupKey(point, groupBy);
    let series = seriesByKey.get(key);
    if (!series) {
      series = { key, label: key, values: [] };
      seriesByKey.set(key, series);
    }

    totalSamples += safeSampleCount(point);

    const p95 = keepableP95(point);
    if (p95 !== null) {
      series.values.push(p95);
    }
  }

  const seriesWithoutLatency: string[] = [];
  const series: LatencyRidgelineSeries[] = [];

  for (const entry of seriesByKey.values()) {
    if (entry.values.length === 0) {
      seriesWithoutLatency.push(entry.key);
      series.push({ key: entry.key, label: entry.label, values: [], value: 'no latency reported' });
      continue;
    }
    const max = Math.max(...entry.values);
    series.push({
      key: entry.key,
      label: entry.label,
      values: entry.values,
      value: `peak p95 ${formatMs(max)}`,
    });
  }

  return { series, seriesWithoutLatency, totalSamples };
}

/** Total spend across every point in the response — used for the SPEND stat card and, with a
 *  separately-scoped request (see `use-overview-screen.ts`), the budget consumption figure. */
export function sumTotalCost(response: UsageQueryResponse): number {
  return response.points.reduce((sum, point) => sum + safeCost(point), 0);
}

/** `[start of this calendar month (UTC), now]` — the budget domain's own period boundary
 *  (`authz.cstack`'s `'YYYY-MM'` `Period`), independent of the dashboard's own 7d/30d/90d range
 *  selector: budget consumption is always "this billing period," not "whatever range is picked." */
export function currentPeriodRange(now: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { start, end: now };
}

/** Builds the (ungrouped) `UsageQueryRequest` used to compute the account's total spend for the
 *  current billing period — BudgetHero's `value`. Always account-scoped: budget is account-scoped
 *  in the schema (see `authz.cstack`'s `GetMyBudgetBalanceInput` doc comment — "budget_account_id
 *  is always identical to account_id"), regardless of which project the Overview scope has picked. */
export function buildBudgetConsumptionRequest(accountId: string, now: Date): UsageQueryRequest {
  const { start, end } = currentPeriodRange(now);
  return {
    scope: 'account',
    scope_id: accountId,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  };
}
