import { describe, expect, it } from 'vitest';

import type { UsageQueryResponse } from '@lightbridge/api-rest';

import {
  combineAccountModelResponses,
  modelTotalsToSegments,
  previousWindow,
  shiftSeriesForward,
  toPreviousPeriodSeries,
  truncateShareSegments,
  type AccountUsageResponse,
} from './usage-overview-usage';
import { UNASSIGNED_KEY } from './overview-usage';

function point(overrides: Partial<UsageQueryResponse['points'][number]>) {
  return {
    bucket_start: '2026-08-01T00:00:00.000Z',
    requests: 1,
    usage_value: 1,
    total_cost: 1_000_000,
    prompt_tokens: 1,
    completion_tokens: 1,
    total_tokens: 2,
    ...overrides,
  } as UsageQueryResponse['points'][number];
}

describe('previousWindow', () => {
  it('is the immediately preceding, non-overlapping window of the same length', () => {
    const window = { start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-08T00:00:00Z') };
    const previous = previousWindow(window);
    expect(previous.end).toEqual(window.start);
    expect(previous.start.toISOString()).toBe('2026-07-25T00:00:00.000Z');
  });
});

describe('combineAccountModelResponses', () => {
  const perAccount: AccountUsageResponse[] = [
    {
      accountId: 'acct_a',
      response: {
        points: [
          point({ model: 'gpt-4o', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 3_000_000 }),
          point({ model: 'claude', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 1_000_000 }),
          point({ model: 'gpt-4o', bucket_start: '2026-08-02T00:00:00.000Z', total_cost: 2_000_000 }),
        ],
      },
    },
    {
      accountId: 'acct_b',
      response: {
        points: [point({ model: 'gpt-4o', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 5_000_000 })],
      },
    },
  ];
  const labelFor = (id: string) => (id === 'acct_a' ? 'nova-labs' : id);

  it('builds one aggregate series summing across every account and model', () => {
    const { aggregateSeries } = combineAccountModelResponses(perAccount, labelFor);
    expect(aggregateSeries.key).toBe('estate-total');
    // day 1: 3+1+5=9, day 2: 2
    expect(aggregateSeries.points.map((p) => p.y)).toEqual([9, 2]);
  });

  it('builds one ranked row per account, summing across models within that account', () => {
    const { accountRows } = combineAccountModelResponses(perAccount, labelFor);
    const a = accountRows.find((r) => r.key === 'acct_a');
    const b = accountRows.find((r) => r.key === 'acct_b');
    expect(a?.value).toBeCloseTo(6); // 3+1+2
    expect(a?.label).toBe('nova-labs');
    expect(b?.value).toBeCloseTo(5);
    expect(b?.label).toBe('acct_b');
  });

  it('sums per-model totals across every account, for the global model share', () => {
    const { modelTotals } = combineAccountModelResponses(perAccount, labelFor);
    expect(modelTotals.get('gpt-4o')).toBeCloseTo(10); // 3+2+5
    expect(modelTotals.get('claude')).toBeCloseTo(1);
  });

  // 2026-08-31 owner-round parity fix (#6): a null-model point used to be skipped from
  // `modelTotals` entirely while `dayTotals` (the SPEND chart total) still counted it, so the
  // estate's own model-mix ShareBar summed to LESS than the chart above it for the same window.
  it('folds null-model cost into the UNASSIGNED_KEY sentinel rather than dropping it', () => {
    const withUnassigned: AccountUsageResponse[] = [
      {
        accountId: 'acct_c',
        response: {
          points: [
            point({ model: 'gpt-4o', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 4_000_000 }),
            point({ model: null, bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 6_000_000 }),
          ],
        },
      },
    ];

    const { modelTotals, aggregateSeries } = combineAccountModelResponses(withUnassigned, labelFor);

    expect(modelTotals.get(UNASSIGNED_KEY)).toBeCloseTo(6);
    // The chart total (dayTotals -> aggregateSeries) and the model-mix total now agree.
    const modelSum = Array.from(modelTotals.values()).reduce((sum, v) => sum + v, 0);
    expect(modelSum).toBeCloseTo(aggregateSeries.points.reduce((sum, p) => sum + p.y, 0));
  });
});

describe('shiftSeriesForward', () => {
  it('adds spanMs to every point’s timestamp without touching its value', () => {
    const oneDayMs = 86_400_000;
    const series = {
      key: 'previous-period',
      label: 'Previous period',
      points: [
        { x: new Date('2026-07-01T00:00:00.000Z'), y: 5 },
        { x: new Date('2026-07-02T00:00:00.000Z'), y: 7 },
      ],
    };

    const shifted = shiftSeriesForward(series, 7 * oneDayMs);

    expect(shifted.points.map((p) => p.x.toISOString())).toEqual([
      '2026-07-08T00:00:00.000Z',
      '2026-07-09T00:00:00.000Z',
    ]);
    expect(shifted.points.map((p) => p.y)).toEqual([5, 7]);
  });
});

describe('toPreviousPeriodSeries', () => {
  const SPAN_MS = 7 * 86_400_000;

  it('sums every account into one comparison series, keyed distinctly from the estate total', () => {
    const perAccount: AccountUsageResponse[] = [
      { accountId: 'acct_a', response: { points: [point({ total_cost: 2_000_000 })] } },
      { accountId: 'acct_b', response: { points: [point({ total_cost: 3_000_000 })] } },
    ];
    const series = toPreviousPeriodSeries(perAccount, SPAN_MS);
    expect(series.key).toBe('previous-period');
    expect(series.points[0].y).toBeCloseTo(5);
  });

  // 2026-08-31 owner finding fix (#2): the raw previous-window timestamps must not leak straight
  // onto the chart — `SpendSeriesChart` unions every series' own timestamps into one x-domain, so
  // an un-rebased previous-period series doubles it and squeezes the current line into half the
  // board.
  it('re-bases points forward by spanMs so they overlay the current window rather than extend it', () => {
    const perAccount: AccountUsageResponse[] = [
      {
        accountId: 'acct_a',
        response: { points: [point({ bucket_start: '2026-07-25T00:00:00.000Z', total_cost: 2_000_000 })] },
      },
    ];

    const series = toPreviousPeriodSeries(perAccount, SPAN_MS);

    expect(series.points[0].x.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });
});

describe('truncateShareSegments', () => {
  it('keeps the top N and folds the rest into one Other segment', () => {
    const segments = [
      { key: 'a', label: 'a', value: 50, formattedValue: '$50.00' },
      { key: 'b', label: 'b', value: 30, formattedValue: '$30.00' },
      { key: 'c', label: 'c', value: 10, formattedValue: '$10.00' },
      { key: 'd', label: 'd', value: 5, formattedValue: '$5.00' },
    ];

    const result = truncateShareSegments(segments, 2, (n) => `Other (${n})`);

    expect(result.map((s) => s.key)).toEqual(['a', 'b', '__other__']);
    expect(result[2]).toMatchObject({ label: 'Other (2)', value: 15 });
  });

  it('returns the list unchanged (no Other row) when nothing overflows', () => {
    const segments = [{ key: 'a', label: 'a', value: 50, formattedValue: '$50.00' }];
    expect(truncateShareSegments(segments, 5, (n) => `Other (${n})`)).toEqual(segments);
  });
});

describe('modelTotalsToSegments', () => {
  it('sorts descending by value', () => {
    const totals = new Map([
      ['small', 1],
      ['large', 9],
      ['mid', 4],
    ]);
    expect(modelTotalsToSegments(totals).map((s) => s.key)).toEqual(['large', 'mid', 'small']);
  });

  it('labels the UNASSIGNED_KEY sentinel "Unassigned" rather than the bare key', () => {
    const totals = new Map([
      ['gpt-4o', 9],
      [UNASSIGNED_KEY, 3],
    ]);
    const segments = modelTotalsToSegments(totals);
    const unassigned = segments.find((s) => s.key === UNASSIGNED_KEY);
    expect(unassigned?.label).toBe('Unassigned');
  });
});
