import type { HistogramBin } from '@lightbridge/chart-core';

export interface HistogramChartProps {
  /** Raw numeric samples -- e.g. per-model latency readings. Bucketed via `computeHistogramBins`. */
  values: number[];
  width: number;
  height: number;
  /** Number of buckets requested from `computeHistogramBins`. @default 10 */
  binCount?: number;
  /** Formats a bucket boundary value for the bottom axis and the tooltip title -- caller owns i18n/units, same contract as `StatCard`'s `value` prop. */
  formatXTick?: (value: number) => string;
  /** Formats a count for the left axis. */
  formatYTick?: (count: number) => string;
  /** Formats the tooltip's count row for the active bucket. Defaults to `formatYTick(bin.count)`. */
  formatTooltipValue?: (bin: HistogramBin) => string;
  /** This single series has crossed a configured ceiling -- renders every bar in the accent instead of grey (ADR-0008 Decision 6). There is no "selected" state here: a single-series histogram has nothing else to select. */
  breached?: boolean;
}
