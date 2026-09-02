export interface DonutSegment {
  /** Stable identity — matched against `selectedKey`, and against the same series key a sibling
   *  ranked list or chart uses for the same datum. */
  key: string;
  /** Display label, already resolved by the caller (never a raw id — console-ui skill). */
  label: string;
  /** Raw magnitude. Negatives are clamped to 0, same as every other part-to-whole mark here. */
  value: number;
  /** Pre-formatted value shown in the hover tooltip. Caller owns i18n/units. */
  formattedValue?: string;
  /** This segment breached a configured ceiling — renders in the accent, selected or not. */
  breached?: boolean;
}

export interface DonutChartProps {
  /** Rendered in ARRAY ORDER — that order is the series-rank order the grey ramp walks; the ring
   *  never re-sorts by value (same rule as every other chart primitive here). */
  segments: DonutSegment[];
  width: number;
  height: number;
  /**
   * Ranks `1..topN` get their own wedge; everything past that is folded into one summed
   * `Other (N)` wedge — the identical collapse `RankedSeriesRows` applies to a ranked list, and
   * the reason the first donut failed (twenty indistinguishable greys) cannot recur. Defaults
   * to 6.
   */
  topN?: number;
  /** Formats the collapsed wedge's label from the number of segments it folds in. Defaults to a
   *  bare `Other (N)`. */
  otherLabel?: (count: number) => string;
  /** Controlled selection — drives the single accent wedge, same contract as `ShareBar`. */
  selectedKey?: string | null;
  /** Omit for a read-only ring. The collapsed `Other` wedge is never selectable. */
  onSelectSegment?: (key: string | null) => void;
  /** Mono numeral drawn in the hole (typically the formatted total). The hole is what makes this
   *  legible at all — a filled disk has nowhere to put it. */
  centreMetric?: string;
  /** Caption under the centre numeral, e.g. `TOTAL`. */
  centreLabel?: string;
  /** Formats a segment's tooltip value when it carries no `formattedValue` of its own. Receives
   *  the segment and its share of the plotted total (0–100). */
  formatTooltipValue?: (segment: DonutSegment, percent: number) => string;
  /** Shown in the hole when nothing is plottable — the ring outline itself keeps rendering, so
   *  the zone never collapses (console-ui skill "States"). */
  emptyMessage?: string;
  /** Fraction of the outer radius the hole occupies. Clamped by `chart-core`'s `donutGeometry`
   *  into the sanctioned band — a caller CANNOT produce a filled disk through this prop. */
  innerRadiusRatio?: number;
  className?: string;
}
