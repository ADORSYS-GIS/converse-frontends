import type { UsageQueryRequest, UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import { shortAccountId } from '@lightbridge/ui-web';
import type { MultiSeriesSpendSeries } from '@lightbridge/ui-web';
import type { StatCardDelta } from '@lightbridge/ui-web/src/components/stat-card';

import { accountScopeLabel } from './account-label';
import { safeCost, UNASSIGNED_KEY, USAGE_QUERY_LIMIT } from './overview-usage';
import type { AccountUsageResponse } from './usage-overview-usage';

/**
 * Pure request/response adapters for `/admin/overview` (converse-frontends#368, the operator
 * dashboard batch approved verbatim on `claude/sb-admin-dashboards` — page story
 * `Pages/AdminOverview`). Sibling of `usage-overview-usage.ts` (the settings-area estate overview
 * this screen shares its fan-out shape with — `MAX_FANNED_OUT_ACCOUNTS`, `previousWindow`,
 * `combineAccountModelResponses`, `toPreviousPeriodSeries` are all reused verbatim by
 * `use-admin-overview-screen.ts` rather than redeclared here) — this module only adds the
 * adapters that screen's own eight boards need and `usage-overview-usage.ts` does not already
 * provide: per-model day series (dashboard 2b), active-accounts/active-projects day series
 * (dashboard 8), request-count day series (dashboard 6), and the MTD account/project summaries
 * behind the top-spenders ledger (dashboard 3) and budget-pressure spend side (dashboard 4).
 *
 * **2026-08-31 estate-wide rewrite (lightbridge-authz#605, owner ruling verbatim: "/admin/overview
 * is overview for ALL account, not just the one the user is bound to. ALL of them." + "Just not
 * mention you're fetching for a specific account.").** Every board below used to be built from a
 * per-account FAN-OUT (`useQueries` over `estateAccountIds`' family∪pending-queue union, capped at
 * `MAX_FANNED_OUT_ACCOUNTS`) — the console's only account enumeration path before #605 shipped.
 * `use-admin-overview-screen.ts` now fires exactly ONE `scope: 'all', scope_id: ''` usage query per
 * board family (the backend adds no entity filter at all for that scope, gated server-side on
 * `usage:read-all` — granted to `lightbridge-admin`) and reads every account/project id straight
 * off the response's own `account_id`/`project_id` group-by dimensions, rather than having to
 * already know them. `estateAccountIds`/`estateCoverageCaption`/`ESTATE_SUBTITLE_SCOPE` (the
 * family∪queue id-harvesting and its honest-but-limited caption) are gone with the fan-out they
 * described — the header now truthfully says "All accounts with usage this period"
 * (`use-admin-overview-screen.ts`'s `subtitle`).
 *
 * `splitResponseByAccount` below is what makes this a small change rather than a rewrite of every
 * adapter: it turns ONE multi-account response (grouped by `account_id` plus whatever second
 * dimension a board needs) back into the SAME `AccountUsageResponse[]` shape the pre-#605
 * fan-out produced, so `combineAccountModelResponses`/`combineModelDaySeries`/`requestVolumeSeries`/
 * `activeAccountsPerDay`/`summarizeMtdUsage` below are unchanged from before this rewrite — only
 * how their input is ASSEMBLED changed, not how it is read.
 *
 * **Real, residual limits (kept honest, not silently dropped — see `use-admin-overview-screen.ts`'s
 * own adoption-zone caption):** the usage API still has no account-ENUMERATION endpoint, only a
 * usage-events query — so an account with genuinely zero spend in a queried window never appears
 * as an `account_id` group at all, and "gone quiet"/"active accounts" can only ever count accounts
 * that had usage in at least one of the compared windows. Account creation dates and "new accounts
 * this period" remain resolvable ONLY for the operator's own family (`scope.allAccounts` — usage
 * events carry no creation-date field for anyone else). A foreign (non-family) account or project
 * discovered via `scope: 'all'` has no resolvable NAME either — `estateAccountLabel`/
 * `estateProjectLabel` below fall back to a short, non-UUID sentinel rather than a raw id.
 *
 * Kept dependency-free of React/refine/TanStack Query, the same split every other usage adapter
 * module in this directory uses.
 */

/**
 * Splits one multi-account `scope: 'all'` response back into per-account slices, in the SAME
 * `AccountUsageResponse[]` shape the pre-#605 per-account fan-out produced — this is the one
 * function that lets every OTHER adapter in this module (`combineAccountModelResponses`,
 * `combineModelDaySeries`, `requestVolumeSeries`, `activeAccountsPerDay`, `summarizeMtdUsage`,
 * all below/imported) stay unchanged: they only ever cared about "which points belong to which
 * account," never about how that grouping was assembled.
 *
 * A point with no `account_id` at all cannot happen for a `group_by: ['account_id', ...]` request
 * in practice (the backend groups BY that field, so every returned point carries it) — dropped
 * defensively rather than folded into a fabricated pseudo-account, since there is no honest label
 * for "usage with no account" the way `UNASSIGNED_KEY` exists for model/project.
 */
export function splitResponseByAccount(response: UsageQueryResponse): AccountUsageResponse[] {
  const byAccount = new Map<string, UsageSeriesPoint[]>();
  for (const point of response.points) {
    const accountId = point.account_id;
    if (typeof accountId !== 'string' || accountId.length === 0) continue;
    const points = byAccount.get(accountId);
    if (points) {
      points.push(point);
    } else {
      byAccount.set(accountId, [point]);
    }
  }
  return Array.from(byAccount.entries()).map(([accountId, points]) => ({
    accountId,
    response: { points },
  }));
}

/**
 * An account's display label, real name for the operator's own family (`accountScopeLabel`, the
 * same label every other account-facing surface in this console uses) and a short, non-UUID
 * sentinel otherwise — a foreign account discovered only via `scope: 'all'` has no name the
 * console can resolve (no RPC reaches outside the operator's own family), so the fallback must
 * never be the raw id (console-ui skill: no raw UUID as a visible label) but also must not
 * fabricate a name that isn't real.
 */
export function estateAccountLabel(
  accountId: string,
  familyAccounts: readonly { id: string; name?: string | null }[]
): string {
  const account = familyAccounts.find((a) => a.id === accountId);
  return account ? accountScopeLabel(account) : shortAccountId(accountId);
}

/** How many leading characters of a project id survive `estateProjectLabel`'s sentinel form —
 *  mirrors `shortAccountId`'s own `SHORT_ID_LENGTH` (a v4 UUID's first hex block). */
const SHORT_PROJECT_ID_LENGTH = 8;

/**
 * A project's display label — sibling of `estateAccountLabel` above for the same reason: a
 * project belonging to a foreign (non-family) account has no name the console can resolve either.
 * `shortAccountId` itself is account-specific (`acct_` prefix) so is not reused verbatim here —
 * this states the identical short-non-UUID idea under a `proj_` prefix instead.
 */
export function estateProjectLabel(
  projectId: string,
  familyProjects: readonly { id: string; name?: string | null }[]
): string {
  const project = familyProjects.find((p) => p.id === projectId);
  if (project?.name) return project.name;
  if (!projectId) return '—';
  const head = projectId.replace(/-/g, '').slice(0, SHORT_PROJECT_ID_LENGTH);
  return `proj_${head}`;
}

/** The fixed day bucket every estate-wide request below uses — same "no bucket toolbar of its
 *  own" reasoning `settings-overview-usage.ts`'s own `DAY_BUCKET` states for the account/project/
 *  user lenses; this screen's range picker controls the WINDOW, never the bucket width. */
const DAY_BUCKET = '1 day';

/** The one `{scope: 'all', scope_id: ''}` shape every board-level estate request below builds
 *  from (lightbridge-authz#605) — `groupBy` is the only thing that varies per board. */
function estateRequest(
  window: { start: Date; end: Date },
  groupBy: UsageQueryRequest['group_by']
): UsageQueryRequest {
  return {
    scope: 'all',
    scope_id: '',
    start_time: window.start.toISOString(),
    end_time: window.end.toISOString(),
    bucket: DAY_BUCKET,
    group_by: groupBy,
    limit: USAGE_QUERY_LIMIT,
  };
}

/** Dashboards 1 (estate total + spend by account), 2 (model mix), 6 (request volume), 8a (active
 *  accounts per day) — every board that needs BOTH which account and which model a point of
 *  spend belongs to. `splitResponseByAccount` turns the single response this returns back into
 *  per-account slices for the adapters below that need one. */
export function buildEstateModelRequest(window: { start: Date; end: Date }): UsageQueryRequest {
  return estateRequest(window, ['account_id', 'model']);
}

/** Dashboard 1's dashed previous-period line — ungrouped: the estate's own single day-bucketed
 *  total is exactly what a comparison line needs, no per-account breakdown. */
export function buildEstatePreviousRequest(window: { start: Date; end: Date }): UsageQueryRequest {
  return estateRequest(window, undefined);
}

/** Dashboard 8b (active projects per day) — `project_id` alone: counting DISTINCT active
 *  projects across the whole estate needs no account dimension. */
export function buildEstateProjectActivityRequest(
  window: { start: Date; end: Date }
): UsageQueryRequest {
  return estateRequest(window, ['project_id']);
}

/** Dashboard 3 (top spenders) and dashboard 4's spend side — both account AND project, since top
 *  spenders ranks accounts AND their own project breakdown from the same response. Always the
 *  billing period (`mtdWindow`/`prevMtdWindow`), never the page's own range picker — same
 *  "budget is this billing period" rule every other MTD request in this console follows. */
export function buildEstateMtdRequest(window: { start: Date; end: Date }): UsageQueryRequest {
  return estateRequest(window, ['account_id', 'project_id']);
}

/** A finite, non-negative request count — mirrors `overview-usage.ts`'s `safeCost` guard for the
 *  sibling field (`settings-overview-usage.ts` declares an identical private copy; this one is
 *  exported since `admin-overview-usage.test.ts` covers it directly, the same way `safeCost`
 *  itself is covered). */
export function safeRequests(point: UsageQueryResponse['points'][number]): number {
  return Number.isFinite(point.requests) && point.requests > 0 ? point.requests : 0;
}

const TOP_MODEL_SERIES_COUNT = 5;

/**
 * Dashboard 2b ("Spend by model over time") — per-model day series across the WHOLE fan-out, not
 * one account's own breakdown (`settings-overview-usage.ts`'s `toMultiSeriesSpend` is scoped to a
 * single lens target). Capped to the `TOP_MODEL_SERIES_COUNT` largest-spend models plus one real
 * "Other" line summing every model beyond that — the same top-N-plus-Other shape
 * `truncateShareSegments` gives `ShareBar` (dashboard 2a), so the chart never silently drops a
 * model's spend without saying so on its own axis.
 */
export function combineModelDaySeries(
  perAccount: readonly AccountUsageResponse[],
  topN: number = TOP_MODEL_SERIES_COUNT,
  otherLabel: (count: number) => string = (count) => `Other (${count} models)`
): MultiSeriesSpendSeries[] {
  const byModelByDay = new Map<string, Map<number, number>>();
  const totalsByModel = new Map<string, number>();

  for (const { response } of perAccount) {
    for (const point of response.points) {
      const model =
        typeof point.model === 'string' && point.model.length > 0 ? point.model : UNASSIGNED_KEY;
      const t = new Date(point.bucket_start).getTime();
      const cost = safeCost(point);
      let byDay = byModelByDay.get(model);
      if (!byDay) {
        byDay = new Map();
        byModelByDay.set(model, byDay);
      }
      byDay.set(t, (byDay.get(t) ?? 0) + cost);
      totalsByModel.set(model, (totalsByModel.get(model) ?? 0) + cost);
    }
  }

  const ranked = Array.from(totalsByModel.entries()).sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, topN).map(([model]) => model);
  const overflow = ranked.slice(topN).map(([model]) => model);

  const series: MultiSeriesSpendSeries[] = top.map((model) => {
    const byDay = byModelByDay.get(model) ?? new Map<number, number>();
    const ordered = Array.from(byDay.entries()).sort(([a], [b]) => a - b);
    return {
      key: model,
      label: model === UNASSIGNED_KEY ? 'Unassigned' : model,
      points: ordered.map(([t, y]) => ({ x: new Date(t), y })),
    };
  });

  if (overflow.length > 0) {
    const overflowByDay = new Map<number, number>();
    for (const model of overflow) {
      const byDay = byModelByDay.get(model) ?? new Map<number, number>();
      for (const [t, y] of byDay) overflowByDay.set(t, (overflowByDay.get(t) ?? 0) + y);
    }
    const ordered = Array.from(overflowByDay.entries()).sort(([a], [b]) => a - b);
    series.push({
      key: '__other__',
      label: otherLabel(overflow.length),
      points: ordered.map(([t, y]) => ({ x: new Date(t), y })),
    });
  }

  return series;
}

