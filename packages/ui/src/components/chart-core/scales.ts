import { scaleBand, scaleLinear, scaleTime } from 'd3-scale';
import type { ScaleBand, ScaleLinear, ScaleTime } from 'd3-scale';

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** A margin that leaves room for a left value axis and a bottom category/time axis. */
export const DEFAULT_CHART_MARGIN: ChartMargin = { top: 12, right: 12, bottom: 28, left: 44 };

export function innerWidth(width: number, margin: ChartMargin = DEFAULT_CHART_MARGIN): number {
  return Math.max(width - margin.left - margin.right, 0);
}

export function innerHeight(height: number, margin: ChartMargin = DEFAULT_CHART_MARGIN): number {
  return Math.max(height - margin.top - margin.bottom, 0);
}

/**
 * Widen a degenerate `[x, x]` domain to a small range around `x` so a linear
 * scale never collapses every value to the same pixel. This is what keeps a
 * single-data-point chart and an all-zero-value chart from rendering an
 * invisible or divide-by-zero shape -- both are real states the usage query API
 * produces (a brand-new project with one spend event; a model nobody has
 * called yet).
 */
export function widenDegenerateDomain([lo, hi]: readonly [number, number]): [number, number] {
  if (lo !== hi) {
    return [lo, hi];
  }
  if (lo === 0) {
    return [0, 1];
  }
  const pad = Math.abs(lo) * 0.1 || 1;
  return [lo - pad, lo + pad];
}

export function makeLinearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
  options?: { nice?: boolean }
): ScaleLinear<number, number> {
  const scale = scaleLinear()
    .domain(widenDegenerateDomain(domain))
    .range(range as [number, number]);
  return options?.nice === false ? scale : scale.nice();
}

export function makeBandScale(
  domainValues: readonly string[],
  range: readonly [number, number],
  options?: { paddingInner?: number; paddingOuter?: number }
): ScaleBand<string> {
  return scaleBand<string>()
    .domain(domainValues)
    .range(range as [number, number])
    .paddingInner(options?.paddingInner ?? 0.3)
    .paddingOuter(options?.paddingOuter ?? 0.15);
}

export function makeTimeScale(
  domain: readonly [Date, Date],
  range: readonly [number, number]
): ScaleTime<number, number> {
  return scaleTime()
    .domain(domain as [Date, Date])
    .range(range as [number, number]);
}
