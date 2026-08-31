import type { UsageQueryResponse } from '@lightbridge/api-rest';
import { formatUsd } from '@lightbridge/ui-web';
import type {
  MultiSeriesSpendSeries,
  ShareBarSegment,
  SpendSeriesSeries,
} from '@lightbridge/ui-web';

import { safeCost, UNASSIGNED_KEY } from './overview-usage';

/**
 * Adapters for `/settings/overview/usage` — the owner's cross-account estate overview (IA v3
 * phase 4, build brief §4), the landing lens under "Overview." Distinct from
 * `settings-overview-usage.ts` (the account/project/user LENSES, each scoped to ONE
 * `{scope,scope_id}`): this screen fans out one request PER OWNED ACCOUNT and combines the
 * responses client-side, because the usage API has no bulk "every account I can see, ranked by
 * spend" endpoint — filed as `lightbridge-authz#578` (see `MAX_FANNED_OUT_ACCOUNTS`'s own doc
 * comment for what that gap means for the ranking below).
 */

/**
 * The hard cap on how many accounts this screen ever queries in detail — never fan out to every
 * account an identity happens to own, which could be arbitrarily large.
 *
 * **What this is NOT (yet): a real "top 25 BY SPEND" cap.** The build brief's own language ("...
 * CAPPED at 25 by descending prior-period spend") describes the intended end state; getting there
 * needs a bulk per-account spend summary the usage API does not expose today — ranking 25 real
 * accounts by prior-period spend would otherwise mean fanning out to ALL owned accounts just to
 * decide which 25 to keep, which is the exact N-explosion this cap exists to avoid. Filed as
 * `lightbridge-authz#578` ("bulk list-accounts-by-period-spend for the estate overview's own
 * ranking, without an unbounded per-account fan-out"). Until it lands, this screen takes the
 * first `MAX_FANNED_OUT_ACCOUNTS` accounts in whatever order `GET /accounts` already returns them
 * — real accounts, a real (if not spend-ranked) selection, never fabricated — and says so plainly
 * in the truncation caption rather than claiming a ranking this build cannot honestly produce.
 */
export const MAX_FANNED_OUT_ACCOUNTS = 25;

/** The immediately preceding window of the same length — never overlapping the current one — for
 *  the dashed "previous period" comparison line. */
export function previousWindow(window: { start: Date; end: Date }): { start: Date; end: Date } {
  const spanMs = window.end.getTime() - window.start.getTime();
  return { start: new Date(window.start.getTime() - spanMs), end: window.start };
}

export interface AccountUsageResponse {
  accountId: string;
  response: UsageQueryResponse;
}

/**
 * Combines one CURRENT-period, `group_by: ['model']`, day-bucketed response per account into the
 * three things the estate overview draws from a single fan-out round: the estate's own aggregate
 * spend-over-time line, one per-account day series (`MultiSeriesSpendChart`'s "Spend by account"
 * board — one line per account, summed across every model within it), and the global by-model
 * share.
 *
 * **`accountSeries` replaced `accountRows`/`RankedSeriesRow[]`** (2026-08-31, owner ruling —
 * `MultiSeriesSpendChart`'s own doc comment): the by-account board is a superposed line chart now,
 * not a ranked row list, so it needs real per-day `{x: Date, y: cost}` points per account rather
 * than a value-only sparkline. The value/delta sort toggle the row list used to offer died with
 * it — a chart's rank/colour order is always by total descending (`domain.ts`'s own `ranked`
 * sort), and "sort by change" has no expression on an unordered superposed board — so this no
 * longer computes a per-account delta at all; see `use-usage-overview-screen.ts`'s own doc
 * comment for the URL-param and hook-surface side of that cutover.
 */
