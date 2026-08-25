import type { HistogramBin } from '@lightbridge/chart-core';

/**
 * Layout maths for the ridgeline (joyplot) primitive, kept as plain,
 * independently-testable functions -- same rationale as `chart-core/bins.ts`:
 * a ridge can render a smooth, plausible-looking shape from the wrong maths
 * and look correct while being wrong (e.g. a dwarfed series silently flattened
 * to a hairline, or a divide-by-zero on a single-bin domain producing NaN).
 *
 * `computeSharedBins` (chart-core/bins.ts) already buckets every row against
 * one shared set of edges -- this module only owns what sits on top of that:
 * per-row peak normalization and the vertical stacking/overlap geometry.
 */

export interface RowBaseline {
  /** y-position (within the plot area, 0 = top) of this row's zero-count baseline. */
  baselineY: number;
  /** Max pixel rise above `baselineY` a fully-peaked bin in this row may draw. */
  amplitude: number;
}

/**
 * Stack `rowCount` rows top-to-bottom across `plotHeight`, each overlapping
 * the row above it by `overlap` (0 = rows just touch, no overlap; 1 = a row's
 * peak can reach all the way to the row two above it -- the classic ridgeline
 * look sits around 0.4-0.6).
 *
 * Closed-form derivation (see PR description for the algebra): choosing
 * `spacing = plotHeight / (rowCount + overlap)` and reserving
 * `topPad = spacing * overlap` above the first baseline makes the first row's
 * peak land exactly at `y = 0` (never clipped above the plot area) and the
 * last row's baseline land exactly at `y = plotHeight` (flush with the bottom
 * axis), for any `rowCount >= 1`.
 *
 * `rowCount <= 0` -> `[]` (caller renders its own empty state).
 */
export function computeRowBaselines(
  rowCount: number,
  plotHeight: number,
  overlap = 0.5
): RowBaseline[] {
  if (rowCount <= 0) {
    return [];
  }
  const clampedOverlap = Math.min(Math.max(overlap, 0), 1);
  const spacing = plotHeight / (rowCount + clampedOverlap);
  const topPad = spacing * clampedOverlap;
  const amplitude = spacing * (1 + clampedOverlap);
  return Array.from({ length: rowCount }, (_, i) => ({
    baselineY: topPad + spacing * (i + 1),
    amplitude,
  }));
}

export interface NormalizedRow {
  /** Per-bin height fraction in `[0, 1]`, index-aligned to the shared bin edges. */
  heights: number[];
  /** This row's own highest bin count -- the value every height in `heights` is a fraction of. */
  peakCount: number;
}

/**
 * Normalize one row's bin counts to its own peak, not a count scale shared
 * across rows.
 *
 * This is the deliberate design choice the ridgeline primitive is built
 * around: a shared count scale would flatten a low-sample-count series into
 * near-invisibility next to a high-sample-count one (the "one series dwarfing
 * the rest" craft requirement), which defeats the entire point of a
 * ridgeline -- reading each row's *shape*, not comparing raw counts across
 * rows. `peakCount` is returned alongside so callers needing the true count
 * (e.g. a tooltip) don't have to re-derive it.
 *
 * A row with no samples at all (`peakCount === 0`, e.g. `computeSharedBins`'s
 * zero-filled row for an empty/all-non-finite series) normalizes to a flat
 * line at the baseline rather than dividing by zero.
 */
export function normalizeRowCounts(counts: readonly number[]): NormalizedRow {
  const peakCount = counts.reduce((max, count) => Math.max(max, count), 0);
  if (peakCount <= 0) {
    return { heights: counts.map(() => 0), peakCount: 0 };
  }
  return { heights: counts.map((count) => count / peakCount), peakCount };
}

export interface RidgelinePoint {
  /** Pixel x-position (within the plot area) this point plots at. */
  x: number;
  /** Pixel y-position (within the plot area) this point plots at -- always `<= baselineY`. */
  y: number;
}

export interface RidgelineRowInput {
  key: string;
  label: string;
  breached?: boolean;
}

export interface RidgelineRowLayout extends RowBaseline {
  key: string;
  label: string;
  breached?: boolean;
  /** Path data points, baseline-to-baseline, ready to hand to a d3-shape area/line generator. */
  points: RidgelinePoint[];
  /** This row's own highest bin count, before normalization (see `normalizeRowCounts`). */
  peakCount: number;
  /** The bin this row's `peakCount` came from, or `null` for a row with no samples at all. */
  peakBin: HistogramBin | null;
}

/**
 * Combine `computeRowBaselines` + `normalizeRowCounts` with an x-scale into
 * one ready-to-render row per input series.
 *
 * `edges`/`counts` come straight from `computeSharedBins` -- see that
 * function's doc comment for why they must be shared across rows rather than
 * derived per-row. `toX` maps a domain value (a bin edge/midpoint) to a pixel
 * x-position; passing it in rather than a raw scale keeps this module free of
 * any d3-scale dependency, matching `chart-core/bins.ts`'s own plain-function
 * style.
 *
 * Handles `edges.length < 2` (no real domain -- every input series was empty,
 * `computeSharedBins` returns `{ edges: [], counts: [...] }`) by rendering
 * every row as a flat baseline spanning `fallbackDomain`, rather than crashing
 * on a missing bin width.
 */
export function buildRidgelineRows(
  rows: readonly RidgelineRowInput[],
  edges: readonly number[],
  counts: readonly number[][],
  plotHeight: number,
  toX: (value: number) => number,
  options?: { overlap?: number; fallbackDomain?: readonly [number, number] }
): RidgelineRowLayout[] {
  const baselines = computeRowBaselines(rows.length, plotHeight, options?.overlap);
  const fallbackDomain = options?.fallbackDomain ?? [0, 1];

  return rows.map((row, index) => {
    const { baselineY, amplitude } = baselines[index] ?? {
      baselineY: plotHeight,
      amplitude: plotHeight,
    };
    const rowCounts = counts[index] ?? [];

    if (edges.length < 2 || rowCounts.length === 0) {
      const [lo, hi] = fallbackDomain;
      return {
        key: row.key,
        label: row.label,
        breached: row.breached,
        baselineY,
        amplitude,
        points: [
          { x: toX(lo), y: baselineY },
          { x: toX(hi), y: baselineY },
        ],
        peakCount: 0,
        peakBin: null,
      };
    }

    const { heights, peakCount } = normalizeRowCounts(rowCounts);
    const points: RidgelinePoint[] = [{ x: toX(edges[0]), y: baselineY }];
    for (let i = 0; i < rowCounts.length; i += 1) {
      const midpoint = (edges[i] + edges[i + 1]) / 2;
      points.push({ x: toX(midpoint), y: baselineY - heights[i] * amplitude });
    }
    points.push({ x: toX(edges[edges.length - 1]), y: baselineY });

    const peakIndex = peakCount > 0 ? rowCounts.indexOf(peakCount) : -1;
    const peakBin: HistogramBin | null =
      peakIndex >= 0 ? { x0: edges[peakIndex], x1: edges[peakIndex + 1], count: peakCount } : null;

    return {
      key: row.key,
      label: row.label,
      breached: row.breached,
      baselineY,
      amplitude,
      points,
      peakCount,
      peakBin,
    };
  });
}
