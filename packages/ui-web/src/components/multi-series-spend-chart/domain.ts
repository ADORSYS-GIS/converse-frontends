import type {
  MultiSeriesSpendPoint,
  MultiSeriesSpendScale,
  MultiSeriesSpendSeries,
} from './types';

/**
 * All distinct timestamps across every series, ascending — union, not just the first series' own
 * (a series with no spend on a given day simply has no point that day, and the x-axis still needs
 * to include days another series DID report on). Verbatim in spirit with
 * `spend-series-chart/domain.ts`'s own `collectTimestamps`, kept as a private copy here rather
 * than a shared import — this component is a distinct design-review artifact (build brief: "a NEW
 * component", not a variant of the existing one) and the two are free to diverge.
 */
export function collectTimestamps(series: readonly MultiSeriesSpendSeries[]): Date[] {
  const seen = new Map<number, Date>();
  for (const s of series) {
    for (const point of s.points) {
      const time = point.x.getTime();
      if (Number.isFinite(time) && !seen.has(time)) {
        seen.set(time, point.x);
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.getTime() - b.getTime());
}

export interface TransformedPoint {
  x: Date;
  /** `NaN` marks a gap — either the bucket has no real data (see `withGapSentinels`'s reasoning
   *  in the sibling chart), or the scale genuinely cannot place the value (a log axis cannot plot
   *  a real, reported $0 day). Both cases break the line rather than draw across it — a log gap is
   *  still an honest gap, just for a different reason than a missing bucket. */
  y: number;
}

export interface TransformedSeries {
  key: string;
  label: string;
  breached?: boolean;
  /** The true dollar sum across every bucket this series reported — independent of `scale`,
   *  the one figure the legend/tooltip always state regardless of how the lines are plotted. */
  total: number;
  points: TransformedPoint[];
}

/**
 * Maps every series onto the FULL `timestamps` domain and applies the scale's own value
 * transform, in one pass — the honesty boundary of this component: `total` (and everything
 * downstream that reads it — legend value/share, tooltip rows, the zero-spend tail) is always
 * computed from the RAW points, never from `y` after this function has touched it, so switching
 * `scale` can never quietly change what the legend or tooltip assert.
 */
export function transformSeries(
  series: readonly MultiSeriesSpendSeries[],
  timestamps: readonly Date[],
  scale: MultiSeriesSpendScale
): TransformedSeries[] {
  return series.map((s) => {
    const byTime = new Map<number, number>(s.points.map((p) => [p.x.getTime(), p.y]));
    const total = s.points.reduce(
      (sum, p) => (Number.isFinite(p.y) ? sum + p.y : sum),
      0
    );
    // `indexed` needs each series' OWN peak, never a domain shared across series — the same rule
    // `RankedSeriesRow.sparklinePoints` documents: a dominant series must not flatten a smaller
    // one's shape.
    const seriesMax = s.points.reduce(
      (max, p) => (Number.isFinite(p.y) && p.y > max ? p.y : max),
      0
    );
    const points: TransformedPoint[] = timestamps.map((t): TransformedPoint => {
      const raw = byTime.get(t.getTime());
      if (raw === undefined || !Number.isFinite(raw)) {
        return { x: t, y: Number.NaN };
      }
      if (scale === 'log') {
        // A reported $0 (or, defensively, a negative figure) has no position on a log axis —
        // treated as a gap for PLOTTING purposes only; `total` above already captured it honestly.
        return { x: t, y: raw > 0 ? raw : Number.NaN };
      }
      if (scale === 'indexed') {
        return { x: t, y: seriesMax > 0 ? (raw / seriesMax) * 100 : Number.NaN };
      }
      return { x: t, y: raw };
    });
    return { key: s.key, label: s.label, breached: s.breached, total, points };
  });
}

/** Widens a degenerate `[x, x]` linear domain, same reasoning as `chart-core`'s own
 *  `widenDegenerateDomain` — kept local since the log branch below needs a decade-aware version
 *  that constant can't express. */
function widenLinear([lo, hi]: readonly [number, number]): [number, number] {
  if (lo !== hi) return [lo, hi];
  return lo === 0 ? [0, 1] : [0, hi * 1.1];
}

/**
 * The y-domain for the given scale. `linear` is a plain `[0, max]` (spend never plots below zero);
 * `indexed` is always the fixed `[0, 100]` a "% of series peak" axis is defined over; `log` finds
 * the smallest and largest POSITIVE plotted value and rounds the domain out to whole decades, so
 * the axis' gridlines land on clean powers of ten ($0.0001, $0.001, …) instead of an arbitrary
 * fraction of one.
 */
export function computeYDomain(
  transformed: readonly TransformedSeries[],
  scale: MultiSeriesSpendScale
): [number, number] {
  if (scale === 'indexed') {
    return [0, 100];
  }
  if (scale === 'log') {
    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    for (const s of transformed) {
      for (const p of s.points) {
        if (Number.isFinite(p.y) && p.y > 0) {
          if (p.y < min) min = p.y;
          if (p.y > max) max = p.y;
        }
      }
    }
    // Nothing positive to plot at all (every series genuinely spent $0 in range) — a log axis
    // cannot honestly express that shape; fall back to a narrow decade so the frame still renders.
    if (min === Number.POSITIVE_INFINITY) {
      return [0.01, 1];
    }
    const lo = 10 ** Math.floor(Math.log10(min));
    const hi = 10 ** Math.ceil(Math.log10(max));
    return lo === hi ? [lo / 10, hi * 10] : [lo, hi];
  }
  let max = 0;
  for (const s of transformed) {
    for (const p of s.points) {
      if (Number.isFinite(p.y) && p.y > max) max = p.y;
    }
  }
  return widenLinear([0, max]);
}

/** Clean power-of-ten gridlines spanning a decade-rounded log domain (`computeYDomain`'s own
 *  output) — `$0.0001, $0.001, $0.01, …` rather than d3's own log-tick heuristic, which can land
 *  off-decade for a domain this wide (four-plus orders of magnitude, the real fixture's own
 *  shape). Capped so a pathological domain can never emit an unbounded tick list. */
export function logAxisTicks(domain: readonly [number, number]): number[] {
  const [lo, hi] = domain;
  const ticks: number[] = [];
  let v = lo;
  let guard = 0;
  while (v <= hi * 1.0000001 && guard < 20) {
    ticks.push(v);
    v *= 10;
    guard += 1;
  }
  return ticks;
}

/** The honest share of a total against the grand total across every series — the tooltip's
 *  percent figure, always computed off raw dollars regardless of `scale`. */
export function shareOfTotal(total: number, grandTotal: number): number {
  if (grandTotal <= 0) return 0;
  return (Math.max(total, 0) / grandTotal) * 100;
}

/**
 * The board's own single caption sentence — everything the deleted legend list used to state as
 * permanent rows, folded into one line under the chart (the owner's ruling killed the list, not
 * the information): the period total across every series, the zero-spend tail's count when any
 * series collapsed into it, and an optional truncation notice from a caller whose own fan-out
 * capped its scope (`MultiSeriesSpendChartProps.truncationCaption`). A caption is a sentence, not
 * rows, so the three clauses join with a middle dot rather than rendering as separate lines.
 */
export function buildSummaryCaption(
  grandTotal: number,
  totalSeriesCount: number,
  noSpendCount: number,
  formatValue: (value: number) => string,
  truncationCaption?: string
): string {
  const parts = [`${formatValue(grandTotal)} across ${totalSeriesCount} series`];
  if (noSpendCount > 0) {
    parts.push(`${noSpendCount} more · no spend this period`);
  }
  if (truncationCaption) {
    parts.push(truncationCaption);
  }
  return parts.join(' · ');
}

export type { MultiSeriesSpendPoint };
