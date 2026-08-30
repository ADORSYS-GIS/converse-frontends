import type {
  UsageQueryRequest,
  UsageQueryResponse,
  UsageScope,
  UsageSeriesPoint,
} from '@lightbridge/api-rest';
import { formatUsd } from '@lightbridge/ui-web';
import type { RankedSeriesRow, SpendSeriesSeries } from '@lightbridge/ui-web';

import {
  currentPeriodRange,
  safeCost,
  splitUnassignedProjects,
  UNASSIGNED_KEY,
  USAGE_QUERY_LIMIT,
  type OverviewGroupBy,
  type SeriesLabeller,
} from './overview-usage';

/**
 * Request/response adapters for the three scope-parameterized analytics lenses under
 * `/settings/overview/{account,project,user}` (IA v3 phase 4, build brief §3) — the sibling of
 * `overview-usage.ts` for the account-scoped Overview dashboard, kept as its own module because
 * these lenses have their own query shape: a FIXED day bucket for the spend chart (never the
 * hour/week toggle `overview-usage.ts` offers), and a second "whole window as one bucket" shape
 * for latency, where combining PRE-BUCKETED percentiles across days would not be a valid p50/p95/
 * p99 of the period — only a single bucket spanning the whole window is.
 *
 * **"Scope-parameterized" is literal**: `lens` (`use-settings-overview-screen.ts`) maps directly
 * onto the usage API's own `UsageScope` — `'account' | 'project' | 'user'` are three of its four
 * values (`'api_key'` is the one this build doesn't surface a lens for). The account lens scopes
 * to the whole account (the same scope the existing `/accounts/<id>/overview` dashboard uses);
 * the project lens scopes to ONE project (the console's existing shared `?project=` scope); the
 * user lens scopes to the signed-in identity's own usage (`session.user.sub` — there is no user
 * picker in this build, so "user lens" reads as "your own usage," not an arbitrary user's).
 *
 * Kept dependency-free of React/refine/TanStack Query, same split every other adapter module in
 * this directory uses, so the mapping logic is covered by plain unit tests.
 */

/** The `{scope, scope_id}` pair every request in this module is built against — one lens, one
 *  target, reused across every zone's own query so they can never disagree about WHAT they are
 *  describing (only the day/whole-window bucket and the group-by dimension vary per zone). */
export interface LensScopeTarget {
  scope: UsageScope;
  scopeId: string;
}

/** The day-bucket interval string every lens's spend chart and ranked-list breakdowns use — never
 *  the hour/week choices `OVERVIEW_BUCKETS` offers, since these lenses have no bucket toolbar of
 *  their own (build brief §3: "SpendSeriesChart variant='bars' N=1 day-bucket"). */
const DAY_BUCKET = '1 day';

/**
 * A single bucket spanning the ENTIRE window, for a request whose response must carry one true
 * percentile per key rather than several per-day percentiles that cannot be validly combined
 * (averaging p95s is not a p95). The backend's own interval regex
 * (`^\d+\s+(second|seconds|minute|minutes|hour|hours|day|days)$`) has no "whole span" primitive,
 * so this states the span itself, in whichever unit keeps the number reasonable.
 */
export function wholeWindowBucket(window: { start: Date; end: Date }): string {
  const totalSeconds = Math.max(
    1,
    Math.round((window.end.getTime() - window.start.getTime()) / 1000)
  );
  if (totalSeconds % 86_400 === 0) return `${totalSeconds / 86_400} days`;
  if (totalSeconds % 3_600 === 0) return `${totalSeconds / 3_600} hours`;
  if (totalSeconds % 60 === 0) return `${totalSeconds / 60} minutes`;
  return `${totalSeconds} seconds`;
}

/** Builds the day-bucketed request behind a lens's spend chart, its by-model ranked rows and its
 *  secondary breakdown — `groupBy` omitted entirely for the (ungrouped) aggregate spend series. */
export function buildLensDayRequest(
  target: LensScopeTarget,
  window: { start: Date; end: Date },
  groupBy?: OverviewGroupBy
): UsageQueryRequest {
  return {
    scope: target.scope,
    scope_id: target.scopeId,
    start_time: window.start.toISOString(),
    end_time: window.end.toISOString(),
    bucket: DAY_BUCKET,
    group_by: groupBy ? [groupBy] : undefined,
    limit: USAGE_QUERY_LIMIT,
  };
}

/** Builds the whole-window-bucketed request behind the stat row's totals and the per-model
 *  latency cards — one point per key (or one point total, ungrouped), never several to combine. */
export function buildLensTotalsRequest(
  target: LensScopeTarget,
  window: { start: Date; end: Date },
  groupBy?: OverviewGroupBy
): UsageQueryRequest {
  return {
    scope: target.scope,
    scope_id: target.scopeId,
    start_time: window.start.toISOString(),
    end_time: window.end.toISOString(),
    bucket: wholeWindowBucket(window),
    group_by: groupBy ? [groupBy] : undefined,
    limit: USAGE_QUERY_LIMIT,
  };
}

