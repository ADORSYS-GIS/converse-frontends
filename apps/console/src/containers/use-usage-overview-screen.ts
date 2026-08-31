'use client';

import { formatUsd } from '@lightbridge/ui-web';
import type {
  DashboardStatus,
  DateRangeFieldProps,
  DateRangePreset,
  OverviewStatCardData,
  RankedSeriesRow,
  ShareBarSegment,
  SpendSeriesSeries,
} from '@lightbridge/ui-web';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getUsageErrorMessage, queryUsage } from '../client/usage-client';
import { useConsoleScope } from '../client/use-console-scope';
import { OVERVIEW_RANGES, useSettingsOverviewParams } from '../client/url-state';
import { accountScopeLabel } from './account-label';
import { isUsageResponseTruncated, RANGE_DAYS, resolveOverviewWindow, toUrlDate } from './overview-usage';
import { buildLensDayRequest, lensTotals } from './settings-overview-usage';
import {
  combineAccountModelResponses,
  MAX_FANNED_OUT_ACCOUNTS,
  modelTotalsToSegments,
  perAccountTotals,
  previousWindow,
  toPreviousPeriodSeries,
  truncateShareSegments,
  withAccountDeltas,
  type AccountUsageResponse,
} from './usage-overview-usage';

/**
 * `/settings/overview/usage` — the owner's cross-account estate overview (IA v3 phase 4, build
 * brief §4), the landing lens under "Overview." See `usage-overview-usage.ts`'s own doc comment
 * for the fan-out design and the filed backend gap (`lightbridge-authz#578`) behind the account
 * cap.
 */

const RANGE_LABELS: Record<(typeof OVERVIEW_RANGES)[number], string> = {
  mtd: 'This month',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};
const RANGE_PRESETS: DateRangePreset[] = OVERVIEW_RANGES.map((value) => ({
  value,
  label: RANGE_LABELS[value],
  // 'mtd' has no fixed day count — it is a calendar-month span (`DateRangePreset.days`' own doc
  // comment, `presetRange`'s `'mtd'` branch); every other preset keeps its rolling `RANGE_DAYS` count.
  days: value === 'mtd' ? 'mtd' : RANGE_DAYS[value],
}));

const TOP_MODEL_COUNT = 5;

export interface UsageOverviewScreen {
  subtitle: string;
  rangeField: Omit<DateRangeFieldProps, 'layout'>;
  statCards: OverviewStatCardData[];
  statCardsLoading: boolean;
  spendSeries: SpendSeriesSeries[];
  spendStatus: DashboardStatus;
  accountRows: RankedSeriesRow[];
  accountRowsSortMode: 'value' | 'delta';
  setAccountRowsSortMode: (mode: 'value' | 'delta') => void;
  modelSegments: ShareBarSegment[];
  status: DashboardStatus;
  errorMessage?: string;
  onRetry: () => void;
  selectedSeriesKey: string | null;
  setSelectedSeriesKey: (key: string | null) => void;
  /** e.g. "Showing the top 25 of 61 accounts." — omitted when nothing was truncated. */
  truncationCaption: string | undefined;
  /** Set when ANY fanned-out account's own current- or previous-period response alone hit
   *  `USAGE_QUERY_LIMIT` — ORed across the whole fan-out (build brief finish-item §4), never
   *  silently understating the real total the way an un-flagged truncation would. Independent of
   *  `truncationCaption` above, which is about how many ACCOUNTS were queried, not how many POINTS
   *  came back for the ones that were. */
  spendTruncated: boolean;
}

