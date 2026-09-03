import type {
  UsageQueryRequest,
  UsageQueryResponse,
  UsageSeriesPoint,
} from '@lightbridge/api-rest';
import { formatUsd } from '@lightbridge/ui-web/src/lib/money';
import type { ShareBarSegment } from '@lightbridge/ui-web/src/components/share-bar';

import type { OVERVIEW_GROUP_BYS, OVERVIEW_RANGES } from '../client/url-state';
import { microUsdToUsd } from '../server/consumption-csv';
import { apiKeysAccountFilters, type ApiKeysFilter } from './api-key-rows';
import type { Translate } from '../i18n/config';

/**
 * The console's shared usage-query vocabulary: how a `?range=`/`?from=`/`?to=` selection becomes
 * one UTC window, the explicit row limit every request carries, the micro-USD guard and the
 * unassigned sentinel every response adapter reads through, and the BILLING-PERIOD budget-
 * consumption requests.
 *
 * **What this module is NOT any more, as of C12 (converse-frontends#455).** It used to also hold
 * the account dashboard's own request builder and share-bar adapters — `buildOverviewUsageRequest`
 * (with its `?bucket=` interval table), `splitUnassignedProjects` and `degenerateChartMessage`.
 * Those served a hand-written page that is now a `dashboards.yaml` entry, so they are deleted
 * rather than left standing beside `resolve-dashboard.ts`/`panel-adapters.ts`, which do the same
 * work from the spec. What remains is what has callers OUTSIDE any one dashboard: the window
 * resolution every page's range picker shares, the guards the declarative engine's own adapters
 * import, and the billing-period requests the RPC-backed budget zones fire.
 *
 * Kept dependency-free of React/refine/TanStack Query so the mapping itself — the part most likely
 * to have an off-by-one or a wrong dimension — is covered by plain unit tests, the same split
 * `refill-rows.ts` already uses.
 */

export type OverviewRange = (typeof OVERVIEW_RANGES)[number];
export type OverviewGroupBy = (typeof OVERVIEW_GROUP_BYS)[number];

/** The three ROLLING presets' fixed day counts. `mtd` is deliberately excluded — it is a
 *  calendar-month span, not a fixed day count, and has no entry here (see `resolveRangeWindow`). */
export const RANGE_DAYS: Record<Exclude<OverviewRange, 'mtd'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/**
 * A bare `range` preset -> one UTC window, with no `from`/`to` involved — the piece
 * `resolveOverviewWindow` below falls back to once it has ruled out an explicit span.
 *
 * `mtd` resolves to a CALENDAR-MONTH span (UTC month start -> `now`), matching the billing period
 * the budget itself resets on (2026-08-31 owner directive: "the budget resets monthly, so the
 * dashboard default matches the billing window") — NOT a rolling 30-day window, which is what
 * `'30d'` is for. This is the exact same math `currentPeriodRange` below already uses for
 * BudgetHero's consumption query; reused here (not re-derived) so "this month" means the same UTC
 * span everywhere it appears. The three rolling presets stay `now` minus N whole days.
 */
export function resolveRangeWindow(range: OverviewRange, now: Date): { start: Date; end: Date } {
  if (range === 'mtd') return currentPeriodRange(now);
  return { start: new Date(now.getTime() - RANGE_DAYS[range] * 86_400_000), end: now };
}

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
  return resolveRangeWindow(range, now);
}

/**
 * Is `raw` one of the four presets? The membership check `parseRange` needs, kept separate from
 * the WORDING below because validating a URL param must not depend on a locale — a `?range=7d`
 * link written by a German-reading operator has to parse identically for an English-reading one.
 */
export function isOverviewRange(raw: string | null | undefined): raw is OverviewRange {
  return raw != null && (['mtd', '7d', '30d', '90d'] as readonly string[]).includes(raw);
}

