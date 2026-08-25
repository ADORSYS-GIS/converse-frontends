import { describe, expect, it } from 'vitest';

import { computeHistogramBins, makeLinearScale } from '@lightbridge/chart-core';

import { collectXTicks, computeXDomain, computeYDomain, layoutBars } from './layout';

describe('computeXDomain', () => {
  it('returns [0, 1] for no bins, so a scale built from it before checking length is still sane', () => {
    expect(computeXDomain([])).toEqual([0, 1]);
  });

  it('spans the lowest x0 to the highest x1 across every bin', () => {
    const bins = computeHistogramBins([0, 5, 10, 15, 20], 4);
    const [lo, hi] = computeXDomain(bins);
    expect(lo).toBe(bins[0].x0);
    expect(hi).toBe(bins[bins.length - 1].x1);
  });
});

describe('computeYDomain', () => {
  it('returns [0, 0] for no bins', () => {
    expect(computeYDomain([])).toEqual([0, 0]);
  });

  it('takes the max single-bin count, not the sum across bins -- one dwarfing bucket must not stretch the domain to the total sample size', () => {
    const bins = [
      { x0: 0, x1: 1, count: 2 },
      { x0: 1, x1: 2, count: 100 },
      { x0: 2, x1: 3, count: 3 },
    ];
    expect(computeYDomain(bins)).toEqual([0, 100]);
  });
});

describe('layoutBars', () => {
  it('leaves exactly a gap-px seam between adjacent bars, never touching', () => {
    const bins = computeHistogramBins([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    const scale = makeLinearScale(computeXDomain(bins), [0, 100], { nice: false });
    const gap = 4;
    const bars = layoutBars(bins, scale, gap);
    for (let i = 1; i < bars.length; i += 1) {
      const prevRight = bars[i - 1].x + bars[i - 1].width;
      const actualGap = bars[i].x - prevRight;
      expect(actualGap).toBeCloseTo(gap, 5);
    }
  });

  it('every bar has a positive width and none overlap, for a normal contiguous spread', () => {
    const bins = computeHistogramBins(
      Array.from({ length: 50 }, (_, i) => i),
      6,
    );
    const scale = makeLinearScale(computeXDomain(bins), [0, 300], { nice: false });
    const bars = layoutBars(bins, scale, 2);
    for (const bar of bars) {
      expect(bar.width).toBeGreaterThan(0);
    }
    for (let i = 1; i < bars.length; i += 1) {
      expect(bars[i].x).toBeGreaterThanOrEqual(bars[i - 1].x + bars[i - 1].width);
    }
  });

  it('spans nearly the full plot width for a single degenerate bin (single data point / all-equal values), not a zero-width sliver', () => {
    const bins = computeHistogramBins([5, 5, 5]);
    expect(bins).toHaveLength(1);
    const scale = makeLinearScale(computeXDomain(bins), [0, 200]);
    const bars = layoutBars(bins, scale, 2);
    expect(bars).toHaveLength(1);
    expect(bars[0].width).toBeGreaterThan(150);
  });

  it('spans nearly the full plot width for an all-zero sample set', () => {
    const bins = computeHistogramBins([0, 0, 0, 0, 0]);
    expect(bins).toHaveLength(1);
    const scale = makeLinearScale(computeXDomain(bins), [0, 200]);
    const bars = layoutBars(bins, scale, 2);
    expect(bars[0].width).toBeGreaterThan(150);
  });
});

describe('collectXTicks', () => {
  it('returns [] for no bins', () => {
    const scale = makeLinearScale([0, 1], [0, 100]);
    expect(collectXTicks([], scale, String)).toEqual([]);
  });

  it('thins boundary labels to roughly maxTicks, not one per every bin edge', () => {
    const bins = computeHistogramBins(
      Array.from({ length: 100 }, (_, i) => i),
      10,
    );
    const scale = makeLinearScale(computeXDomain(bins), [0, 400], { nice: false });
    const ticks = collectXTicks(bins, scale, (v) => String(Math.round(v)), 4);
    expect(ticks.length).toBeLessThanOrEqual(bins.length + 1);
    expect(ticks.length).toBeLessThan(bins.length + 1);
  });

  it('formats each emitted tick label through the supplied formatter', () => {
    const bins = computeHistogramBins([0, 10, 20, 30, 40], 4);
    const scale = makeLinearScale(computeXDomain(bins), [0, 100], { nice: false });
    const ticks = collectXTicks(bins, scale, (v) => `£${Math.round(v)}`);
    for (const tick of ticks) {
      expect(tick.label.startsWith('£')).toBe(true);
    }
  });
});
