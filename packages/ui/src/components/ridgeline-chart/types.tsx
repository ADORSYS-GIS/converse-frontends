import type { HistogramBin } from '@lightbridge/chart-core';

export interface RidgelineSeries {
  /** Stable identity, e.g. a model id -- matched against selection/tooltip state. */
  key: string;
  /** Display label, already localized/formatted by the caller. Rendered directly beside the row (ADR-0008: ridgelines read on shape, not hue). */
  label: string;
  /** Raw numeric samples for this row, e.g. per-request latency in ms. Not pre-bucketed -- the chart buckets via `computeSharedBins`. */
  values: number[];
  /** This row has breached a configured ceiling -- renders in the accent, selected or not. */
  breached?: boolean;
}

export interface RidgelineChartProps {
  /** Rows in the order they should stack top-to-bottom -- fixed order, never re-sorted by value (same rule as the monochrome ramp itself). */
  series: RidgelineSeries[];
  width: number;
  height: number;
  /** Shared bin count across every row (via `computeSharedBins`). Default 20 -- a ridgeline wants a smoother curve than a coarse bar histogram. */
  binCount?: number;
  formatXTick?: (value: number) => string;
  /** Formats the peak-bucket tooltip value for a tapped row. Receives the row's own highest-count bucket. */
  formatTooltipValue?: (bin: HistogramBin) => string;
  /** Fires when a row is tapped, in addition to the chart's own selection highlight (accent fill/stroke). */
  onSelectSeries?: (key: string | null) => void;
}
