import { arc as d3Arc, pie as d3Pie } from 'd3-shape';
import type { PieArcDatum } from 'd3-shape';

/**
 * Ring (donut) arc math — the DOM-free half of `packages/ui-web`'s `DonutChart`, living here for
 * the same reason every other chart primitive's geometry does (ADR 0009 Decision 5: `chart-core`
 * owns d3 math with no DOM/React in it, `ui-web` owns the `<svg>`).
 *
 * **A RING, never a filled disk.** The owner's 2026-09-02 amendment to ADR 0013 D5 reads "pie
 * charts allowed as RINGS (hollow donut), never filled disks" — so the hole is not a styling
 * choice a caller can dial to zero, it is an invariant of this module: `donutGeometry` clamps the
 * inner radius into `[MIN_INNER_RADIUS_RATIO, MAX_INNER_RADIUS_RATIO]` of the outer radius, for
 * every input, including a degenerate `width`/`height` of 0. `arcs.test.ts` asserts exactly that
 * over a sweep of sizes and thickness ratios — a disk cannot be produced through this API at all.
 *
 * Why the hole matters beyond doctrine: a filled disk invites area comparison (the thing humans
 * read worst), while a ring reduces the mark to arc LENGTH at a constant radius plus a centre
 * that can carry the total as a real numeral. The old `DonutChart` (deleted 2026-08-29 in favour
 * of `ShareBar`) had its arc math inline in the component and no such invariant; this module is
 * where the invariant is stated once and tested once.
 */

/** The thinnest ring this module will draw, as a fraction of the outer radius. Below roughly this
 *  the hole stops reading as a hole at small panel sizes and the mark drifts back toward a disk. */
export const MIN_INNER_RADIUS_RATIO = 0.35;

/** The thickest hole — past this the band is a hairline and arc length stops being legible. */
export const MAX_INNER_RADIUS_RATIO = 0.85;

/** Default hole size, as a fraction of the outer radius. Sits comfortably inside the clamp above
 *  and leaves room for a centre numeral at the panel sizes the console actually renders. */
export const DEFAULT_INNER_RADIUS_RATIO = 0.62;

/** Keeps the outer edge (and its 1px separator stroke) off the `<svg>`'s own bounding box. */
const OUTER_INSET = 4;

export interface DonutGeometry {
  /** Centre of the ring in the `<svg>`'s own coordinate space. */
  cx: number;
  cy: number;
  outerRadius: number;
  /** ALWAYS `> 0` whenever `outerRadius > 0` — see this module's doc comment. */
  innerRadius: number;
}

/**
 * The ring's centre and its two radii for a given box.
 *
 * `innerRadiusRatio` is a REQUEST, not a command: it is clamped into
 * `[MIN_INNER_RADIUS_RATIO, MAX_INNER_RADIUS_RATIO]`, and a non-finite value falls back to the
 * default — so `innerRadiusRatio: 0` (the one value that would produce a disk) draws the thinnest
 * sanctioned ring instead of silently violating the doctrine.
 */
export function donutGeometry(
  width: number,
  height: number,
  innerRadiusRatio: number = DEFAULT_INNER_RADIUS_RATIO
): DonutGeometry {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 0;
  const outerRadius = Math.max(Math.min(safeWidth, safeHeight) / 2 - OUTER_INSET, 0);

  const requested = Number.isFinite(innerRadiusRatio)
    ? innerRadiusRatio
    : DEFAULT_INNER_RADIUS_RATIO;
  const ratio = Math.min(Math.max(requested, MIN_INNER_RADIUS_RATIO), MAX_INNER_RADIUS_RATIO);

  return {
    cx: safeWidth / 2,
    cy: safeHeight / 2,
    outerRadius,
    innerRadius: outerRadius * ratio,
  };
}

/** One datum on its way into the ring. `value` is raw magnitude; negatives are clamped to 0 the
 *  same way every other part-to-whole primitive in this repo clamps them. */
export interface DonutDatum {
  key: string;
  value: number;
}

export interface DonutArc<T extends DonutDatum> {
  datum: T;
  /** Series-rank index — the slot `seriesColor`/`specSeriesColor` walks. Never re-derived from
   *  value inside the mark: order in, order out (the same rule the grey ramp follows everywhere). */
  index: number;
  /** The `<path d="…">` string for this wedge. `''` only when the geometry has no radius at all. */
  path: string;
  /** `[x, y]` relative to the ring's centre — where a pinned tooltip anchors. */
  centroid: [number, number];
  startAngle: number;
  endAngle: number;
  /** This datum's share of the plotted total, 0–100. */
  percent: number;
}

/**
 * Lays out `data` as ring wedges in ARRAY ORDER (`.sort(null)`), never re-sorted by value — the
 * caller has already decided rank, and re-sorting here would decouple a wedge's colour from the
 * rank its label/legend row was computed against.
 *
 * Returns `[]` when there is nothing plottable (no data, or every value ≤ 0), which is the signal
 * the renderer uses to draw its empty ring outline instead of a mark.
 */
export function layoutDonutArcs<T extends DonutDatum>(
  data: readonly T[],
  geometry: DonutGeometry
): DonutArc<T>[] {
  const total = data.reduce((sum, datum) => sum + Math.max(datum.value, 0), 0);
  if (data.length === 0 || total <= 0 || geometry.outerRadius <= 0) return [];

  const pieGenerator = d3Pie<T>()
    .value((datum) => Math.max(datum.value, 0))
    .sort(null);
  const arcGenerator = d3Arc<PieArcDatum<T>>()
    .innerRadius(geometry.innerRadius)
    .outerRadius(geometry.outerRadius);

  return pieGenerator([...data]).map((slice, index) => ({
    datum: slice.data,
    index,
    path: arcGenerator(slice) ?? '',
    centroid: arcGenerator.centroid(slice) as [number, number],
    startAngle: slice.startAngle,
    endAngle: slice.endAngle,
    percent: (Math.max(slice.data.value, 0) / total) * 100,
  }));
}

/**
 * Top-N + one summed "Other (N)" tail, the same collapse `RankedSeriesRows` applies to a ranked
 * list — a ring with twenty wedges is twenty indistinguishable greys, which is precisely the
 * failure that killed the first donut. Input order is preserved for the kept head; the tail is
 * folded into a single trailing datum keyed `__other__`.
 *
 * Returns the ORIGINAL array (not a copy) when nothing overflows, so a caller can cheaply tell
 * "nothing was collapsed" by identity if it wants to.
 */
export function collapseDonutTail<T extends DonutDatum>(
  data: readonly T[],
  topN: number,
  makeOther: (count: number, value: number) => T
): readonly T[] {
  if (!Number.isFinite(topN) || topN < 1 || data.length <= topN) return data;
  const head = data.slice(0, topN);
  const tail = data.slice(topN);
  const tailValue = tail.reduce((sum, datum) => sum + Math.max(datum.value, 0), 0);
  return [...head, makeOther(tail.length, tailValue)];
}
