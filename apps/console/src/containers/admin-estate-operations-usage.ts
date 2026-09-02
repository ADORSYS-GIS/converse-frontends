import type {
  UsageQueryRequest,
  UsageQueryResponse,
  UsageSeriesPoint,
} from '@lightbridge/api-rest';
import { shortAccountId } from '@lightbridge/ui-web';

import { accountScopeLabel } from './account-label';
import { safeCost, USAGE_QUERY_LIMIT } from './overview-usage';
import type { AccountUsageResponse } from './usage-overview-usage';

/**
 * The pure adapters behind the two `/admin/overview` zones that are NOT usage-query panels
 * (converse-frontends#447, story C4).
 *
 * **What happened to `admin-overview-usage.ts`.** That module held the request builders and
 * response adapters for all eight of the page's boards. Six of them are now `dashboards.yaml`
 * entries rendered by the declarative engine (`src/dashboards/*`), so their adapters —
 * `combineModelDaySeries`, `requestVolumeSeries`, `activeAccountsPerDay`, `activeProjectsPerDay`,
 * `adoptionOverTimeSeries`, `estateProjectLabel`, `dayPrecisionLastActiveLabel`, `spendDelta`,
 * `safeRequests`, and the four `buildEstate*Request` builders — were DELETED with it, not moved:
 * every one of them is now `resolve-dashboard.ts` + `panel-adapters.ts` doing the same job once
 * for every page instead of once per screen.
 *
 * What survives is here, and only because ONE zone on that page is not a usage query at all:
 * dashboard 4's budget pressure needs `getBudgetBalance` — an RPC, one call per account — beside
 * the per-account month-to-date spend the usage API does provide. A YAML panel describes a usage
 * query and nothing else, so pretending this zone were one would mean inventing an RPC panel type
 * for a single caller. It stays a hand-written zone, rendered in its own `DashboardGrid` above the
 * engine's, and these are the four things it reads.
 *
 * Kept free of React/TanStack Query, the same split every other `*-usage.ts` module here uses.
 */

/**
 * Splits one multi-account `scope: 'all'` response into per-account slices.
 *
 * A point with no `account_id` cannot happen for a `group_by: ['account_id', ...]` request in
 * practice (the backend groups BY that field, so every returned point carries it) — dropped
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
 * An account's display label: the real name for the operator's own family (`accountScopeLabel`,
 * the same label every other account-facing surface in this console uses) and a short, non-UUID
 * sentinel otherwise — a foreign account discovered only via `scope: 'all'` has no name the
 * console can resolve (no RPC reaches outside the operator's own family today; lane A2's
 * `resolveActorLabels` is what closes that, and C5 adopts it), so the fallback must never be the
 * raw id (console-ui skill: no raw UUID as a visible label) but also must not fabricate a name.
 */
export function estateAccountLabel(
  accountId: string,
  familyAccounts: readonly { id: string; name?: string | null }[]
): string {
  const account = familyAccounts.find((a) => a.id === accountId);
  return account ? accountScopeLabel(account) : shortAccountId(accountId);
}

/**
 * The budget-pressure zone's own spend query: estate-wide, day-bucketed, grouped by account.
 *
 * Always the BILLING PERIOD (`currentPeriodRange`), never the page's range picker — a budget
 * ceiling is a fact about this calendar month, and comparing month-to-date spend against it is
 * the only reading that means anything. That is why this zone does not simply reuse one of the
 * engine's panels: every panel on the page follows the range picker, and this one must not.
 */
export function buildEstateMtdRequest(window: { start: Date; end: Date }): UsageQueryRequest {
  return {
    scope: 'all',
    scope_id: '',
    start_time: window.start.toISOString(),
    end_time: window.end.toISOString(),
    bucket: '1 day',
    group_by: ['account_id'],
    limit: USAGE_QUERY_LIMIT,
  };
}

/** One account's month-to-date total, from its own slice of the estate response. */
export function summarizeMtdSpend(response: UsageQueryResponse): number {
  let spend = 0;
  for (const point of response.points) spend += safeCost(point);
  return spend;
}

/**
 * The account-id set the `getBudgetBalance` fan-out queries.
 *
 * The candidate set is the union of every account id the estate-wide month-to-date usage response
 * actually named (`usageAccountIds` — real spend this billing period, the accounts budget pressure
 * is actually ABOUT) and the operator's own family (`familyAccountIds` — surfaces a family
 * account's ceiling even in a period it has not drawn against yet). Deduplicated, usage-named ids
 * first, capped at `cap` so a real deployment with many accounts never fans out an unbounded
 * number of RPCs from one page load. `truncated` distinguishes "more candidates existed than the
 * cap allowed" from "this is genuinely everything", so the caller can caption honestly rather than
 * silently dropping accounts.
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

/** The zone's truncation caption — only rendered when the cap actually dropped real candidates.
 *  `undefined` when nothing was truncated. */
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
 * Dashboard 5's honesty caption, unchanged by the migration: the refill zone states a queue depth
 * and nothing else, because `listPendingAugmentationRequests` is a PENDING-only read path and
 * there is no procedure anywhere that lists DECIDED requests or their decision timestamps.
 */
export const REFILL_DECISIONS_UNAVAILABLE_CAPTION =
  'Decision history and median time to decision are not available — the budget service only ' +
  'exposes the pending queue, not a listing of past decisions (lightbridge-authz#556).';
