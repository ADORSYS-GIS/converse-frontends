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
  0
);

export function formatOverviewSpendShareTotal(): string {
  return formatUsd(overviewSpendShareTotal);
}

// "Spend by model" (phase 9.2, replaces the deleted LATENCY panel — the usage backend's events
// are aggregate metric signals with no per-request duration, so that panel could never fill).
// Independent fixture data rather than derived from `overviewSpendSeries` above: that dataset's
// own keys are already model ids standing in as the SPEND chart's series dimension, but "Spend by
// model" is a SEPARATE, model-grouped query over the same period (`use-overview-screen.ts`'s
// `modelSpendSegments`), not a re-slice of the project-grouped one — the fixtures stay separate
// for the same reason. `unassigned` demonstrates the same `UNASSIGNED_KEY` -> "Unassigned" path
// `overview-usage.ts`'s `labelForModel` applies for events that carried no model.
export const overviewSpendShareByModelSegments: ShareBarSegment[] = [
  { key: 'gpt-4o-mini', label: 'gpt-4o-mini', value: 812.44, formattedValue: formatUsd(812.44) },
  {
    key: 'claude-sonnet',
    label: 'claude-sonnet',
    value: 340.12,
    formattedValue: formatUsd(340.12),
  },
  {
    key: 'llama-3.1-70b',
    label: 'llama-3.1-70b',
    value: 96.5,
    formattedValue: formatUsd(96.5),
  },
  { key: 'embed-3', label: 'embed-3', value: 21.07, formattedValue: formatUsd(21.07) },
  { key: 'unassigned', label: 'Unassigned', value: 4.36, formattedValue: formatUsd(4.36) },
];

export const overviewSpendShareByModelTotal = overviewSpendShareByModelSegments.reduce(
  (sum, segment) => sum + segment.value,
  0
);