/**
 * How a range preset is WORDED — the sentence a page's subtitle and a report's header both state.
 *
 * Lives here, in the module that already owns `OverviewRange`/`resolveOverviewWindow`, because
 * converse-frontends#453 needs it on the SERVER (the export route has no screen hook to read it
 * from) and a fifth private copy would be a fifth thing to keep in step.
 *
 * ADR 0017 makes it a FUNCTION rather than the module-level `Record` it was: the labels are copy, and copy
 * cannot be a module constant once the console speaks two languages — a constant is resolved once
 * at import time, before any request has a locale. Every caller already had a `t` in hand (the
 * containers through `useTranslation`, the report route through `getServerTranslation`), so this
 * is one argument, not a new dependency for anyone.
 *
 * The KEYS are `OverviewRange`'s own values, so the map stays total by construction and a preset
 * the picker can offer but the URL parser would reject still cannot exist.
 */
export function rangeLabels(t: Translate): Record<OverviewRange, string> {
  return {
    mtd: t('range.mtd'),
    '7d': t('range.7d'),
    '30d': t('range.30d'),
    '90d': t('range.90d'),
  };
}

/** `YYYY-MM-DD` in UTC — the form `from`/`to` take in the URL. */
export function toUrlDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * **`console-ui#312`, closed.** `OverviewGroupBy` (`url-state.ts`'s `OVERVIEW_GROUP_BYS`) used to
 * be a UI-facing pair (`'project' | 'model'`) picked before the usage contract's real
 * `UsageGroupBy` enum was read closely, bridged onto it through a translation table right here.
 * `OverviewGroupBy` is now LITERALLY a subset of `UsageGroupBy` (asserted at `OVERVIEW_GROUP_BYS`'
 * own definition via `satisfies readonly UsageGroupBy[]`), so the URL param IS the wire value —
 * there is nothing left to bridge. `overviewGroupByToUsageGroupBy` is gone; every call site below
 * passes `groupBy` straight through.
 */

/** The dimension field a `UsageSeriesPoint` carries the group-by value under — identical to
 *  `OverviewGroupBy` itself now that the bridge above is gone, kept as its own map (rather than an
 *  identity cast) so a reader can see at a glance which `UsageSeriesPoint` property each dimension
 *  reads without cross-referencing the wire enum. */
const GROUP_BY_POINT_FIELD: Record<OverviewGroupBy, keyof UsageSeriesPoint> = {
  project_id: 'project_id',
  model: 'model',
  user_id: 'user_id',
  api_key_id: 'api_key_id',
};

/**
 * The `limit` every usage request sets explicitly (build brief §5) — the usage API accepts one,
 * and an unbounded request against a wide window (90d, hourly) is a real "how many rows could this
 * possibly return" unknown, not a hypothetical. Every request builder in this module (and
 * `settings-overview-usage.ts`'s own, sharing this constant) sets it, and `isUsageResponseTruncated`
 * below is how a caller detects the response actually hit it.
 */
export const USAGE_QUERY_LIMIT = 2000;

/** `points.length === limit` is the one honest truncation signal the response shape gives —
 *  anything less means the query returned everything there was. Never inferred from a "looks like
 *  a round number" heuristic. */
export function isUsageResponseTruncated(
  response: UsageQueryResponse,
  limit: number = USAGE_QUERY_LIMIT
): boolean {
  return response.points.length === limit;
}

/** A finite, non-negative cost — a malformed or negative `total_cost` from the backend renders as
 *  `0` for THIS point only rather than throwing and taking the whole chart down with it (#304's
 *  "a malformed response does not crash the caller" AC extended to the mapping layer, not just
 *  the transport one `usage-client.ts` already covers). */
export function safeCost(point: UsageSeriesPoint): number {
  const microUsd = Number.isFinite(point.total_cost) && point.total_cost > 0 ? point.total_cost : 0;
  return microUsdToUsd(microUsd);
}

/** The sentinel for points the backend attributed to no project/model at all. */
export const UNASSIGNED_KEY = 'unassigned';

function groupKey(point: UsageSeriesPoint, groupBy: OverviewGroupBy): string {
  const value = point[GROUP_BY_POINT_FIELD[groupBy]];
  return typeof value === 'string' && value.length > 0 ? value : UNASSIGNED_KEY;
}

/**
 * Resolves a series key to something a human can read.
 *
 * The usage backend groups by `project_id`, so every series arrives keyed by an opaque id
 * (`zezxvt21irmoi0kzm22el7gu`). Until now each adapter did `label: key`, which put those ids
 * straight onto the share list — the console's most visible papercut.
 *
 * `key` stays the id: it is the identity a share bar or a ranked row matches on. Only the LABEL
 * changes. The declarative engine has its own, dimension-aware version of the same idea
 * (`DashboardLabelResolver`); this one survives for `project-rows.ts` and the budget-pressure
 * zone, whose single dimension is known at the call site.
 */
export type SeriesLabeller = (key: string) => string;

const identityLabel: SeriesLabeller = (key) => key;

/**
 * Maps the same response into `ShareBarSegment[]` for `SpendShareSection` — one segment per
 * group-by dimension value, summed across the whole range.
 *
 * **`toSpendSeries` (the per-group-by TIME SERIES this fed alongside, one line per dimension
 * value) is gone (2026-08-31 owner-round parity fix, finding #1)** — it fed the account overview's
 * own "Spend over time" chart a per-project/model/user/api-key split that silently DROPPED every
 * unassigned-spend point (often 88-99% of real spend) for a project breakdown, drawing a
 * completely different curve from the estate overview's own summed total for the same account
 * (the owner's own finding: "the graphs are literally completely different... They should
 * normally be exactly the same, right?"). That chart now plots the UNGROUPED account total
 * instead (`use-overview-screen.ts`'s `totalUsageQuery`, via `settings-overview-usage.ts`'s
 * `toAggregateDaySeries` — the SAME summing semantics the estate already uses). The per-project/
 * model split is still real, just SHARE-only now — this function, feeding `spendSegments` alone.
 * `capSeriesWithOther` (the chart's own >4-series capping) went with it, having no caller left.
 *
 * Segments arrive sorted by value, descending: `ShareBar` colours by ARRAY INDEX (rank), so an
 * unsorted list would hand rank 1's lightest grey to whichever key the response happened to
 * mention first rather than to the largest share. */
export function toSpendShareSegments(
  response: UsageQueryResponse,
  groupBy: OverviewGroupBy,
  labelFor: SeriesLabeller = identityLabel
): ShareBarSegment[] {
  const totalsByKey = new Map<string, number>();

  for (const point of response.points) {
    const key = groupKey(point, groupBy);
    totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + safeCost(point));
  }

  return Array.from(totalsByKey.entries())
    .map(([key, value]) => ({ key, label: labelFor(key), value, formattedValue: formatUsd(value) }))
    .sort((a, b) => b.value - a.value);
}