/** The account lens' cumulative budget burn-down — always the CURRENT BILLING PERIOD, never the
 *  lens's own range picker (the same "budget is this billing period, not whatever range is
 *  selected" rule `overview-usage.ts`'s `buildBudgetConsumptionRequest` already follows). Always
 *  account-scoped — budget is account-scoped in the schema regardless of which lens is showing
 *  it (see `overview-usage.ts`'s own `buildBudgetConsumptionRequest` doc comment). */
export function buildBurnDownRequest(accountId: string, now: Date): UsageQueryRequest {
  const { start, end } = currentPeriodRange(now);
  return {
    scope: 'account',
    scope_id: accountId,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    bucket: DAY_BUCKET,
    limit: USAGE_QUERY_LIMIT,
  };
}

/** A finite, non-negative request count — mirrors `overview-usage.ts`'s `safeCost` guard for the
 *  sibling field. The usage backend's own event model was verified (phase 4 measurement) to carry
 *  exactly one request per raw row, so summing `requests` across buckets is a real count, not an
 *  approximation — this only guards against a malformed value poisoning that sum. */
function safeRequests(point: UsageSeriesPoint): number {
  return Number.isFinite(point.requests) && point.requests > 0 ? point.requests : 0;
}

export interface LensTotals {
  requests: number;
  cost: number;
  /** `0` when there were no requests at all — never `NaN`/`Infinity` from a divide-by-zero. */
  costPerRequest: number;
}

/** Sums an (ungrouped, whole-window) response into the stat row's three figures. */
export function lensTotals(response: UsageQueryResponse): LensTotals {
  let requests = 0;
  let cost = 0;
  for (const point of response.points) {
    requests += safeRequests(point);
    cost += safeCost(point);
  }
  return { requests, cost, costPerRequest: requests > 0 ? cost / requests : 0 };
}

/** One aggregate series (ignoring whatever dimension the response IS grouped by, if any — the
 *  spend-over-time bars chart is always the account's total, never split by series) for
 *  `SpendSeriesChart`'s bars variant. */
export function toAggregateDaySeries(response: UsageQueryResponse, label: string): SpendSeriesSeries {
  const byDay = new Map<number, number>();
  for (const point of response.points) {
    const t = new Date(point.bucket_start).getTime();
    byDay.set(t, (byDay.get(t) ?? 0) + safeCost(point));
  }
  const points = Array.from(byDay.entries())
    .sort(([a], [b]) => a - b)
    .map(([t, y]) => ({ x: new Date(t), y }));
  return { key: 'total', label, points };
}

const GROUP_BY_POINT_FIELD: Record<OverviewGroupBy, keyof UsageSeriesPoint> = {
  project_id: 'project_id',
  model: 'model',
  user_id: 'user_id',
  api_key_id: 'api_key_id',
};

function groupKey(point: UsageSeriesPoint, groupBy: OverviewGroupBy): string {
  const value = point[GROUP_BY_POINT_FIELD[groupBy]];
  return typeof value === 'string' && value.length > 0 ? value : UNASSIGNED_KEY;
}

/**
 * Maps a day-bucketed, grouped response into `RankedSeriesRows`' own row shape: one row per key,
 * `value`/`formattedValue` the key's total cost, `sparklinePoints` its per-day trend (oldest
 * first) — the same per-row normalization `RankedSeriesRows` itself applies on top, so a dominant
 * key's shape never flattens a smaller one's.
 */
export function toRankedSeriesRows(
  response: UsageQueryResponse,
  groupBy: OverviewGroupBy,
  labelFor: SeriesLabeller = (key) => key
): RankedSeriesRow[] {
  const byKey = new Map<string, Map<number, number>>();

  for (const point of response.points) {
    const key = groupKey(point, groupBy);
    const t = new Date(point.bucket_start).getTime();
    let byDay = byKey.get(key);
    if (!byDay) {
      byDay = new Map();
      byKey.set(key, byDay);
    }
    byDay.set(t, (byDay.get(t) ?? 0) + safeCost(point));
  }

  return Array.from(byKey.entries()).map(([key, byDay]) => {
    const ordered = Array.from(byDay.entries()).sort(([a], [b]) => a - b);
    const value = ordered.reduce((sum, [, y]) => sum + y, 0);
    return {
      key,
      label: labelFor(key),
      value,
      formattedValue: formatUsd(value),
      sparklinePoints: ordered.map(([, y]) => y),
    };
  });
}

export interface LensLatencyRow {
  key: string;
  model: string;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number | null;
  samples: number;
}

/** Maps a whole-window, `group_by: ['model']` response into per-model latency figures —
 *  `LatencyStatCards`' own `hide when samples===0`/`suppress p99 below 100` rules are the
 *  component's job, not this adapter's; this only carries the real numbers through. */
export function toLatencyRows(response: UsageQueryResponse): LensLatencyRow[] {
  return response.points
    .filter((point) => typeof point.model === 'string' && point.model.length > 0)
    .map((point) => ({
      key: point.model as string,
      model: point.model as string,
      p50Ms: point.latency_p50_ms ?? 0,
      p95Ms: point.latency_p95_ms ?? 0,
      p99Ms: point.latency_p99_ms ?? null,
      samples: Number.isFinite(point.latency_samples) ? point.latency_samples : 0,
    }));
}