export function combineAccountModelResponses(
  perAccount: readonly AccountUsageResponse[],
  labelForAccount: (accountId: string) => string
): {
  aggregateSeries: SpendSeriesSeries;
  accountSeries: MultiSeriesSpendSeries[];
  modelTotals: Map<string, number>;
} {
  const dayTotals = new Map<number, number>();
  const modelTotals = new Map<string, number>();
  const accountSeries: MultiSeriesSpendSeries[] = [];

  for (const { accountId, response } of perAccount) {
    const accountDayTotals = new Map<number, number>();
    for (const point of response.points) {
      const t = new Date(point.bucket_start).getTime();
      const cost = safeCost(point);
      dayTotals.set(t, (dayTotals.get(t) ?? 0) + cost);
      accountDayTotals.set(t, (accountDayTotals.get(t) ?? 0) + cost);
      // A null-model point is real spend, not a row to drop (2026-08-31 owner-round parity fix,
      // finding #6): folded into `UNASSIGNED_KEY` rather than skipped, so `modelTotals`'s own sum
      // agrees with `dayTotals`'s — the estate's model-mix `ShareBar` total used to read LESS than
      // the SPEND chart total for the exact same window.
      const modelKey =
        typeof point.model === 'string' && point.model.length > 0 ? point.model : UNASSIGNED_KEY;
      modelTotals.set(modelKey, (modelTotals.get(modelKey) ?? 0) + cost);
    }
    const ordered = Array.from(accountDayTotals.entries()).sort(([a], [b]) => a - b);
    accountSeries.push({
      key: accountId,
      label: labelForAccount(accountId),
      points: ordered.map(([t, y]) => ({ x: new Date(t), y })),
    });
  }

  const aggregatePoints = Array.from(dayTotals.entries())
    .sort(([a], [b]) => a - b)
    .map(([t, y]) => ({ x: new Date(t), y }));

  return {
    aggregateSeries: { key: 'estate-total', label: 'Estate total', points: aggregatePoints },
    accountSeries,
    modelTotals,
  };
}

/**
 * Rebases a series' own timestamps forward by `spanMs` — the fix behind the 2026-08-31 owner
 * finding ("the graphs are literally completely different"): a previous-period series plotted at
 * its OWN real dates extends the chart's x-domain a whole window further back
 * (`SpendSeriesChart`'s `collectTimestamps` unions every series' timestamps), squeezing the
 * current period's line into half the board instead of letting the two overlay so a viewer can
 * actually compare same-relative-day values. Shifting by the current window's own span lands the
 * previous period's points inside the CURRENT window's domain instead.
 */
export function shiftSeriesForward(series: SpendSeriesSeries, spanMs: number): SpendSeriesSeries {
  return {
    ...series,
    points: series.points.map((point) => ({ x: new Date(point.x.getTime() + spanMs), y: point.y })),
  };
}

/** The dashed previous-period comparison series — index 1 in `SpendSeriesChart`'s own `series`
 *  array is what makes it render dashed at rank-2 grey (`seriesDash`/`specSeriesColor`), so this
 *  need not carry `breached` or any styling hint of its own; ORDER is the whole contract.
 *  `spanMs` (the CURRENT window's own length) re-bases the raw previous-period timestamps forward
 *  so they OVERLAY the current window rather than doubling the chart's x-domain — see
 *  `shiftSeriesForward`'s own doc comment. */
export function toPreviousPeriodSeries(
  perAccount: readonly AccountUsageResponse[],
  spanMs: number
): SpendSeriesSeries {
  const dayTotals = new Map<number, number>();
  for (const { response } of perAccount) {
    for (const point of response.points) {
      const t = new Date(point.bucket_start).getTime();
      dayTotals.set(t, (dayTotals.get(t) ?? 0) + safeCost(point));
    }
  }
  const points = Array.from(dayTotals.entries())
    .sort(([a], [b]) => a - b)
    .map(([t, y]) => ({ x: new Date(t), y }));
  return shiftSeriesForward({ key: 'previous-period', label: 'Previous period', points }, spanMs);
}

/** Truncates a share list to its `topN` largest segments + one "Other" segment summing the rest —
 *  `ShareBar` itself has no such notion (unlike `RankedSeriesRows`), so the estate overview's own
 *  model split does this once, here, before handing segments to it. */
export function truncateShareSegments(
  segments: readonly ShareBarSegment[],
  topN: number,
  otherLabel: (count: number) => string
): ShareBarSegment[] {
  const sorted = [...segments].sort((a, b) => b.value - a.value);
  const visible = sorted.slice(0, topN);
  const overflow = sorted.slice(topN);
  if (overflow.length === 0) return visible;
  const overflowValue = overflow.reduce((sum, s) => sum + s.value, 0);
  return [
    ...visible,
    {
      key: '__other__',
      label: otherLabel(overflow.length),
      value: overflowValue,
      formattedValue: formatUsd(overflowValue),
    },
  ];
}

/** `Map<model, cost>` -> sorted `ShareBarSegment[]`, same shape `overview-usage.ts`'s
 *  `toSpendShareSegments` produces from a response directly. `UNASSIGNED_KEY` (folded in by
 *  `combineAccountModelResponses` above) gets the same friendly "Unassigned" label every other
 *  unassigned-spend rendering in this console uses, rather than the bare sentinel string. */
export function modelTotalsToSegments(modelTotals: Map<string, number>): ShareBarSegment[] {
  return Array.from(modelTotals.entries())
    .map(([key, value]) => ({
      key,
      label: key === UNASSIGNED_KEY ? 'Unassigned' : key,
      value,
      formattedValue: formatUsd(value),
    }))
    .sort((a, b) => b.value - a.value);
}
