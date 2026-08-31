import { describe, expect, it } from 'vitest';

import {
  buildSummaryCaption,
  collectTimestamps,
  computeYDomain,
  logAxisTicks,
  shareOfTotal,
  transformSeries,
} from './domain';
import type { MultiSeriesSpendSeries } from './types';

function days(count: number) {
  const base = new Date('2026-02-01').getTime();
  return Array.from({ length: count }, (_, i) => new Date(base + i * 86_400_000));
}

function series(key: string, values: (number | null)[]): MultiSeriesSpendSeries {
  const d = days(values.length);
  return {
    key,
    label: key,
    points: values.flatMap((y, i) => (y === null ? [] : [{ x: d[i], y }])),
  };
}

describe('collectTimestamps', () => {
  it('unions timestamps across series, ascending, deduped', () => {
    const a = series('a', [1, null, 3]);
    const b = series('b', [null, 2, null]);
    const result = collectTimestamps([a, b]);
    expect(result).toHaveLength(3);
    expect(result[0].getTime()).toBeLessThan(result[1].getTime());
    expect(result[1].getTime()).toBeLessThan(result[2].getTime());
  });
});

describe('transformSeries', () => {
  it('linear: passes raw values through and gaps only genuinely absent buckets', () => {
    const s = series('a', [10, null, 30]);
    // A companion series that DOES report the middle day, so it stays part of the union domain —
    // otherwise there is no bucket for `s` to have a genuine gap in.
    const companion = series('b', [1, 1, 1]);
    const ts = collectTimestamps([s, companion]);
    const [out] = transformSeries([s, companion], ts, 'linear');
    expect(out.total).toBe(40);
    expect(out.points.map((p) => p.y)).toEqual([10, Number.NaN, 30]);
  });

  it('log: a real reported $0 bucket becomes a gap for plotting, but still counts toward total', () => {
    const s = series('a', [10, 0, 30]);
    const ts = collectTimestamps([s]);
    const [out] = transformSeries([s], ts, 'log');
    expect(out.total).toBe(40); // the $0 day is honestly counted
    expect(out.points[0].y).toBe(10);
    expect(Number.isNaN(out.points[1].y)).toBe(true); // cannot be placed on a log axis
    expect(out.points[2].y).toBe(30);
  });

  it('indexed: normalizes each series to its OWN peak, never a shared domain', () => {
    const tiny = series('tiny', [1, 2, 4]);
    const huge = series('huge', [100, 200, 400]);
    const ts = collectTimestamps([tiny, huge]);
    const [tinyOut, hugeOut] = transformSeries([tiny, huge], ts, 'indexed');
    // Both peak at the SAME relative height (100%) despite two orders of magnitude difference.
    expect(tinyOut.points[2].y).toBeCloseTo(100);
    expect(hugeOut.points[2].y).toBeCloseTo(100);
    expect(tinyOut.points[0].y).toBeCloseTo(25);
    expect(hugeOut.points[0].y).toBeCloseTo(25);
  });

  it('indexed: a series with no positive value anywhere is entirely gapped (never divides by zero)', () => {
    const allZero = series('flat', [0, 0, 0]);
    const ts = collectTimestamps([allZero]);
    const [out] = transformSeries([allZero], ts, 'indexed');
    expect(out.points.every((p) => Number.isNaN(p.y))).toBe(true);
  });
});

describe('computeYDomain', () => {
  it('linear: [0, max], widened when every value is zero', () => {
    const s = series('a', [0, 0, 0]);
    const ts = collectTimestamps([s]);
    const transformed = transformSeries([s], ts, 'linear');
    expect(computeYDomain(transformed, 'linear')).toEqual([0, 1]);
  });

  it('indexed: always the fixed [0, 100]', () => {
    const s = series('a', [5, 10]);
    const ts = collectTimestamps([s]);
    const transformed = transformSeries([s], ts, 'indexed');
    expect(computeYDomain(transformed, 'indexed')).toEqual([0, 100]);
  });

  it('log: rounds the domain out to whole decades around the real positive extent', () => {
    const s = series('a', [0.000047, 1.36]);
    const ts = collectTimestamps([s]);
    const transformed = transformSeries([s], ts, 'log');
    const [lo, hi] = computeYDomain(transformed, 'log');
    expect(lo).toBeCloseTo(0.00001);
    expect(hi).toBeCloseTo(10);
  });

  it('log: falls back to a narrow decade when nothing positive exists to plot', () => {
    const s = series('a', [0, 0]);
    const ts = collectTimestamps([s]);
    const transformed = transformSeries([s], ts, 'log');
    expect(computeYDomain(transformed, 'log')).toEqual([0.01, 1]);
  });
});

describe('logAxisTicks', () => {
  it('emits one tick per whole decade spanning the domain', () => {
    expect(logAxisTicks([0.001, 10])).toEqual([0.001, 0.01, 0.1, 1, 10]);
  });

  it('never runs unbounded', () => {
    expect(logAxisTicks([1e-10, 1e10]).length).toBeLessThanOrEqual(21);
  });
});

describe('shareOfTotal', () => {
  it('computes a percentage against the grand total', () => {
    expect(shareOfTotal(25, 100)).toBe(25);
  });

  it('returns 0 for a non-positive grand total instead of dividing by zero', () => {
    expect(shareOfTotal(0, 0)).toBe(0);
  });
});

describe('buildSummaryCaption', () => {
  const usd = (n: number) => `$${n.toFixed(2)}`;

  it('states the period total across every series as one sentence', () => {
    expect(buildSummaryCaption(255, 3, 0, usd)).toBe('$255.00 across 3 series');
  });

  it('appends the zero-spend tail count only when the tail is non-empty', () => {
    expect(buildSummaryCaption(255, 4, 1, usd)).toBe(
      '$255.00 across 4 series · 1 more · no spend this period'
    );
  });

  it('appends a caller-supplied truncation notice last', () => {
    expect(buildSummaryCaption(255, 4, 1, usd, 'Showing the top 25 of 61 accounts.')).toBe(
      '$255.00 across 4 series · 1 more · no spend this period · Showing the top 25 of 61 accounts.'
    );
  });

  it('omits the truncation clause entirely when not supplied', () => {
    expect(buildSummaryCaption(0, 2, 2, usd)).toBe('$0.00 across 2 series · 2 more · no spend this period');
  });
});
