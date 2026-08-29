// "Spend — share by project", derived from the same series data `spend-dashboard/fixtures.ts`'s
// `overviewSpendSeries` plots as the SPEND time series — so the share bar and the chart above it
// always agree on totals.

import { formatUsd } from '../../lib/money';
import type { ShareBarSegment } from '../../components/share-bar';
import { overviewSpendSeries } from '../spend-dashboard/fixtures';

export const overviewSpendShareSegments: ShareBarSegment[] = overviewSpendSeries.map((series) => {
  const value = series.points.reduce((sum, point) => sum + point.y, 0);
  return {
    key: series.key,
    label: series.label,
    value,
    formattedValue: formatUsd(value),
    breached: series.breached,
  };
});

export const overviewSpendShareTotal = overviewSpendShareSegments.reduce(
  (sum, segment) => sum + segment.value,
  0,
);

export function formatOverviewSpendShareTotal(): string {
  return formatUsd(overviewSpendShareTotal);
}
