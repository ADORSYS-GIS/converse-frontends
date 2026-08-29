// "Spend — share by project", derived from the *same* series data
// `spend-dashboard/fixtures.ts`'s `overviewSpendSeries` already plots as the SPEND time series --
// per-segment value is that series' own point total, not a re-invented dataset, so the share bar
// and the time series above it always agree on totals.

import { formatMoney } from '../../lib/money';
import type { ShareBarSegment } from '../../components/share-bar';
import { overviewSpendSeries } from '../spend-dashboard/fixtures';

export const overviewSpendShareSegments: ShareBarSegment[] = overviewSpendSeries.map((series) => {
  const value = series.points.reduce((sum, point) => sum + point.y, 0);
  return {
    key: series.key,
    label: series.label,
    value,
    formattedValue: formatMoney(value),
    breached: series.breached,
  };
});

export const overviewSpendShareTotal = overviewSpendShareSegments.reduce(
  (sum, segment) => sum + segment.value,
  0,
);

export function formatOverviewSpendShareTotal(): string {
  return formatMoney(overviewSpendShareTotal);
}
