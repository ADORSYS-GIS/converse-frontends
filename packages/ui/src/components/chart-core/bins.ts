import { bin as d3Bin, extent } from 'd3-array';

/**
 * Bucket maths shared by the histogram and ridgeline primitives. Kept as plain,
 * independently-testable functions -- per the repo's testing rules, this is
 * "where silent wrongness lives": a chart can render a perfectly smooth bar or
 * ridge from the wrong bucket boundaries and look correct while being wrong.
 */

export interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
}

/**
 * Bucket a single series of raw values into `binCount` histogram bins.
 *
 * Degenerate inputs are handled explicitly rather than trusted to d3's default
 * behaviour, which isn't documented for a point domain and shouldn't be relied
 * on implicitly:
 * - empty input -> `[]` (caller renders the chart's empty state, not a broken shape).
 * - a single distinct value (including every value being the same, e.g. all-zero)
 *   -> one bin spanning that value, count = however many samples landed on it,
 *   with `x0`/`x1` guaranteed rather than left to whatever `d3-bin` happens to
 *   compute for a zero-width domain.
 * - non-finite values (`NaN`/`Infinity`) are dropped, not counted.
 */
export function computeHistogramBins(values: readonly number[], binCount = 10): HistogramBin[] {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return [];
  }

  const domain = extent(finite) as [number, number];
  const [lo, hi] = domain;
  if (lo === hi) {
    return [{ x0: lo, x1: hi, count: finite.length }];
  }

  const thresholds = d3Bin<number, number>()
    .domain(domain)
    .thresholds(Math.max(1, Math.floor(binCount)));
  return thresholds(finite).map((thresholdBin) => ({
    x0: thresholdBin.x0 ?? lo,
    x1: thresholdBin.x1 ?? hi,
    count: thresholdBin.length,
  }));
}

export interface SharedBins {
  /** Bin edges shared by every series, ascending, length = `counts[i].length + 1`. */
  edges: number[];
  /** Per-series counts, index-aligned to `edges` (`counts[i][j]` covers `[edges[j], edges[j+1])`). */
  counts: number[][];
}

/**
 * Bucket several series (e.g. per-model latency samples) against one shared set
 * of bin edges, derived from the combined domain across all of them.
 *
 * This is the ridgeline primitive's load-bearing correctness property: binning
 * each series independently would give two models with different ranges
 * different x-axes, so overlaying them would silently misrepresent where their
 * distributions actually overlap. Sharing edges is what makes the overlay mean
 * anything.
 *
 * Handles the same degenerate cases as `computeHistogramBins`, plus:
 * - an empty `seriesValues` array -> `{ edges: [], counts: [] }`.
 * - individual empty/all-non-finite series -> that series' `counts` is all
 *   zeros against the shared edges (not omitted -- callers still get one row
 *   per input series so a ridgeline with one silent model still lays out).
 */
export function computeSharedBins(
  seriesValues: readonly (readonly number[])[],
  binCount = 10
): SharedBins {
  if (seriesValues.length === 0) {
    return { edges: [], counts: [] };
  }

  const allFinite = seriesValues.flatMap((values) =>
    values.filter((value) => Number.isFinite(value))
  );
  if (allFinite.length === 0) {
    return { edges: [], counts: seriesValues.map(() => []) };
  }

  const domain = extent(allFinite) as [number, number];
  const [lo, hi] = domain;
  if (lo === hi) {
    const edges = [lo, hi];
    const counts = seriesValues.map((values) => [
      values.filter((value) => Number.isFinite(value)).length,
    ]);
    return { edges, counts };
  }

  const thresholds = d3Bin<number, number>()
    .domain(domain)
    .thresholds(Math.max(1, Math.floor(binCount)));
  const combined = thresholds(allFinite);
  const edges = deriveEdges(combined, lo, hi);
  const counts = seriesValues.map((values) => countIntoEdges(values, edges));
  return { edges, counts };
}

function deriveEdges(
  bins: readonly { x0?: number; x1?: number }[],
  lo: number,
  hi: number
): number[] {
  if (bins.length === 0) {
    return [lo, hi];
  }
  const edges = [bins[0]?.x0 ?? lo];
  for (const thresholdBin of bins) {
    edges.push(thresholdBin.x1 ?? edges[edges.length - 1]);
  }
  return edges;
}

/** Count `values` into pre-derived bin `edges` (last bin is closed on both ends, matching d3's own bin()). */
function countIntoEdges(values: readonly number[], edges: readonly number[]): number[] {
  const bucketCount = Math.max(edges.length - 1, 0);
  const counts = new Array<number>(bucketCount).fill(0);
  if (bucketCount === 0) {
    return counts;
  }
  const lo = edges[0];
  const hi = edges[edges.length - 1];
  for (const raw of values) {
    if (!Number.isFinite(raw) || raw < lo || raw > hi) {
      continue;
    }
    let index = bucketCount - 1;
    for (let i = 0; i < bucketCount; i += 1) {
      if (raw >= edges[i] && raw < edges[i + 1]) {
        index = i;
        break;
      }
    }
    counts[index] += 1;
  }
  return counts;
}