export function useUsageOverviewScreen(): UsageOverviewScreen {
  const scope = useConsoleScope();
  const [view, setView] = useSettingsOverviewParams();

  const window = useMemo(
    () => resolveOverviewWindow(view.range, view.from, view.to, new Date()),
    [view.range, view.from, view.to]
  );
  const prevWindow = useMemo(() => previousWindow(window), [window]);

  // See `usage-overview-usage.ts`'s own doc comment (`MAX_FANNED_OUT_ACCOUNTS`) — a real
  // selection, honestly captioned, not (yet) a true prior-period-spend ranking.
  const allAccounts = scope.allAccounts;
  const included = useMemo(() => allAccounts.slice(0, MAX_FANNED_OUT_ACCOUNTS), [allAccounts]);
  const includedIds = useMemo(() => included.map((a) => a.id), [included]);

  const currentQueries = useQueries({
    queries: includedIds.map((accountId) => ({
      queryKey: ['usage-overview', 'account-model', accountId, view.range, view.from, view.to],
      queryFn: () =>
        queryUsage(buildLensDayRequest({ scope: 'account', scopeId: accountId }, window, 'model')),
      enabled: Boolean(accountId),
      staleTime: 30_000,
    })),
  });
  const previousQueries = useQueries({
    queries: includedIds.map((accountId) => ({
      queryKey: ['usage-overview', 'account-previous', accountId, view.range, view.from, view.to],
      queryFn: () => queryUsage(buildLensDayRequest({ scope: 'account', scopeId: accountId }, prevWindow)),
      enabled: Boolean(accountId),
      staleTime: 30_000,
    })),
  });

  const isPending = currentQueries.some((q) => q.isPending) || previousQueries.some((q) => q.isPending);
  const isError = currentQueries.some((q) => q.isError) || previousQueries.some((q) => q.isError);
  const status: DashboardStatus = includedIds.length === 0 ? 'ready' : isError ? 'error' : isPending ? 'loading' : 'ready';
  const errorMessage = isError
    ? getUsageErrorMessage(currentQueries.find((q) => q.isError)?.error ?? previousQueries.find((q) => q.isError)?.error)
    : undefined;

  const labelForAccount = useMemo(
    () => (accountId: string) => {
      const account = allAccounts.find((a) => a.id === accountId);
      return account ? accountScopeLabel(account) : accountId;
    },
    [allAccounts]
  );

  const currentResponses: AccountUsageResponse[] = useMemo(
    () =>
      currentQueries
        .map((q, i) => ({ accountId: includedIds[i], response: q.data }))
        .filter((r): r is AccountUsageResponse => Boolean(r.response)),
    [currentQueries, includedIds]
  );
  const previousResponses: AccountUsageResponse[] = useMemo(
    () =>
      previousQueries
        .map((q, i) => ({ accountId: includedIds[i], response: q.data }))
        .filter((r): r is AccountUsageResponse => Boolean(r.response)),
    [previousQueries, includedIds]
  );

  const combined = useMemo(
    () => combineAccountModelResponses(currentResponses, labelForAccount),
    [currentResponses, labelForAccount]
  );
  // The current window's own span — re-bases the previous-period series forward so it OVERLAYS
  // the current window instead of doubling the chart's x-domain (2026-08-31 owner finding fix #2;
  // see `toPreviousPeriodSeries`'s own doc comment).
  const spanMs = window.end.getTime() - window.start.getTime();
  const previousSeries = useMemo(
    () => toPreviousPeriodSeries(previousResponses, spanMs),
    [previousResponses, spanMs]
  );
  const accountRowsWithDelta = useMemo(
    () => withAccountDeltas(combined.accountRows, perAccountTotals(previousResponses)),
    [combined.accountRows, previousResponses]
  );

  // Estate total (solid, rank-1) first, previous period (dashed, rank-2) second — ORDER is what
  // makes `SpendSeriesChart` render the second one dashed at the second grey step
  // (`usage-overview-usage.ts`'s own doc comment on `toPreviousPeriodSeries`).
  const spendSeries = useMemo(
    () => (status === 'ready' ? [combined.aggregateSeries, previousSeries] : []),
    [status, combined.aggregateSeries, previousSeries]
  );

  const modelSegments = useMemo(
    () =>
      truncateShareSegments(
        modelTotalsToSegments(combined.modelTotals),
        TOP_MODEL_COUNT,
        (count) => `Other (${count} models)`
      ),
    [combined.modelTotals]
  );

  const statCards = useMemo<OverviewStatCardData[]>(() => {
    if (status !== 'ready') return [];
    const totals = currentResponses.reduce(
      (acc, { response }) => {
        const t = lensTotals(response);
        return { requests: acc.requests + t.requests, cost: acc.cost + t.cost };
      },
      { requests: 0, cost: 0 }
    );
    return [
      { key: 'accounts', label: 'Accounts', metric: included.length.toLocaleString() },
      { key: 'requests', label: 'Requests', metric: totals.requests.toLocaleString() },
      { key: 'cost', label: 'Cost', metric: formatUsd(totals.cost) },
    ];
  }, [status, currentResponses, included.length]);

  const truncationCaption =
    allAccounts.length > MAX_FANNED_OUT_ACCOUNTS
      ? `Showing the top ${MAX_FANNED_OUT_ACCOUNTS} of ${allAccounts.length} accounts.`
      : undefined;

  // Build brief finish-item §4: neither this screen nor the account overview's own hook used to
  // call `isUsageResponseTruncated` at all — a fanned-out account whose own response alone hit
  // `USAGE_QUERY_LIMIT` silently understated its contribution to every total above. ORed across
  // BOTH the current- and previous-period fan-outs, since either can independently truncate.
  const spendTruncated =
    currentQueries.some((q) => q.data && isUsageResponseTruncated(q.data)) ||
    previousQueries.some((q) => q.data && isUsageResponseTruncated(q.data));

  return {
    subtitle: `${RANGE_LABELS[view.range]} · UTC`,
    rangeField: {
      label: 'Range',
      presets: RANGE_PRESETS,
      preset: view.from && view.to ? null : view.range,
      value: { from: window.start, to: window.end },
      onPresetChange: (range) => {
        void setView({ range: range as (typeof OVERVIEW_RANGES)[number], from: '', to: '' });
      },
      onRangeChange: ({ from, to }) => {
        void setView({ from: toUrlDate(from), to: toUrlDate(to) });
      },
    },
    statCards,
    statCardsLoading: status === 'loading',
    spendSeries,
    spendStatus: status,
    accountRows: status === 'ready' ? accountRowsWithDelta : [],
    accountRowsSortMode: view.accountSort,
    setAccountRowsSortMode: (mode) => void setView({ accountSort: mode }),
    modelSegments: status === 'ready' ? modelSegments : [],
    status,
    errorMessage,
    onRetry: () => {
      for (const q of currentQueries) void q.refetch();
      for (const q of previousQueries) void q.refetch();
    },
    selectedSeriesKey: view.series || null,
    setSelectedSeriesKey: (series) => void setView({ series: series ?? '' }),
    truncationCaption,
    spendTruncated,
  };
}