/**
 * Dashboard 6 ("Request volume & errors") — the REQUESTS half only. There is no error/status
 * signal anywhere in `UsageSeriesPoint` (`openapi/usage.backend.yaml`'s own schema — no
 * `error_count`/`status_code`/equivalent field exists), so this deliberately has no error-series
 * counterpart; `use-admin-overview-screen.ts` captions the omission rather than fabricating one
 * (backend gap filed — see that hook's own doc comment for the issue reference).
 */
export function requestVolumeSeries(perAccount: readonly AccountUsageResponse[]): {
  series: MultiSeriesSpendSeries;
  totalRequests: number;
} {
  const dayTotals = new Map<number, number>();
  let totalRequests = 0;
  for (const { response } of perAccount) {
    for (const point of response.points) {
      const t = new Date(point.bucket_start).getTime();
      const requests = safeRequests(point);
      dayTotals.set(t, (dayTotals.get(t) ?? 0) + requests);
      totalRequests += requests;
    }
  }
  const points = Array.from(dayTotals.entries())
    .sort(([a], [b]) => a - b)
    .map(([t, y]) => ({ x: new Date(t), y }));
  return { series: { key: 'requests', label: 'Requests', points }, totalRequests };
}

/**
 * Dashboard 8's own day series — an account counts as "active" a given day when its SUMMED spend
 * (across every model, i.e. `AccountUsageResponse.response`, the SAME model-grouped fan-out
 * dashboard 1 already fetches — no dedicated query) is greater than zero that day.
 */
