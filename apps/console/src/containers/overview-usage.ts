import type {
  UsageGroupBy,
  UsageQueryRequest,
  UsageQueryResponse,
  UsageSeriesPoint,
} from '@lightbridge/api-rest';
import type { DonutSlice, SpendSeriesSeries } from '@lightbridge/ui-web';

import type { OVERVIEW_BUCKETS, OVERVIEW_GROUP_BYS, OVERVIEW_RANGES } from '../client/url-state';

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

const RANGE_DAYS: Record<OverviewRange, number> = { '7d': 7, '30d': 30, '90d': 90 };

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
  range: OverviewRange;
  bucket: OverviewBucket;
  groupBy: OverviewGroupBy;
  /** `'all'` (the rail's own sentinel — see `use-overview-screen.ts`'s `MODEL_OPTIONS`) omits the filter. */
  model: string;
  /** Injected rather than read from `Date.now()` internally — see `CURRENT_PERIOD`'s equivalent
   *  note in `url-state.ts`: a pure function's output must not depend on when it happens to run. */
  now: Date;
}

/** Builds the `UsageQueryRequest` for the SPEND/SPEND SHARE dashboards from the Overview's own
 *  URL-driven view state (range/bucket/group-by/model) plus the console scope (account/project). */
export function buildOverviewUsageRequest(input: OverviewUsageQueryInput): UsageQueryRequest {
  const endTime = input.now;
  const startTime = new Date(endTime.getTime() - RANGE_DAYS[input.range] * 86_400_000);
  const scoped = Boolean(input.projectId);

  return {
    scope: scoped ? 'project' : 'account',
    scope_id: scoped ? (input.projectId as string) : input.accountId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    bucket: input.bucket,
    group_by: [overviewGroupByToUsageGroupBy(input.groupBy)],
    filters: input.model !== 'all' ? { model: input.model } : undefined,
  };
}

/** A finite, non-negative cost — a malformed or negative `total_cost` from the backend renders as
 *  `0` for THIS point only rather than throwing and taking the whole chart down with it (#304's
 *  "a malformed response does not crash the caller" AC extended to the mapping layer, not just
 *  the transport one `usage-client.ts` already covers). */
function safeCost(point: UsageSeriesPoint): number {
  return Number.isFinite(point.total_cost) && point.total_cost > 0 ? point.total_cost : 0;
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

/** Maps the same response into `DonutSlice[]` for `SpendShareSection` — one slice per group-by
 *  dimension value, summed across the whole range, in the same key order `toSpendSeries` uses so
 *  the chart and the donut share the same series identity for selection syncing. */
export function toSpendShareSlices(
  response: UsageQueryResponse,
  groupBy: OverviewGroupBy
): DonutSlice[] {
  const totalsByKey = new Map<string, number>();

  for (const point of response.points) {
    const key = groupKey(point, groupBy);
    totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + safeCost(point));
  }

  return Array.from(totalsByKey.entries()).map(([key, value]) => ({ key, label: key, value }));
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
