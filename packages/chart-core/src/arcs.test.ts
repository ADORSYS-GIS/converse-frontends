import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INNER_RADIUS_RATIO,
  MAX_INNER_RADIUS_RATIO,
  MIN_INNER_RADIUS_RATIO,
  collapseDonutTail,
  donutGeometry,
  layoutDonutArcs,
} from './arcs';

const slices = [
  { key: 'gpt-4o', value: 60 },
  { key: 'claude', value: 30 },
  { key: 'mistral', value: 10 },
];

describe('donutGeometry', () => {
  it('centres the ring in its box', () => {
    const geometry = donutGeometry(240, 200);
    expect(geometry.cx).toBe(120);
    expect(geometry.cy).toBe(100);
  });

  it('sizes the outer radius off the SHORTER side, inset so the stroke never clips', () => {
    expect(donutGeometry(240, 200).outerRadius).toBe(96);
    expect(donutGeometry(200, 240).outerRadius).toBe(96);
  });

  /**
   * The doctrine invariant (owner ruling 2026-09-02, "rings allowed, filled disks never"):
   * whatever a caller asks for, a positive outer radius always comes back with a positive inner
   * radius. A sweep rather than one case, because the one thing that must never be reachable is
   * an input that degenerates the ring into a disk.
   */
  it.each([
    -100,
    -1,
    0,
    0.0001,
    0.1,
    MIN_INNER_RADIUS_RATIO,
    0.5,
    DEFAULT_INNER_RADIUS_RATIO,
    MAX_INNER_RADIUS_RATIO,
    0.99,
    1,
    5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('never degenerates into a filled disk for innerRadiusRatio=%s', (ratio) => {
    for (const [width, height] of [
      [1, 1],
      [40, 40],
      [120, 90],
      [320, 320],
      [1280, 400],
    ]) {
      const geometry = donutGeometry(width, height, ratio);
      if (geometry.outerRadius <= 0) continue;
      expect(geometry.innerRadius).toBeGreaterThan(0);
      // Float epsilon, not slack in the contract: `outer * ratio / outer` does not round-trip
      // exactly (0.85 comes back as 0.8500000000000001).
      const EPSILON = 1e-9;
      expect(geometry.innerRadius / geometry.outerRadius).toBeGreaterThanOrEqual(
        MIN_INNER_RADIUS_RATIO - EPSILON
      );
      expect(geometry.innerRadius / geometry.outerRadius).toBeLessThanOrEqual(
        MAX_INNER_RADIUS_RATIO + EPSILON
      );
      expect(geometry.innerRadius).toBeLessThan(geometry.outerRadius);
    }
  });

  it('clamps a degenerate box to a zero radius rather than a negative one', () => {
    const geometry = donutGeometry(0, 0);
    expect(geometry.outerRadius).toBe(0);
    expect(geometry.innerRadius).toBe(0);
  });
});

describe('layoutDonutArcs', () => {
  it('lays out one wedge per datum, in array order, with real path data', () => {
    const arcs = layoutDonutArcs(slices, donutGeometry(240, 240));
    expect(arcs.map((a) => a.datum.key)).toEqual(['gpt-4o', 'claude', 'mistral']);
    expect(arcs.map((a) => a.index)).toEqual([0, 1, 2]);
    for (const a of arcs) expect(a.path.startsWith('M')).toBe(true);
  });

  /** A ring's path has an inner boundary; a disk's does not. This is the geometric assertion that
   *  the hole survives all the way into the emitted `d` attribute, not only into the radii. */
  it('emits a path with an inner boundary — the hole is in the mark, not just the geometry', () => {
    const geometry = donutGeometry(240, 240);
    const [first] = layoutDonutArcs(slices, geometry);
    // d3's arc path for a non-zero inner radius carries two arc commands (outer then inner) and
    // closes; a zero inner radius produces a wedge that returns to the centre with an `L` instead.
    expect(first.path.match(/A/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('shares out percentages over the plotted total, clamping negatives to zero', () => {
    const arcs = layoutDonutArcs(
      [...slices, { key: 'refund', value: -5 }],
      donutGeometry(200, 200)
    );
    expect(arcs.map((a) => Math.round(a.percent))).toEqual([60, 30, 10, 0]);
  });

  it('plots nothing when there is nothing plottable', () => {
    expect(layoutDonutArcs([], donutGeometry(200, 200))).toEqual([]);
    expect(layoutDonutArcs([{ key: 'a', value: 0 }], donutGeometry(200, 200))).toEqual([]);
    expect(layoutDonutArcs(slices, donutGeometry(0, 0))).toEqual([]);
  });

  it('gives every wedge a centroid inside the band, for a pinned tooltip to anchor at', () => {
    const geometry = donutGeometry(240, 240);
    for (const a of layoutDonutArcs(slices, geometry)) {
      const distance = Math.hypot(a.centroid[0], a.centroid[1]);
      expect(distance).toBeGreaterThanOrEqual(geometry.innerRadius - 0.001);
      expect(distance).toBeLessThanOrEqual(geometry.outerRadius + 0.001);
    }
  });
});

describe('collapseDonutTail', () => {
  const makeOther = (count: number, value: number) => ({ key: '__other__', value, count });

  it('leaves a short list untouched, by identity', () => {
    expect(collapseDonutTail(slices, 5, makeOther)).toBe(slices);
    expect(collapseDonutTail(slices, 3, makeOther)).toBe(slices);
  });

  it('folds everything past topN into one summed Other datum', () => {
    const collapsed = collapseDonutTail(slices, 2, makeOther);
    expect(collapsed).toHaveLength(3);
    expect(collapsed[2]).toMatchObject({ key: '__other__', value: 10, count: 1 });
  });

  it('refuses a nonsensical topN rather than collapsing everything into Other', () => {
    expect(collapseDonutTail(slices, 0, makeOther)).toBe(slices);
    expect(collapseDonutTail(slices, Number.NaN, makeOther)).toBe(slices);
  });
});
