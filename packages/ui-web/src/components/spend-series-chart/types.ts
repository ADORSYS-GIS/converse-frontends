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
  /**
   * Renders each series as a running total instead of its raw per-bucket values — the budget
   * burn-down reading. The chart does the cumulating (`domain.ts`'s `cumulateSeries`); callers
   * always pass raw per-bucket deltas, cumulative or not, so the SAME `series` shape works for
   * either mode. A cumulative series is, by construction, defined at every bucket (a running total
   * never has a genuine "gap") — only the non-cumulative reading can show the `.defined()` break.
   */
  cumulative?: boolean;
  /**
   * A reference ceiling — the budget line a cumulative burn-down is measured against. Drawn as a
   * dashed horizontal rule at `ceiling` on the y-axis; a series whose (cumulative) value reaches
   * or crosses it renders with the SAME breach accent `series[].breached` already drives
   * (`specSeriesColor`), rather than a second colour convention for this one case.
   */
  ceiling?: number;
}
