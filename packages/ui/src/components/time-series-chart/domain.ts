import type { TimeSeriesSeries } from './types';

/**
 * All distinct timestamps across every series, ascending. Union (not just the
 * first series') because two series can legitimately report on different
 * timestamps -- a project with no spend on a given day simply has no point
 * that day, and the x-axis still needs to include days other series did
 * report on.
 */
export function collectTimestamps(series: readonly TimeSeriesSeries[]): Date[] {
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
export function collectYDomain(series: readonly TimeSeriesSeries[]): [number, number] {
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