export function activeAccountsPerDay(
  perAccount: readonly AccountUsageResponse[]
): Map<number, number> {
  const perDay = new Map<number, Set<string>>();
  for (const { accountId, response } of perAccount) {
    const dayTotals = new Map<number, number>();
    for (const point of response.points) {
      const t = new Date(point.bucket_start).getTime();
      dayTotals.set(t, (dayTotals.get(t) ?? 0) + safeCost(point));
    }
    for (const [t, cost] of dayTotals) {
      if (cost <= 0) continue;
      const set = perDay.get(t) ?? new Set<string>();
      set.add(accountId);
      perDay.set(t, set);
    }
  }
  const result = new Map<number, number>();
  for (const [t, set] of perDay) result.set(t, set.size);
  return result;
}

/**
 * Dashboard 8's project half — a PROJECT-grouped fan-out (`use-admin-overview-screen.ts`'s own
 * "current, range-scoped, group_by=project_id" query set), counted the same way
 * `activeAccountsPerDay` counts accounts. Unassigned spend (`point.project_id` null/empty) is
 * excluded from the count entirely rather than folded into an `UNASSIGNED_KEY` pseudo-project —
 * "NULL group keys are never a series" (`overview-usage.ts`'s own `splitUnassignedProjects` doc
 * comment) applies here exactly as much as it does to a project SHARE breakdown: an operator
 * reading "how many projects were active" would be misled by counting unattributed spend as one
 * more project.
 */
