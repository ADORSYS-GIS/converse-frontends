export interface MultiSeriesSpendPoint {
  x: Date;
  y: number;
}

export interface MultiSeriesSpendSeries {
  /** Stable identity — matched against the legend's own hover/selection state. */
  key: string;
  /** Display label, already localized/resolved by the caller (a real model/project/account
   *  name — never a raw id, per the console-ui skill's "never a raw account UUID as a visible
   *  label"). */
  label: string;
  points: MultiSeriesSpendPoint[];
  /** This series has breached a configured ceiling — always renders in the accent, regardless of
   *  hover/selection, same contract as `SpendSeriesChart.series[].breached`. */
  breached?: boolean;
}

/**
 * How the shared y-axis maps raw dollar values to pixels — see `component.tsx`'s own doc comment
 * for the honesty trade-off each one makes. Every variant plots the SAME underlying `series`; only
 * the axis transform differs. Legend/tooltip totals are always the true dollar sum, independent of
 * this prop.
 */
export type MultiSeriesSpendScale = 'linear' | 'log' | 'indexed';

export interface MultiSeriesSpendChartProps {
  /** One line per series, all sharing one set of axes — never folded into an "Other" bucket; the
   *  owner's own ask was "all models... all on the same graph." */
  series: MultiSeriesSpendSeries[];
  width: number;
  height: number;
  /** `linear` (default) plots raw dollars — honest, but a dominant series flattens the rest to
   *  the baseline. `log` plots log10 of each value — every series stays visible, at the cost of
   *  equal spacing meaning equal RATIO, not equal dollars (the axis caption says so). `indexed`
   *  normalizes each series to its own period max (`y / seriesMax * 100`) — a shape comparison,
   *  never a magnitude one (the axis reads "% of series peak"). */
  scale?: MultiSeriesSpendScale;
  formatXTick?: (date: Date) => string;
  formatTooltipTitle?: (date: Date) => string;
  /** Formats a true dollar amount — the legend's totals, the tooltip's per-series rows, the
   *  zero-spend tail. Always the RAW value, independent of `scale`. Defaults to `formatUsd`. */
  formatValue?: (value: number) => string;
  /** Fires when a legend row is clicked (pinned selection) — mirrors `SpendSeriesChart`'s own
   *  `onSelectSeries` contract. */
  onSelectSeries?: (key: string | null) => void;
  /** Shown in place of the chart when `series` has no plottable points at all. */
  emptyMessage?: string;
  className?: string;
}
