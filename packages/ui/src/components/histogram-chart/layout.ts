import type { ScaleLinear } from 'd3-scale';

import type { ChartTick } from '../chart-axis';
import type { HistogramBin } from '../chart-core';

/**
 * Pixel-mapping layer for the histogram primitive. Kept separate from
 * `component.tsx` and independently tested -- per the repo's testing rules,
 * this is where a chart can render a smooth, plausible-looking bar chart from
 * the wrong pixel maths and look correct while being wrong. `bins.ts`'s own
 * bucket maths (`computeHistogramBins`) is already tested in
 * `chart-core/bins.test.ts` and is not re-tested here.
 */

export interface HistogramBar {
  bin: HistogramBin;
  /** Left edge in the plot's local pixel space (before the chart's own margin offset). */
  x: number;
  width: number;
}

/**
 * x-domain spanning every bin's edges. `computeHistogramBins` guarantees
 * ascending, contiguous bins, so the lowest `x0` and highest `x1` bound the
 * whole distribution. Empty input falls back to `[0, 1]` so a caller building
 * a scale from this before checking `bins.length` still gets a sane range
 * instead of a NaN-producing zero-width domain from `Math.min/max` over
 * nothing.
 */
export function computeXDomain(bins: readonly HistogramBin[]): [number, number] {
  if (bins.length === 0) {
    return [0, 1];
  }
  let lo = bins[0].x0;
  let hi = bins[0].x1;
  for (const bin of bins) {
    if (bin.x0 < lo) lo = bin.x0;
    if (bin.x1 > hi) hi = bin.x1;
  }
  return [lo, hi];
}

/**
 * y-domain (count) across every bin, always anchored at 0 -- same rule as
 * `time-series-chart/domain.ts`'s `collectYDomain`: bars grow from a zero
 * baseline. Taking the **max**, not a sum, is what keeps one bucket dwarfing
 * the rest from stretching every other bar off the top of the plot -- the
 * "one bucket dwarfs the rest" degenerate case this primitive must handle.
 */
export function computeYDomain(bins: readonly HistogramBin[]): [number, number] {
  let max = 0;
  for (const bin of bins) {
    if (bin.count > max) max = bin.count;
  }
  return [0, max];
}

/**
 * Map bins to pixel bars against `xScale`, leaving a `gap`px `CHART_SURFACE`-
 * coloured seam between adjacent bars (the dataviz skill's "surface gap, not
 * a border" bar mark rule -- touching bars need daylight between them).
 *
 * A single degenerate bin (`x0 === x1`, the all-equal-value / single-data-
 * point collapse `computeHistogramBins` performs for those inputs) has no
 * width of its own to scale -- `xScale(x0)` and `xScale(x1)` would land on
 * the exact same pixel, producing a 1px-after-clamping sliver. Instead it
 * spans the scale's own (already `widenDegenerateDomain`-widened) domain
 * end-to-end, so a single-sample or all-zero histogram still renders one
 * visible bar across the plot rather than an invisible line.
 */
export function layoutBars(
  bins: readonly HistogramBin[],
  xScale: ScaleLinear<number, number>,
  gap = 2
): HistogramBar[] {
  return bins.map((bin) => {
    let rawX0: number;
    let rawX1: number;
    if (bin.x0 === bin.x1) {
      const [domainLo, domainHi] = xScale.domain();
      rawX0 = xScale(domainLo);
      rawX1 = xScale(domainHi);
    } else {
      rawX0 = xScale(bin.x0);
      rawX1 = xScale(bin.x1);
    }
    const left = Math.min(rawX0, rawX1);
    const right = Math.max(rawX0, rawX1);
    const width = Math.max(right - left - gap, 1);
    return { bin, x: left + gap / 2, width };
  });
}

/**
 * Bottom-axis ticks at bin boundaries, thinned to roughly `maxTicks` labels
 * -- same subsampling shape as `time-series-chart/component.tsx`'s x-tick
 * step -- so a default 10-bin histogram doesn't crowd 11 overlapping edge
 * labels along the bottom axis.
 */
export function collectXTicks(
  bins: readonly HistogramBin[],
  xScale: ScaleLinear<number, number>,
  format: (value: number) => string,
  maxTicks = 6
): ChartTick[] {
  if (bins.length === 0) {
    return [];
  }
  const edges = [bins[0].x0];
  for (const bin of bins) {
    edges.push(bin.x1);
  }
  const step = Math.max(1, Math.ceil(edges.length / maxTicks));
  return edges
    .filter((_, index) => index % step === 0)
    .map((value) => ({ position: xScale(value), label: format(value) }));
}
