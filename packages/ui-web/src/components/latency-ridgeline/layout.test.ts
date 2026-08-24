import { describe, expect, it } from 'vitest';

import { buildRidgelineRows, computeRowBaselines, normalizeRowCounts } from './layout';

describe('computeRowBaselines', () => {
  it('returns [] for zero or negative row counts', () => {
    expect(computeRowBaselines(0, 200)).toEqual([]);
    expect(computeRowBaselines(-1, 200)).toEqual([]);
  });

  it('a single row fills the whole plot height: baseline at the bottom, amplitude spanning the top', () => {
    const [row] = computeRowBaselines(1, 200, 0.5);
    expect(row.baselineY).toBeCloseTo(200, 6);
    expect(row.amplitude).toBeCloseTo(200, 6);
  });

  it('the last row baseline always lands flush with the plot bottom, for any row count/overlap', () => {
    for (const rowCount of [2, 3, 5, 8]) {
      for (const overlap of [0, 0.3, 0.5, 0.9]) {
        const rows = computeRowBaselines(rowCount, 300, overlap);
        expect(rows[rows.length - 1].baselineY).toBeCloseTo(300, 6);
      }
    }
  });

  it('the first row peak (baselineY - amplitude) always lands flush with the plot top, so no row is clipped', () => {
    for (const rowCount of [2, 3, 5, 8]) {
      for (const overlap of [0, 0.3, 0.5, 0.9]) {
        const rows = computeRowBaselines(rowCount, 300, overlap);
        const firstPeak = rows[0].baselineY - rows[0].amplitude;
        expect(firstPeak).toBeCloseTo(0, 6);
      }
    }
  });

  it('overlap = 0 leaves consecutive rows just touching (no overlap): baseline spacing equals amplitude', () => {
    const rows = computeRowBaselines(3, 300, 0);
    const spacing = rows[1].baselineY - rows[0].baselineY;
    expect(spacing).toBeCloseTo(rows[0].amplitude, 6);
  });

  it('a higher overlap widens each row amplitude relative to baseline spacing (more overlap, taller peaks)', () => {
    const low = computeRowBaselines(3, 300, 0.2);
    const high = computeRowBaselines(3, 300, 0.8);
    const lowSpacing = low[1].baselineY - low[0].baselineY;
    const highSpacing = high[1].baselineY - high[0].baselineY;
    expect(high[0].amplitude / highSpacing).toBeGreaterThan(low[0].amplitude / lowSpacing);
  });

  it('clamps an out-of-range overlap into [0, 1] rather than producing a nonsensical layout', () => {
    const rows = computeRowBaselines(2, 300, 5);
    const clamped = computeRowBaselines(2, 300, 1);
    expect(rows).toEqual(clamped);
  });
});

describe('normalizeRowCounts', () => {
  it('returns [] heights and peakCount 0 for an empty row', () => {
    expect(normalizeRowCounts([])).toEqual({ heights: [], peakCount: 0 });
  });

  it('an all-zero row normalizes to a flat line (every height 0), not NaN from a divide-by-zero', () => {
    const result = normalizeRowCounts([0, 0, 0, 0]);
    expect(result.peakCount).toBe(0);
    expect(result.heights.every((h) => h === 0)).toBe(true);
  });

  it("the row's own highest bin always normalizes to height 1, regardless of its absolute count", () => {
    const smallSeries = normalizeRowCounts([1, 2, 1]);
    const largeSeries = normalizeRowCounts([100, 500, 200]);
    expect(Math.max(...smallSeries.heights)).toBeCloseTo(1, 9);
    expect(Math.max(...largeSeries.heights)).toBeCloseTo(1, 9);
  });

  it('reports the true peak count alongside the normalized heights, for callers (e.g. a tooltip) that need the real number', () => {
    const result = normalizeRowCounts([3, 9, 4]);
    expect(result.peakCount).toBe(9);
  });

  it('preserves relative shape within a row (a half-height bin normalizes to 0.5)', () => {
    const result = normalizeRowCounts([5, 10]);
    expect(result.heights[0]).toBeCloseTo(0.5, 9);
    expect(result.heights[1]).toBeCloseTo(1, 9);
  });
});

