import type {
  UsageQueryRequest,
  UsageQueryResponse,
  UsageSeriesPoint,
} from '@lightbridge/api-rest';
import { formatUsd } from '@lightbridge/ui-web/src/lib/money';
import type { ShareBarSegment } from '@lightbridge/ui-web/src/components/share-bar';

import type { OVERVIEW_BUCKETS, OVERVIEW_GROUP_BYS, OVERVIEW_RANGES } from '../client/url-state';
import { microUsdToUsd } from '../server/consumption-csv';
import { apiKeysAccountFilters, type ApiKeysFilter } from './api-key-rows';

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
 * How a range preset is WORDED — the sentence a page's subtitle and a report's header both state.
 *
 * Lives here, in the module that already owns `OverviewRange`/`resolveOverviewWindow`, because
 * converse-frontends#453 needs it on the SERVER (the export route has no screen hook to read it
 * from) and a fifth private copy would be a fifth thing to keep in step. The four container hooks
 * that still declare their own identical copy (`use-overview-screen.ts`,
 * `use-admin-overview-screen.ts`, `use-usage-overview-screen.ts`,
 * `use-settings-overview-screen.ts`) are deleted by the `dashboards.yaml` migration (C4/C12);
 * this is where the surviving definition lives.
 */
export const RANGE_LABELS: Record<OverviewRange, string> = {
  mtd: 'This month',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

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

export interface OverviewUsageQueryInput {
  accountId: string;
  /** `null`/`''` = account-wide; a project id scopes the query to that project instead. */
  projectId?: string | null;
  /** The resolved UTC window. Presets are resolved to dates by the caller (`resolveOverviewWindow`)
   *  so this builder never has to know whether the user picked a preset or a calendar span. */
  window: { start: Date; end: Date };
  bucket: OverviewBucket;
  /**
   * `undefined` builds the UNGROUPED (account-total) request — the account overview's own "Spend
   * over time" chart's shape since the 2026-08-31 owner finding ("the graphs are literally
   * completely different"; see `use-overview-screen.ts`'s `totalUsageQuery`). A real dimension
   * still drives the SHARE bar's own (separately queried) breakdown.
   */
  groupBy?: OverviewGroupBy;
  /** `'all'` (the rail's own sentinel — see `use-overview-screen.ts`'s `MODEL_OPTIONS`) omits the filter. */
  model: string;
}

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

/** Builds the `UsageQueryRequest` for the SPEND/SPEND SHARE dashboards from the Overview's own
 *  URL-driven view state (range/bucket/group-by/model) plus the console scope (account/project).
 *  Omitting `groupBy` builds the UNGROUPED request — one point per bucket, summed across every
 *  project/model/user/api-key (including unattributed spend), the shape the account TOTAL chart
 *  now uses. */
export function buildOverviewUsageRequest(input: OverviewUsageQueryInput): UsageQueryRequest {
  const { start: startTime, end: endTime } = input.window;
  const scoped = Boolean(input.projectId);

  return {
    scope: scoped ? 'project' : 'account',
    scope_id: scoped ? (input.projectId as string) : input.accountId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    bucket: USAGE_BUCKET_INTERVAL[input.bucket],
    group_by: input.groupBy ? [input.groupBy] : undefined,
    filters: input.model !== 'all' ? { model: input.model } : undefined,
    limit: USAGE_QUERY_LIMIT,
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
 * `key` stays the id: it is the identity the share bar and the `?series=` URL param both match
 * on. Only the LABEL changes.
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

/**
 * IA v3 phase 4's own measurement: 88% of usage rows carry no `project_id` at all — a real,
 * common state, not an edge case. `groupKey` still folds those into the `UNASSIGNED_KEY` sentinel
 * (every OTHER dimension legitimately wants that bucket rendered as an ordinary row/segment), but
 * a PROJECT breakdown must never turn it into a series: "NULL group keys are never a series,
 * surface as a caption" (build brief §3). This strips it out of whichever list a caller already
 * built and hands back an honest caption describing the excluded share, or `null` when there was
 * nothing to exclude — never a caption stating "0% unattributed" for a dataset with no gap at all.
 */
export function splitUnassignedProjects<T extends { key: string; value: number }>(
  segments: readonly T[]
): { segments: T[]; unassignedCaption: string | null } {
  const unassigned = segments.find((s) => s.key === UNASSIGNED_KEY);
  const kept = segments.filter((s) => s.key !== UNASSIGNED_KEY);
  if (!unassigned || unassigned.value <= 0) {
    return { segments: kept, unassignedCaption: null };
  }
  const total = segments.reduce((sum, s) => sum + Math.max(s.value, 0), 0);
  const percent = total > 0 ? Math.round((unassigned.value / total) * 100) : 0;
  return {
    segments: kept,
    unassignedCaption: `${formatUsd(unassigned.value)} (${percent}%) of spend is not attributed to a project this period.`,
  };
}

/**
 * A single-band chart (or a one-row breakdown) asserts a shape the data does not actually have —
 * "here is how spend varies across N things" reads as broken when N turns out to be zero or one.
 * This is the ONE place that decision is made, reused by both the account overview's SPEND chart
 * (`use-overview-screen.ts`) and the settings-overview lenses' secondary breakdown
 * (`use-settings-overview-screen.ts`) — finish item §2.
 *
 * No extra query: takes the SAME segments/caption the caller already computed for the real
 * rendering (`toSpendShareSegments`/`splitUnassignedProjects`'s own output), never fires a
 * dedicated "how many distinct values" request.
 *
 *  - 0 segments, no `unassignedCaption` — genuinely no usage at all; `undefined` here, since the
 *    chart's/list's own built-in empty state already says that honestly.
 *  - 0 segments, WITH an `unassignedCaption` — real usage exists but none of it resolved to a
 *    real value of this dimension (e.g. 100% unattributed to a project); the caption IS the
 *    degenerate message, stated as why there is nothing to chart, not "no usage."
 *  - Exactly 1 segment — a real single value; states it by name rather than drawing one flat band.
 *  - >=2 segments — a real breakdown; `undefined`.
 */
export function degenerateChartMessage(
  segments: readonly { label: string }[],
  dimensionNoun: string,
  unassignedCaption: string | null
): string | undefined {
  if (segments.length === 0) {
    return unassignedCaption ?? undefined;
  }
  if (segments.length === 1) {
    return `Only one ${dimensionNoun} in this window (${segments[0].label}).`;
  }
  return undefined;
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
