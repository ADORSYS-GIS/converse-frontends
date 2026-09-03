import { describe, expect, it } from 'vitest';

import {
  computeStackLayout,
  stackDominanceCaption,
  STACK_DOMINANT_SHARE,
  STACK_OTHER_KEY,
} from './stacks';
import type { StackSeriesInput } from './stacks';

const day = (n: number) => new Date(Date.UTC(2026, 8, n));

function series(key: string, values: [number, number, number]): StackSeriesInput {
  return {
    key,
    label: key.toUpperCase(),
    points: values.map((y, index) => ({ x: day(index + 1), y })),
  };
}

describe('computeStackLayout', () => {
  it('returns an empty layout for no series, and for series that only sum to zero', () => {
    expect(computeStackLayout([])).toMatchObject({ buckets: [], order: [], grandTotal: 0 });
    expect(computeStackLayout([series('a', [0, 0, 0])])).toMatchObject({ buckets: [], order: [] });
  });

  it('orders series by TOTAL descending, and gives each a stable rank index', () => {
    const layout = computeStackLayout([
      series('small', [1, 1, 1]),
      series('big', [10, 10, 10]),
      series('mid', [5, 5, 5]),
    ]);

    expect(layout.order.map((s) => s.key)).toEqual(['big', 'mid', 'small']);
    expect(layout.order.map((s) => s.index)).toEqual([0, 1, 2]);
    // The same series keeps the same rank index in every bucket — one model, one colour.
    for (const bucket of layout.buckets) {
      expect(bucket.segments.map((s) => s.key)).toEqual(['big', 'mid', 'small']);
      expect(bucket.segments.map((s) => s.index)).toEqual([0, 1, 2]);
    }
  });

  it('stacks each bucket onto a real zero baseline, so y1 - y0 is the true value', () => {
    const layout = computeStackLayout([series('big', [10, 10, 10]), series('mid', [5, 5, 5])]);

    const [first] = layout.buckets;
    expect(first.segments[0]).toMatchObject({ key: 'big', y0: 0, y1: 10, value: 10 });
    expect(first.segments[1]).toMatchObject({ key: 'mid', y0: 10, y1: 15, value: 5 });
    expect(first.total).toBe(15);
    expect(layout.maxTotal).toBe(15);
    expect(layout.grandTotal).toBe(45);
  });

  it('takes the UNION of timestamps and contributes 0 for a bucket a series never reported', () => {
    const layout = computeStackLayout([
      { key: 'a', label: 'A', points: [{ x: day(1), y: 4 }] },
      { key: 'b', label: 'B', points: [{ x: day(2), y: 6 }] },
    ]);

    expect(layout.buckets.map((b) => b.x.getTime())).toEqual([day(1).getTime(), day(2).getTime()]);
    // A zero segment is dropped rather than drawn as a zero-height rect that still eats a hover.
    expect(layout.buckets[0].segments.map((s) => s.key)).toEqual(['a']);
    expect(layout.buckets[1].segments.map((s) => s.key)).toEqual(['b']);
  });

  it('clamps negative and non-finite values to zero rather than inverting the bar', () => {
    const layout = computeStackLayout([
      {
        key: 'a',
        label: 'A',
        points: [
          { x: day(1), y: -5 },
          { x: day(2), y: 3 },
        ],
      },
      {
        key: 'b',
        label: 'B',
        points: [
          { x: day(1), y: Number.NaN },
          { x: day(2), y: 2 },
        ],
      },
    ]);

    expect(layout.buckets[0].total).toBe(0);
    expect(layout.buckets[0].segments).toEqual([]);
    expect(layout.buckets[1].total).toBe(5);
    expect(layout.grandTotal).toBe(5);
  });

  it('folds the tail into one Other (N) column, summed PER BUCKET', () => {
    const layout = computeStackLayout(
      [
        series('a', [10, 10, 10]),
        series('b', [8, 8, 8]),
        series('c', [1, 0, 0]),
        series('d', [0, 2, 0]),
      ],
      { topN: 2 }
    );

    expect(layout.collapsedCount).toBe(2);
    expect(layout.order.map((s) => s.key)).toEqual(['a', 'b', STACK_OTHER_KEY]);
    expect(layout.order[2].label).toBe('Other (2)');
    // Bucket 1 carries only `c`'s 1; bucket 2 only `d`'s 2 — never the tail's period total.
    expect(layout.buckets[0].segments.at(-1)).toMatchObject({ key: STACK_OTHER_KEY, value: 1 });
    expect(layout.buckets[1].segments.at(-1)).toMatchObject({ key: STACK_OTHER_KEY, value: 2 });
    expect(layout.buckets[2].segments.map((s) => s.key)).toEqual(['a', 'b']);
  });

  it('keeps every series when topN is absent, zero or larger than the series count', () => {
    const input = [series('a', [3, 3, 3]), series('b', [2, 2, 2])];
    for (const options of [{}, { topN: 0 }, { topN: 9 }]) {
      const layout = computeStackLayout(input, options);
      expect(layout.collapsedCount).toBe(0);
      expect(layout.order.map((s) => s.key)).toEqual(['a', 'b']);
    }
  });

  it('takes the caller’s own "Other" wording', () => {
    const layout = computeStackLayout([series('a', [3, 3, 3]), series('b', [2, 2, 2])], {
      topN: 1,
      otherLabel: (count) => `${count} more models`,
    });
    expect(layout.order[1].label).toBe('1 more models');
  });

  it('reports the top series’ share of the period, which is what the caveat is measured on', () => {
    const dominated = computeStackLayout([series('big', [99, 99, 99]), series('tiny', [1, 0, 0])]);
    expect(dominated.topShare).toBeGreaterThan(STACK_DOMINANT_SHARE);
    const even = computeStackLayout([series('a', [5, 5, 5]), series('b', [5, 5, 5])]);
    expect(even.topShare).toBeCloseTo(50, 5);
  });
});

describe('stackDominanceCaption', () => {
  it('says so, naming the series and its share, when the top series exceeds the threshold', () => {
    const layout = computeStackLayout([series('big', [99, 99, 99]), series('tiny', [1, 0, 0])]);
    const caption = stackDominanceCaption(layout);
    expect(caption).toContain('BIG');
    expect(caption).toMatch(/(9\d|100)% of this period/);
  });

  it('says nothing when the split is worth reading, or when there is nothing plotted', () => {
    expect(
      stackDominanceCaption(computeStackLayout([series('a', [5, 5, 5]), series('b', [5, 5, 5])]))
    ).toBeNull();
    expect(stackDominanceCaption(computeStackLayout([]))).toBeNull();
  });
});