export function activeProjectsPerDay(
  perAccount: readonly AccountUsageResponse[]
): Map<number, number> {
  const perDay = new Map<number, Set<string>>();
  for (const { response } of perAccount) {
    for (const point of response.points) {
      if (typeof point.project_id !== 'string' || point.project_id.length === 0) continue;
      if (!(safeCost(point) > 0)) continue;
      const t = new Date(point.bucket_start).getTime();
      const set = perDay.get(t) ?? new Set<string>();
      set.add(point.project_id);
      perDay.set(t, set);
    }
  }
  const result = new Map<number, number>();
  for (const [t, set] of perDay) result.set(t, set.size);
  return result;
}

/** Merges the two day-count maps above into `MultiSeriesSpendBoard`'s own series shape — every
 *  day either map has an entry for, zero-filled on whichever side has none for that day (a day
 *  with active projects but a rounding gap in the account map, or vice versa, should read as 0,
 *  never be dropped from the x-domain). */
export function adoptionOverTimeSeries(
  activeAccounts: ReadonlyMap<number, number>,
  activeProjects: ReadonlyMap<number, number>
): MultiSeriesSpendSeries[] {
  const days = Array.from(new Set([...activeAccounts.keys(), ...activeProjects.keys()])).sort(
    (a, b) => a - b
  );
  return [
    {
      key: 'active-accounts',
      label: 'Active accounts',
      points: days.map((t) => ({ x: new Date(t), y: activeAccounts.get(t) ?? 0 })),
    },
    {
      key: 'active-projects',
      label: 'Active projects',
      points: days.map((t) => ({ x: new Date(t), y: activeProjects.get(t) ?? 0 })),
    },
  ];
}

