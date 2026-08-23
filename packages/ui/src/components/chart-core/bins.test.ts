import { describe, expect, it } from 'vitest';

import { computeHistogramBins, computeSharedBins } from './bins';

describe('computeHistogramBins', () => {
  it('returns no bins for empty input', () => {
    expect(computeHistogramBins([])).toEqual([]);
  });

  it('drops non-finite values before bucketing', () => {
    const bins = computeHistogramBins([1, 2, Number.NaN, 3, Number.POSITIVE_INFINITY], 3);
    const total = bins.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(3);
  });

  it('collapses a single distinct value (single data point) into one bin', () => {
    const bins = computeHistogramBins([42]);
    expect(bins).toEqual([{ x0: 42, x1: 42, count: 1 }]);
  });

  it('collapses all-equal values (all-zero) into one bin with every sample counted', () => {
    const bins = computeHistogramBins([0, 0, 0, 0, 0]);
    expect(bins).toEqual([{ x0: 0, x1: 0, count: 5 }]);
  });

  it('every count sums back to the input length for a normal spread', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30];
    const bins = computeHistogramBins(values, 5);
    const total = bins.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(values.length);
  });

  it('bins are contiguous and ascending -- no gap or overlap between x1 and the next x0', () => {
    const values = Array.from({ length: 50 }, (_, i) => i);
    const bins = computeHistogramBins(values, 6);
    for (let i = 1; i < bins.length; i += 1) {
      expect(bins[i].x0).toBe(bins[i - 1].x1);
    }
  });

  it('puts a value that dwarfs the rest of the sample in its own high bin, not folded into the rest', () => {
    // One series dwarfing others -- here within a single series, one extreme outlier.
    const values = [1, 1, 2, 2, 1, 2, 1000];
    const bins = computeHistogramBins(values, 5);
    const outlierBin = bins.find((b) => b.x1 >= 1000);
    expect(outlierBin?.count).toBe(1);
    const smallBin = bins[0];
    expect(smallBin.count).toBeGreaterThanOrEqual(4);
  });
});

describe('computeSharedBins', () => {
  it('returns no edges/counts for an empty series list', () => {
    expect(computeSharedBins([])).toEqual({ edges: [], counts: [] });
  });

  it('gives every input series a zero-filled counts row when all values are non-finite', () => {
    const result = computeSharedBins([[], [Number.NaN]]);
    expect(result.edges).toEqual([]);
    expect(result.counts).toEqual([[], []]);
  });

  it('collapses to one shared bin when the combined domain is a single point', () => {
    const result = computeSharedBins([[5, 5], [5]]);
    expect(result.edges).toEqual([5, 5]);
    expect(result.counts).toEqual([[2], [1]]);
  });

  it('shares one set of edges across series with different ranges, so an empty series still gets a full-length zero row', () => {
    const result = computeSharedBins([[0, 10, 20, 30, 40], []], 4);
    expect(result.counts[1]).toHaveLength(result.edges.length - 1);
    expect(result.counts[1].every((c) => c === 0)).toBe(true);
  });

  it('preserves each series total against the shared edges, including a series that dwarfs the others', () => {
    const small = [1, 2, 3];
    const large = Array.from({ length: 500 }, () => 4);
    const result = computeSharedBins([small, large], 8);
    const smallTotal = result.counts[0].reduce((a, b) => a + b, 0);
    const largeTotal = result.counts[1].reduce((a, b) => a + b, 0);
    expect(smallTotal).toBe(small.length);
    expect(largeTotal).toBe(large.length);
  });

  it('bins values into the correct shared bucket by boundary, not just by count', () => {
    // Two series occupying disjoint ranges of a combined [0, 100] domain: series A's
    // values should land entirely in the low buckets, series B's entirely in the high
    // ones -- this is the property that makes a ridgeline overlay meaningful.
    const seriesA = [0, 5, 10];
    const seriesB = [90, 95, 100];
    const result = computeSharedBins([seriesA, seriesB], 10);
    const midpoint = Math.floor(result.edges.length / 2);
    const aInLowHalf = result.counts[0].slice(0, midpoint).reduce((a, b) => a + b, 0);
    const bInHighHalf = result.counts[1].slice(midpoint).reduce((a, b) => a + b, 0);
    expect(aInLowHalf).toBe(seriesA.length);
    expect(bInHighHalf).toBe(seriesB.length);
  });

  it('a value sitting exactly on an internal edge belongs to the upper bucket, never double-counted', () => {
    // Combined domain [0, 20] with 2 requested bins lands the edges at
    // exactly [0, 10, 20] (confirmed against d3-bin directly). A value of
    // exactly 10 must land in the [10, 20) bucket, matching d3's own
    // half-open convention -- an off-by-one here would put it in [0, 10]
    // instead, silently shifting the visual boundary between two ridges.
    const result = computeSharedBins([[0, 20], [10]], 2);
    expect(result.edges).toEqual([0, 10, 20]);
    expect(result.counts[1]).toEqual([0, 1]);
    const total = result.counts[1].reduce((a, b) => a + b, 0);
    expect(total).toBe(1);
  });
});
