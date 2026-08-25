// SPEND — SHARE BY PROJECT's donut, derived from the *same* series data
// `spend-dashboard/fixtures.ts`'s `overviewSpendSeries` already plots as the SPEND time series --
// per-slice value is that series' own point total, not a re-invented dataset, so the donut and
// the time series above it always agree on totals.

import { formatMoney } from '../../lib/money';
import type { DonutSlice } from '../../components/donut-chart';
import { overviewSpendSeries } from '../spend-dashboard/fixtures';

export const overviewSpendShareSlices: DonutSlice[] = overviewSpendSeries.map((series) => ({
  key: series.key,
  label: series.label,
  value: series.points.reduce((sum, point) => sum + point.y, 0),
  breached: series.breached,
}));

export const overviewSpendShareTotal = overviewSpendShareSlices.reduce(
  (sum, slice) => sum + slice.value,
  0
);

export function formatOverviewSpendShareCentre(): string {
  return formatMoney(overviewSpendShareTotal);
}

export function formatOverviewSpendShareValue(slice: DonutSlice, percent: number): string {
  return `${formatMoney(slice.value)} · ${percent.toFixed(0)}%`;
}
