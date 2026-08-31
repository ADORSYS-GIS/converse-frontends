import type { UsageQueryResponse } from '@lightbridge/api-rest';
import type { MultiSeriesSpendSeries } from '@lightbridge/ui-web';
import type { StatCardDelta } from '@lightbridge/ui-web/src/components/stat-card';

import { safeCost, UNASSIGNED_KEY } from './overview-usage';
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
 * Kept dependency-free of React/refine/TanStack Query, the same split every other usage adapter
 * module in this directory uses.
 */

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
