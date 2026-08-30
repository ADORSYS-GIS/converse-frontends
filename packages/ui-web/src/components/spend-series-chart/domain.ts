import type { SpendSeriesSeries } from './types';

/**
 * All distinct timestamps across every series, ascending. Union (not just the
 * first series') because two series can legitimately report on different
 * timestamps -- a project with no spend on a given day simply has no point
 * that day, and the x-axis still needs to include days other series did
 * report on.
 *
 * Verbatim port of packages/ui's `time-series-chart/domain.ts` --
 * pure math, no react-native-svg dependency, only the type import renamed
 * alongside the component (`TimeSeriesSeries` -> `SpendSeriesSeries`).
 */
export function collectTimestamps(series: readonly SpendSeriesSeries[]): Date[] {
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

/**
 * The y-domain across every series' points, always anchored at 0 (bars and
 * lines here plot non-negative measures -- spend, latency -- that grow from a
 * zero baseline, per the dataviz skill's bar-mark spec). Returns `[0, 0]` for
 * no data at all so the caller's degenerate-domain widening still produces a
 * sane `[0, 1]` axis instead of an empty-array crash.
 */
export function collectYDomain(series: readonly SpendSeriesSeries[]): [number, number] {
  let max = 0;
  for (const s of series) {
    for (const point of s.points) {
      if (Number.isFinite(point.y) && point.y > max) {
        max = point.y;
      }
    }
  }
  return [0, max];
}

/**
 * Runs `series` cumulatively over the full `timestamps` domain (every bucket the chart plots, not
 * just the buckets this particular series happened to report on) — the budget burn-down's own
 * shape: a running total that carries forward across a day with no spend, rather than a value that
 * only exists on the days it changed.
 *
 * This is the opposite of `withGapSentinels`' honesty: a raw per-bucket series should show a GAP on
 * a day with no data (that day genuinely had no spend), but a CUMULATIVE total on that same day is
 * still a real, known figure — the running sum simply did not move. Forward-filling here is what
 * makes the burn-down line continuous while the raw spend line above it (same data, `cumulative`
 * unset) still breaks on the same absent days.
 */
export function cumulateSeries(
  series: readonly SpendSeriesSeries[],
  timestamps: readonly Date[]
): SpendSeriesSeries[] {
  return series.map((s) => {
    const deltaByTime = new Map(s.points.map((p) => [p.x.getTime(), p.y]));
    let running = 0;
    const points = timestamps.map((t) => {
      const delta = deltaByTime.get(t.getTime());
      if (delta !== undefined && Number.isFinite(delta)) running += delta;
      return { x: t, y: running };
    });
    return { ...s, points };
  });
}

/**
 * Maps one series' points onto the FULL `timestamps` domain, `NaN` standing in for a bucket this
 * series has no point for — the gap-breaking fix (build brief §2a): a point is "defined" iff its
 * own bucket has data, so d3's `.defined()` predicate (wired in `component.tsx`) can break the
 * line/area there instead of drawing a straight segment across days the series never reported on.
 *
 * Deliberately generic over whichever series is handed in — called on the RAW series for the
 * default (non-cumulative) plot, and again (as a no-op, since `cumulateSeries` above already
 * produces one point per timestamp) for the cumulative burn-down, so both variants share one code
 * path instead of two gap-handling implementations that could drift.
 */
export function withGapSentinels(
  s: SpendSeriesSeries,
  timestamps: readonly Date[]
): { x: Date; y: number }[] {
  const byTime = new Map(s.points.map((p) => [p.x.getTime(), p.y]));
  return timestamps.map((t) => {
    const y = byTime.get(t.getTime());
    return { x: t, y: y !== undefined && Number.isFinite(y) ? y : Number.NaN };
  });
}
