import type { UsageQueryRequest, UsageQueryResponse } from '@lightbridge/api-rest';
import type { SpendSeriesSeries } from '@lightbridge/ui-web';

import { currentPeriodRange, safeCost, USAGE_QUERY_LIMIT } from './overview-usage';

/**
 * The two adapters the BILLING-PERIOD budget zones need — all that is left of this module after
 * C12 (converse-frontends#455).
 *
 * It used to hold the whole request/response vocabulary of the three `/settings/overview/*`
 * lenses: a day-bucketed request builder, a whole-window one for latency, the stat row's totals,
 * ranked rows, multi-series spend, latency rows. Every one of those is the declarative engine's
 * job now — `resolve-dashboard.ts` builds the requests from `dashboards.yaml`, `panel-adapters.ts`
 * shapes the responses — so they are deleted rather than left standing beside an engine that does
 * the same work.
 *
 * What survives is what is NOT a panel: the cumulative budget burn-down, which is measured over
 * the calendar month rather than over the page's range picker, and therefore has no YAML entry to
 * belong to. Its two callers are `use-settings-overview-zones.ts` (the account lens) and
 * `use-admin-estate-operations.ts` (the estate's worst-pressure account).
 *
 * Kept dependency-free of React/refine/TanStack Query, the same split every other adapter module
 * in this directory uses, so the mapping is covered by plain unit tests.
 */

/** The day-bucket interval string the burn-down uses. A cumulative running total over a calendar
 *  month reads per day; an hourly bucket would be 700+ points of noise under one ceiling line. */
const DAY_BUCKET = '1 day';

/**
 * The cumulative budget burn-down's request — always the CURRENT BILLING PERIOD, never a range
 * picker's window (the same "budget is this billing period, not whatever range is selected" rule
 * `overview-usage.ts`'s `buildBudgetConsumptionRequest` follows), and always account-scoped, since
 * budget is account-scoped in the schema regardless of which lens is showing it.
 */
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

/** One aggregate series, ignoring whatever dimension the response is grouped by (if any) — the
 *  burn-down is always the account's own total, never split by series. */
export function toAggregateDaySeries(
  response: UsageQueryResponse,
  label: string
): SpendSeriesSeries {
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