/** Total spend across every point in the response — used for the SPEND stat card and, with a
 *  separately-scoped request (see `use-overview-screen.ts`), the budget consumption figure. */
export function sumTotalCost(response: UsageQueryResponse): number {
  return response.points.reduce((sum, point) => sum + safeCost(point), 0);
}

/** `[start of this calendar month (UTC), now]` — the budget domain's own period boundary
 *  (`authz.cstack`'s `'YYYY-MM'` `Period`), independent of whatever the dashboard's own range
 *  picker is currently set to: budget consumption is always "this billing period," not "whatever
 *  range is picked" — even though that range picker's OWN default (`mtd`) now resolves to this
 *  exact same span via `resolveRangeWindow` above, the two stay independently computed rather than
 *  one reading the other, because a viewer who picks `7d`/`30d`/`90d` must not silently move
 *  BudgetHero's own period along with it. */
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
    limit: USAGE_QUERY_LIMIT,
  };
}

/**
 * The same account-scoped, ungrouped consumption request, but over the window since the account's
 * reset schedule LAST FIRED — the Budget card's "Spent since last reset" row (owner question,
 * 2026-09-03).
 *
 * A second query rather than a slice of the month-to-date one above, because the usage API's
 * buckets do not align to an arbitrary `run_at_utc` and re-deriving the boundary client-side from
 * day buckets would attribute a whole day's spend to the wrong side of a 06:00 tick.
 *
 * `since` is the schedule's `lastRunAt`; the caller passes the period start when the schedule has
 * never fired in this period, in which case this request IS `buildBudgetConsumptionRequest` and
 * TanStack Query dedupes it away — the same figure, stated twice, is not two claims.
 */
