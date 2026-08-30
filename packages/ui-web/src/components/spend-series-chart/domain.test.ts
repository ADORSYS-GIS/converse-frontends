import { describe, expect, it } from 'vitest';

import { collectTimestamps, collectYDomain, cumulateSeries, withGapSentinels } from './domain';
import type { SpendSeriesSeries } from './types';

describe('collectTimestamps', () => {
  it('returns [] for no series', () => {
    expect(collectTimestamps([])).toEqual([]);
  });

  it('returns [] when every series has zero points (the empty-data state)', () => {
    const series: SpendSeriesSeries[] = [{ key: 'a', label: 'a', points: [] }];
    expect(collectTimestamps(series)).toEqual([]);
  });

  it('unions timestamps across series that report on different days, not just the first series', () => {
    const series: SpendSeriesSeries[] = [
      { key: 'a', label: 'a', points: [{ x: new Date('2026-01-01'), y: 1 }] },
      { key: 'b', label: 'b', points: [{ x: new Date('2026-01-02'), y: 2 }] },
    ];
    const result = collectTimestamps(series);
    expect(result.map((d) => d.toISOString())).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-01-02T00:00:00.000Z',
    ]);
  });

  it('dedupes a shared timestamp across series', () => {
    const shared = new Date('2026-01-01');
    const series: SpendSeriesSeries[] = [
      { key: 'a', label: 'a', points: [{ x: shared, y: 1 }] },
      { key: 'b', label: 'b', points: [{ x: shared, y: 2 }] },
    ];
    expect(collectTimestamps(series)).toHaveLength(1);
  });

  it('sorts ascending regardless of input order', () => {
    const series: SpendSeriesSeries[] = [
      {
        key: 'a',
        label: 'a',
        points: [
          { x: new Date('2026-03-01'), y: 1 },
          { x: new Date('2026-01-01'), y: 1 },
          { x: new Date('2026-02-01'), y: 1 },
        ],
      },
    ];
    const result = collectTimestamps(series);
    expect(result[0].getMonth()).toBe(0);
    expect(result[1].getMonth()).toBe(1);
    expect(result[2].getMonth()).toBe(2);
  });
});

describe('collectYDomain', () => {
  it('returns [0, 0] for no data (all-zero / empty state)', () => {
    expect(collectYDomain([])).toEqual([0, 0]);
    expect(collectYDomain([{ key: 'a', label: 'a', points: [] }])).toEqual([0, 0]);
  });

  it('is always anchored at 0, even when every value is far from it', () => {
    const series: SpendSeriesSeries[] = [
      {
        key: 'a',
        label: 'a',
        points: [
          { x: new Date(), y: 950 },
          { x: new Date(), y: 1000 },
        ],
      },
    ];
    expect(collectYDomain(series)).toEqual([0, 1000]);
  });

  it('takes the max across every series, so one series dwarfing another still sets the domain', () => {
    const series: SpendSeriesSeries[] = [
      { key: 'small', label: 'small', points: [{ x: new Date(), y: 5 }] },
      { key: 'large', label: 'large', points: [{ x: new Date(), y: 5000 }] },
    ];
    expect(collectYDomain(series)).toEqual([0, 5000]);
  });

  it('ignores non-finite values rather than letting them poison the max', () => {
    const series: SpendSeriesSeries[] = [
      {
        key: 'a',
        label: 'a',
        points: [
          { x: new Date(), y: Number.NaN },
          { x: new Date(), y: 42 },
        ],
      },
    ];
    expect(collectYDomain(series)).toEqual([0, 42]);
  });
});

describe('withGapSentinels', () => {
  const days = [new Date('2026-01-01'), new Date('2026-01-02'), new Date('2026-01-03')];

  it('leaves a NaN sentinel on a bucket this series reported no point for', () => {
    const series: SpendSeriesSeries = {
      key: 'a',
      label: 'a',
      points: [
        { x: days[0], y: 4 },
        { x: days[2], y: 9 },
      ],
    };
    const result = withGapSentinels(series, days);
    expect(result.map((p) => p.y)).toEqual([4, Number.NaN, 9]);
  });

  it('is a no-op when the series already reports on every timestamp', () => {
    const series: SpendSeriesSeries = {
      key: 'a',
      label: 'a',
      points: days.map((x) => ({ x, y: 1 })),
    };
    expect(withGapSentinels(series, days).map((p) => p.y)).toEqual([1, 1, 1]);
  });
});

describe('cumulateSeries', () => {
  const days = [
    new Date('2026-01-01'),
    new Date('2026-01-02'),
    new Date('2026-01-03'),
    new Date('2026-01-04'),
  ];

  it('runs a running total, forward-filling across a bucket with no spend', () => {
    const series: SpendSeriesSeries[] = [
      {
        key: 'a',
        label: 'a',
        points: [
          { x: days[0], y: 10 },
          // day 1 has no point at all — the running total must still carry forward on it.
          { x: days[2], y: 5 },
        ],
      },
    ];
    const [result] = cumulateSeries(series, days);
    expect(result.points.map((p) => p.y)).toEqual([10, 10, 15, 15]);
  });

  it('never introduces a gap — every point on the cumulated series is a real, finite number', () => {
    const series: SpendSeriesSeries[] = [{ key: 'a', label: 'a', points: [{ x: days[3], y: 2 }] }];
    const [result] = cumulateSeries(series, days);
    expect(result.points.every((p) => Number.isFinite(p.y))).toBe(true);
    expect(result.points.map((p) => p.y)).toEqual([0, 0, 0, 2]);
  });
});