describe('buildRidgelineRows', () => {
  const identity = (v: number) => v;

  it('returns [] for no rows', () => {
    expect(buildRidgelineRows([], [], [], 200, identity)).toEqual([]);
  });

  it('falls back to two flat baseline points when there is no shared domain at all (edges.length < 2)', () => {
    const rows = buildRidgelineRows([{ key: 'a', label: 'a' }], [], [[]], 200, identity, {
      fallbackDomain: [0, 1],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].points).toHaveLength(2);
    expect(rows[0].points[0].y).toBeCloseTo(rows[0].baselineY, 9);
    expect(rows[0].points[1].y).toBeCloseTo(rows[0].baselineY, 9);
    expect(rows[0].peakBin).toBeNull();
  });

  it('falls back to a flat row for a series with no bins even when other rows have real data', () => {
    const edges = [0, 10, 20, 30];
    const counts = [[1, 4, 2], []];
    const rows = buildRidgelineRows(
      [
        { key: 'a', label: 'a' },
        { key: 'b', label: 'b' },
      ],
      edges,
      counts,
      200,
      identity,
    );
    expect(rows[1].points).toHaveLength(2);
    expect(rows[1].points[0].y).toBeCloseTo(rows[1].baselineY, 9);
  });

  it('builds baseline-anchored points: first and last point sit exactly on the row baseline', () => {
    const edges = [0, 10, 20, 30];
    const counts = [[1, 4, 2]];
    const rows = buildRidgelineRows([{ key: 'a', label: 'a' }], edges, counts, 200, identity);
    const [row] = rows;
    expect(row.points[0].y).toBeCloseTo(row.baselineY, 9);
    expect(row.points[row.points.length - 1].y).toBeCloseTo(row.baselineY, 9);
    expect(row.points).toHaveLength(counts[0].length + 2);
  });

  it("a row's peak bin point rises exactly to baselineY - amplitude (fully normalized)", () => {
    const edges = [0, 10, 20, 30];
    const counts = [[1, 4, 2]];
    const rows = buildRidgelineRows([{ key: 'a', label: 'a' }], edges, counts, 200, identity);
    const [row] = rows;
    const peakPoint = row.points[2];
    expect(peakPoint.y).toBeCloseTo(row.baselineY - row.amplitude, 6);
  });

  it('reports peakBin matching the highest-count bucket, with the true (un-normalized) count', () => {
    const edges = [0, 10, 20, 30];
    const counts = [[1, 4, 2]];
    const rows = buildRidgelineRows([{ key: 'a', label: 'a' }], edges, counts, 200, identity);
    expect(rows[0].peakBin).toEqual({ x0: 10, x1: 20, count: 4 });
  });

  it('one series dwarfing another still reaches the same normalized peak height in both rows -- the point of per-row normalization', () => {
    const edges = [0, 1, 2, 3];
    const counts = [
      [1, 5, 2],
      [100, 500, 200],
    ];
    const rows = buildRidgelineRows(
      [
        { key: 'small', label: 'small' },
        { key: 'large', label: 'large' },
      ],
      edges,
      counts,
      300,
      identity,
    );
    const smallPeakY = rows[0].points[2].y;
    const smallExpected = rows[0].baselineY - rows[0].amplitude;
    const largePeakY = rows[1].points[2].y;
    const largeExpected = rows[1].baselineY - rows[1].amplitude;
    expect(smallPeakY).toBeCloseTo(smallExpected, 6);
    expect(largePeakY).toBeCloseTo(largeExpected, 6);
  });

  it('an all-zero-count row stays flat at its own baseline across every point (no spike, no NaN)', () => {
    const edges = [0, 10, 20, 30];
    const counts = [[0, 0, 0]];
    const rows = buildRidgelineRows([{ key: 'a', label: 'a' }], edges, counts, 200, identity);
    for (const point of rows[0].points) {
      expect(point.y).toBeCloseTo(rows[0].baselineY, 9);
      expect(Number.isNaN(point.y)).toBe(false);
    }
  });

  it('a single shared bin (fully-degenerate identical-value domain) does not divide by a zero-width bin or produce NaN', () => {
    const edges = [5, 5];
    const counts = [[2], [1]];
    const rows = buildRidgelineRows(
      [
        { key: 'a', label: 'a' },
        { key: 'b', label: 'b' },
      ],
      edges,
      counts,
      200,
      identity,
    );
    for (const row of rows) {
      for (const point of row.points) {
        expect(Number.isNaN(point.x)).toBe(false);
        expect(Number.isNaN(point.y)).toBe(false);
      }
    }
  });

  it('preserves fixed row order (never reorders by peak count or value)', () => {
    const edges = [0, 1, 2];
    const counts = [
      [1, 1],
      [50, 50],
    ];
    const rows = buildRidgelineRows(
      [
        { key: 'z-low-count', label: 'z' },
        { key: 'a-high-count', label: 'a' },
      ],
      edges,
      counts,
      200,
      identity,
    );
    expect(rows.map((r) => r.key)).toEqual(['z-low-count', 'a-high-count']);
  });

  it('propagates breached through to the row layout unchanged', () => {
    const rows = buildRidgelineRows(
      [{ key: 'a', label: 'a', breached: true }],
      [0, 1],
      [[1]],
      200,
      identity,
    );
    expect(rows[0].breached).toBe(true);
  });
});