export function buildSinceResetConsumptionRequest(
  accountId: string,
  since: Date,
  now: Date
): UsageQueryRequest {
  return {
    scope: 'account',
    scope_id: accountId,
    start_time: since.toISOString(),
    end_time: now.toISOString(),
    limit: USAGE_QUERY_LIMIT,
  };
}

/**
 * The same billing-period, account-scoped consumption request as `buildBudgetConsumptionRequest`,
 * but broken down **by project** — the admin overview's budget-pressure zone.
 *
 * Deliberately a separate builder rather than a `groupBy` argument on the one above: the ungrouped
 * request answers "what has this account spent this period" (BudgetHero's single numeral) and this
 * one answers "which projects did that spend come from," and the two are read by different zones
 * with different query keys. Sharing `currentPeriodRange` keeps them over the identical window, so
 * the parts always sum to the whole.
 *
 * Always account-scoped and never project-scoped, for the same reason the ungrouped one is: budget
 * is account-scoped in the schema (`GetMyBudgetBalanceInput`'s own doc comment — "budget_account_id
 * is always identical to account_id"), and the admin overview is by definition every project in
 * the account rather than whichever one the scope picker happens to hold.
 */
export function buildBudgetConsumptionByProjectRequest(
  accountId: string,
  now: Date
): UsageQueryRequest {
  return {
    ...buildBudgetConsumptionRequest(accountId, now),
    group_by: ['project_id'],
  };
}

/**
 * The "Active API keys" stat card's count filters (live findings #5, 2026-08-30): the card used
 * to read `apiKeys.result.total` off an UNFILTERED `useList`, which counts every key regardless
 * of status — a real production account showed "8" where 6 of those were revoked. Filtering
 * `status eq active` server-side, the same `status`/`eq` shape `use-api-keys-screen.ts`'s own
 * ledger status filter already sends against this resource, keeps this a real filtered COUNT
 * query (`pagination: { pageSize: 1 }`, `result.total`) rather than a client-side recount over a
 * page that may not hold every key.
 *
 * Phase 2d (account-scoping audit, converse-frontends#368/#392) layers the SAME fix
 * `use-api-keys-screen.ts`'s own ledger got on top of the status filter: `apiKeysAccountFilters`
 * scopes the count to the account's own projects (`projectId in […]`) whenever no single project
 * is picked, instead of the identity-wide count the card used to show — `null` when there is no
 * safe filter to send yet, which the caller must treat as "do not fire this query," not "fire it
 * unfiltered" (see that function's own doc comment).
 *
 * A plain array literal, not a hook — pulled out here (rather than left inline in
 * `use-overview-screen.ts`) so the shape itself is covered by a plain unit test, the same split
 * every other request/filter builder in this module uses.
 */
export function activeApiKeysCountFilters(
  projectId: string | null,
  accountProjectIds: readonly string[]
): Array<ApiKeysFilter | { field: 'status'; operator: 'eq'; value: string }> | null {
  const accountFilters = apiKeysAccountFilters({ projectId, accountProjectIds });
  if (accountFilters === null) return null;
  return [...accountFilters, { field: 'status', operator: 'eq', value: 'active' }];
}
