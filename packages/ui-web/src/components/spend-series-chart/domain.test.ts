import { describe, expect, it } from 'vitest';

import { collectTimestamps, collectYDomain } from './domain';
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