export interface MtdProjectSummary {
  projectId: string;
  spend: number;
  /** The latest day (within the queried window) this project drew anything — `null` when it drew
   *  nothing in the window at all. Day precision only: the request is day-bucketed, so an exact
   *  timestamp would fabricate precision the response does not carry. */
  lastActive: Date | null;
}

export interface MtdAccountSummary {
  spend: number;
  lastActive: Date | null;
  /** Excludes the `UNASSIGNED_KEY` bucket entirely — same "never a fabricated project row" rule
   *  `activeProjectsPerDay` states above. */
  projects: MtdProjectSummary[];
}

/**
 * Dashboard 3 (top spenders) and dashboard 4's spend side — summarizes one account's day-
 * bucketed, `group_by: ['project_id']` response (current OR previous billing-period window, same
 * shape either way) into its own total, its own last-active day, and a per-project breakdown of
 * the same two figures. One pass over the response for both the account-level and project-level
 * reading, since a project's own total is a real subset of the account's.
 */
export function summarizeMtdUsage(response: UsageQueryResponse): MtdAccountSummary {
  let spend = 0;
  let lastActive: Date | null = null;
  const byProject = new Map<string, { spend: number; lastActive: Date | null }>();

  for (const point of response.points) {
    const cost = safeCost(point);
    spend += cost;
    const t = new Date(point.bucket_start);
    if (cost > 0 && (!lastActive || t > lastActive)) lastActive = t;

    const projectId =
      typeof point.project_id === 'string' && point.project_id.length > 0
        ? point.project_id
        : null;
    if (projectId) {
      const entry = byProject.get(projectId) ?? { spend: 0, lastActive: null };
      entry.spend += cost;
      if (cost > 0 && (!entry.lastActive || t > entry.lastActive)) entry.lastActive = t;
      byProject.set(projectId, entry);
    }
  }

  return {
    spend,
    lastActive,
    projects: Array.from(byProject.entries()).map(([projectId, v]) => ({ projectId, ...v })),
  };
}

/** `StatCardDelta`/`TopSpenderRow.delta`'s own vocabulary from a current/previous pair — never
 *  green/red (console-ui skill), direction is the glyph + wording alone. Mirrors the wording shape
 *  every other delta in this console already uses ("22% vs prev period"). `previous <= 0` with
 *  real current spend reads as "new this period" rather than a meaningless percentage off a zero
 *  base. */
export function spendDelta(current: number, previous: number): StatCardDelta {
  if (previous <= 0) {
    return current > 0
      ? { direction: 'up', label: 'new this period' }
      : { direction: 'flat', label: 'no change' };
  }
  const percent = ((current - previous) / previous) * 100;
  if (Math.abs(percent) < 0.5) return { direction: 'flat', label: 'no change' };
  const rounded = Math.round(Math.abs(percent));
  return {
    direction: percent > 0 ? 'up' : 'down',
    label: `${rounded}% vs prev period`,
  };
}

/**
 * "Last active" at DAY precision, never finer — the underlying query is day-bucketed, so a label
 * like "3 minutes ago" would fabricate precision the response does not carry (console-ui skill
 * "never fabricate a figure" extended to relative-time granularity, not only numerals). `today`
 * is the query's own `dataUpdatedAt`, not `Date.now()` — reading the clock at render time is
 * impure, matching every other "ago" label in this console.
 */
