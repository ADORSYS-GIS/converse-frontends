import type { UsageQueryResponse } from '@lightbridge/api-rest';
import { formatUsd } from '@lightbridge/ui-web';
import type { RankedSeriesRow, ShareBarSegment, SpendSeriesSeries } from '@lightbridge/ui-web';

import { safeCost } from './overview-usage';

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
 * spend-over-time line, the by-account ranked rows, and the global by-model share.
 */
export function combineAccountModelResponses(
  perAccount: readonly AccountUsageResponse[],
  labelForAccount: (accountId: string) => string
): {
  aggregateSeries: SpendSeriesSeries;
  accountRows: RankedSeriesRow[];
  modelTotals: Map<string, number>;
} {
  const dayTotals = new Map<number, number>();
  const modelTotals = new Map<string, number>();
  const accountRows: RankedSeriesRow[] = [];

  for (const { accountId, response } of perAccount) {
    const accountDayTotals = new Map<number, number>();
    for (const point of response.points) {
      const t = new Date(point.bucket_start).getTime();
      const cost = safeCost(point);
      dayTotals.set(t, (dayTotals.get(t) ?? 0) + cost);
      accountDayTotals.set(t, (accountDayTotals.get(t) ?? 0) + cost);
      if (typeof point.model === 'string' && point.model.length > 0) {
        modelTotals.set(point.model, (modelTotals.get(point.model) ?? 0) + cost);
      }
    }
    const ordered = Array.from(accountDayTotals.entries()).sort(([a], [b]) => a - b);
    const value = ordered.reduce((sum, [, y]) => sum + y, 0);
    accountRows.push({
      key: accountId,
      label: labelForAccount(accountId),
      value,
      formattedValue: formatUsd(value),
      sparklinePoints: ordered.map(([, y]) => y),
    });
  }

  const aggregatePoints = Array.from(dayTotals.entries())
    .sort(([a], [b]) => a - b)
    .map(([t, y]) => ({ x: new Date(t), y }));

  return {
    aggregateSeries: { key: 'estate-total', label: 'Estate total', points: aggregatePoints },
    accountRows,
    modelTotals,
  };
}

/** The dashed previous-period comparison series — index 1 in `SpendSeriesChart`'s own `series`
 *  array is what makes it render dashed at rank-2 grey (`seriesDash`/`specSeriesColor`), so this
 *  need not carry `breached` or any styling hint of its own; ORDER is the whole contract. */
export function toPreviousPeriodSeries(perAccount: readonly AccountUsageResponse[]): SpendSeriesSeries {
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
  return { key: 'previous-period', label: 'Previous period', points };
}

/** Sums each account's previous-period response into one total per account id — the raw input
 *  `withAccountDeltas` below turns into each row's signed `delta`. */
export function perAccountTotals(perAccount: readonly AccountUsageResponse[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const { accountId, response } of perAccount) {
    let sum = 0;
    for (const point of response.points) sum += safeCost(point);
    totals.set(accountId, (totals.get(accountId) ?? 0) + sum);
  }
  return totals;
}

/** Attaches a signed `delta` (current − previous) to each row — a row with no previous-period
 *  data at all (a genuinely new account) gets no `delta`, never a fabricated `-$0.00` implying it
 *  was measured and came back zero. */
export function withAccountDeltas(
  rows: readonly RankedSeriesRow[],
  previousTotals: Map<string, number>
): RankedSeriesRow[] {
  return rows.map((row) => {
    const previous = previousTotals.get(row.key);
    if (previous === undefined) return row;
    const delta = row.value - previous;
    return { ...row, delta, formattedDelta: formatUsd(Math.abs(delta)) };
  });
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
 *  `toSpendShareSegments` produces from a response directly. */
export function modelTotalsToSegments(modelTotals: Map<string, number>): ShareBarSegment[] {
  return Array.from(modelTotals.entries())
    .map(([key, value]) => ({ key, label: key, value, formattedValue: formatUsd(value) }))
    .sort((a, b) => b.value - a.value);
}
