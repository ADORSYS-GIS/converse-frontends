// Legend items derived from the SPEND dashboard's own fixture series — the rail legend must be
// built in the same order the chart draws, since `ChartLegend` resolves colour from that order.

import type { ChartLegendItem } from '../../components/chart-legend';
import {
  formatOverviewSpendLegendValue,
  overviewSpendSeries,
} from '../spend-dashboard/fixtures';

export const overviewSeriesLegendItems: ChartLegendItem[] = overviewSpendSeries.map((series) => ({
  key: series.key,
  label: series.label,
  value: formatOverviewSpendLegendValue(series),
  breached: series.breached,
}));
