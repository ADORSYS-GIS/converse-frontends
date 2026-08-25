export interface DonutSlice {
  key: string;
  label: string;
  /** Raw magnitude (e.g. spend in dollars) -- caller owns units, same contract as every other chart primitive here. Negative values are clamped to 0. */
  value: number;
  /** This slice has breached a configured ceiling. See `DonutChartProps.selectedKey` for how this interacts with selection under the single-accent rule. */
  breached?: boolean;
}

export interface DonutChartProps {
  /** Rendered in array order -- that order is also the series-rank order `specSeriesColor` walks, same rule as every other chart primitive here (never re-sorted by value). */
  slices: DonutSlice[];
  width: number;
  height: number;
  /**
   * Controlled selection -- omit (`undefined`) to let the chart manage its own selection state
   * internally, same dual-mode contract as `ChartLegend`. Pass `null` for "nothing selected."
   * Controlled mode is what lets a host page keep the donut in sync with a `SpendSeriesChart` /
   * `ChartLegend` pair driven from the same `selectedKey` state (`spend-share` section).
   */
  selectedKey?: string | null;
  /** Fires on a slice or legend-entry click, in addition to the chart's own internal highlight when uncontrolled. */
  onSelectSlice?: (key: string | null) => void;
  /** Mono numeral drawn at the ring's centre (e.g. a formatted total). Caller owns i18n/units. */
  centreMetric?: string;
  /** Caption under the centre numeral (e.g. `TOTAL`). Rendered uppercase, tracked, `subtle`. */
  centreLabel?: string;
  /** Formats a slice's tooltip value row, given the slice and its share of the total (0-100). */
  formatTooltipValue?: (slice: DonutSlice, percent: number) => string;
  /** Formats a slice's legend value column, given the slice and its share of the total (0-100). Omit to render the legend without a value column. */
  formatLegendValue?: (slice: DonutSlice, percent: number) => string;
  /** Shown in place of the ring's centre when `slices` has no plottable (positive) value (spec §6 empty state) -- the ring outline itself keeps rendering. */
  emptyMessage?: string;
}