export function dayPrecisionLastActiveLabel(lastActive: Date | null, today: Date): string {
  if (!lastActive) return 'Never active';
  const DAY_MS = 86_400_000;
  const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const startOfActive = Date.UTC(
    lastActive.getUTCFullYear(),
    lastActive.getUTCMonth(),
    lastActive.getUTCDate()
  );
  const days = Math.round((startOfToday - startOfActive) / DAY_MS);
  if (days <= 0) return 'Active today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

/**
 * The account-id set dashboard 4's (budget pressure) `getBudgetBalance` fan-out queries — an RPC,
 * not a usage query, so it cannot itself be folded into the single `scope: 'all'` usage request
 * the spend side of that dashboard now uses (lightbridge-authz#605 only widened the USAGE query
 * API; `getBudgetBalance` is unaffected, still one call per account).
 *
 * The candidate set is the union of every account id the estate-wide MTD usage response actually
 * named (`usageAccountIds` — real spend this billing period, the accounts budget pressure is
 * actually ABOUT) and the operator's own family (`familyAccountIds` — surfaces a family account's
 * ceiling even in a period it has not drawn against yet). Deduplicated, usage-named ids first
 * (the more relevant set for THIS board), capped at `cap` so a real deployment with many accounts
 * never fans out an unbounded number of budget-balance RPCs from one page load — the same
 * `MAX_FANNED_OUT_ACCOUNTS` ceiling this console already uses for the sibling settings-area
 * estate overview (`usage-overview-usage.ts`). `truncated` distinguishes "more candidates existed
 * than the cap allowed" from "this is genuinely everything" so the caller can caption honestly
 * rather than silently dropping accounts.
 */
export interface BudgetPressureAccountIdsResult {
  /** The ids actually fanned out to `getBudgetBalance`, capped at `cap`. */
  ids: string[];
  /** Total distinct candidates found, before capping. */
  totalCandidates: number;
  /** `true` when `totalCandidates > cap` — real candidates exist beyond what was queried. */
  truncated: boolean;
}

export function budgetPressureAccountIds(
  usageAccountIds: readonly string[],
  familyAccountIds: readonly string[],
  cap: number
): BudgetPressureAccountIdsResult {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of usageAccountIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  for (const id of familyAccountIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return {
    ids: ordered.slice(0, cap),
    totalCandidates: ordered.length,
    truncated: ordered.length > cap,
  };
}

/** The page-level honesty caption for `/admin/overview`'s budget-pressure zone — only rendered
 *  when the concurrency cap on `getBudgetBalance` (`budgetPressureAccountIds` above) actually
 *  dropped real candidates, unlike the always-on adoption-zone caveat below (that one describes a
 *  structural limit, not a count that can be zero). `undefined` when nothing was truncated. */
export function budgetPressureTruncationCaption(
  estate: BudgetPressureAccountIdsResult
): string | undefined {
  if (!estate.truncated) return undefined;
  return (
    `Showing budget pressure for ${estate.ids.length} of ${estate.totalCandidates} accounts ` +
    'with usage this period or in your account family.'
  );
}

/**
 * The always-on adoption-zone caveat (lightbridge-authz#605 rewrite — see this module's own
 * top-of-file doc comment for the full before/after). Unlike `budgetPressureTruncationCaption`
 * above, this is not conditional on any count: it states two STRUCTURAL limits of a usage-EVENTS
 * query that no cap or wider fan-out could ever remove —
 *
 *  - An account with genuinely zero spend in every queried window never appears as an
 *    `account_id` group in a `scope: 'all'` response at all (there is no row for it to group),
 *    so "gone quiet" and "active accounts" can only ever count accounts that DREW something in at
 *    least one of the compared windows — a long-dormant account is invisible to both, not counted
 *    as "gone quiet."
 *  - Usage events carry no account creation-date field for anyone — "new accounts this period"
 *    stays resolvable only for the operator's own family (`scope.allAccounts`, the one account
 *    listing this console can call), same limit the pre-#605 fan-out already had.
 *
 * Mirrors `REFILL_DECISIONS_UNAVAILABLE_CAPTION`/`REQUEST_ERROR_RATE_UNAVAILABLE_CAPTION`'s own
 * always-rendered shape in `use-admin-overview-screen.ts` — a real backend-shape gap, captioned
 * inline rather than hidden (ADR 0012 D8).
 */
export const ADOPTION_ESTATE_LIMITS_CAPTION =
  '"New accounts this period" only counts your own account family — usage events carry no ' +
  'account creation date for any account. "Gone quiet" and "active accounts" only count ' +
  'accounts with usage in the compared windows; a long-dormant account with zero usage never ' +
  'appears in an estate-wide usage query at all.';
