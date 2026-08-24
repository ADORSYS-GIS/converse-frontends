export interface SpendSeriesPoint {
  x: Date;
  y: number;
}

export interface SpendSeriesSeries {
  key: string;
  label: string;
  points: SpendSeriesPoint[];
  /** This series has breached a configured ceiling -- always renders in the accent, selected or not. */
  breached?: boolean;
}

export interface SpendSeriesChartProps {
  series: SpendSeriesSeries[];
  width: number;
  height: number;
  /** `line` (default) draws overlaid lines with a wash under the selected series; `bars` draws grouped columns per timestamp. */
  variant?: 'line' | 'bars';
  formatXTick?: (date: Date) => string;
  formatYTick?: (value: number) => string;
  formatTooltipValue?: (value: number) => string;
  formatTooltipTitle?: (date: Date) => string;
  /** Formats the legend's per-series value (e.g. `$61.20`). Omit to render the legend without a value column. */
  formatLegendValue?: (series: SpendSeriesSeries) => string;
  /** Fires when a legend item is selected, in addition to the chart's own selection highlight. */
  onSelectSeries?: (key: string | null) => void;
  /** Shown on the baseline in place of the chart when `series` has no plottable points (spec §6 empty state). */
  emptyMessage?: string;
}
