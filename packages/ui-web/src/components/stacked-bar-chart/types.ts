import type { MultiSeriesSpendSeries } from '../multi-series-spend-chart';

/** The stacked board plots exactly what the line board does — one labelled series of dated
 *  points — so it takes the SAME series type rather than a parallel one. A panel that flips
 *  `options.style` between `lines` and `stacked-bars` must not need a second adapter. */
export type StackedBarSeries = MultiSeriesSpendSeries;

export interface StackedBarChartProps {
  series: StackedBarSeries[];
  width: number;
  height: number;
  /** Series kept before the tail folds into one summed `Other (N)` column — the same collapse
   *  `RankedSeriesRows` and `DonutChart` apply. Defaults to 6; a stack with twenty segments per
   *  bar is twenty indistinguishable slivers. */
  topN?: number;
  /** Names the collapsed tail. Defaults to `Other (N)`. */
  otherLabel?: (count: number) => string;
  formatXTick?: (date: Date) => string;
  formatTooltipTitle?: (date: Date) => string;
  /** Formats a true value — every tooltip row, the bucket total, and the summary caption.
   *  Defaults to `formatUsd`. */
  formatValue?: (value: number) => string;
  /** Formats the y-axis tick labels. Defaults to `formatUsdAxis`; a COUNT board overrides it
   *  rather than living with a fabricated `$`. */
  formatYTick?: (value: number) => string;
  /** Controlled-ish selection: clicking a segment pins its series in the accent. Mirrors
   *  `MultiSeriesSpendChart.onSelectSeries`. */
  onSelectSeries?: (key: string | null) => void;
  emptyMessage?: string;
  /** Appended to the summary caption when the caller's own fan-out capped its scope. */
  truncationCaption?: string;
  /**
   * Print/export mode — a STANDALONE `<svg>` root, no wrapper, no captions, no hit regions and no
   * Floating UI tooltip, so `renderToStaticMarkup` yields a document Typst's `image()` can embed.
   * Identical contract to `MultiSeriesSpendChartProps.static`, including that the captions it
   * drops are real content the report states in its own chrome (`stackDominanceCaption` and
   * `buildSummaryCaption` are both exported for that).
   */
  static?: boolean;
  className?: string;
}
