import { describe, expect, it } from 'vitest';

import type { UsageQueryResponse } from '@lightbridge/api-rest';

import {
  buildBurnDownRequest,
  buildLensDayRequest,
  buildLensTotalsRequest,
  lensTotals,
  toAggregateDaySeries,
  toLatencyRows,
  toRankedSeriesRows,
  wholeWindowBucket,
} from './settings-overview-usage';

function point(overrides: Partial<UsageQueryResponse['points'][number]>) {
  return {
    bucket_start: '2026-08-01T00:00:00.000Z',
    requests: 1,
    usage_value: 1,
    total_cost: 1_000_000,
    prompt_tokens: 1,
    completion_tokens: 1,
    total_tokens: 2,
    latency_samples: 0,
    ...overrides,
  } as UsageQueryResponse['points'][number];
}

describe('wholeWindowBucket', () => {
  it('states an exact-day span in days', () => {
    const window = { start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-08T00:00:00Z') };
    expect(wholeWindowBucket(window)).toBe('7 days');
  });

  it('falls back to seconds for a span that is not a round day/hour/minute', () => {
    const window = { start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-01T00:00:07Z') };
    expect(wholeWindowBucket(window)).toBe('7 seconds');
  });

  it('never returns a zero-width interval, even for a degenerate window', () => {
    const window = { start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-01T00:00:00Z') };
    expect(wholeWindowBucket(window)).toBe('1 seconds');
  });
});

describe('buildLensDayRequest / buildLensTotalsRequest / buildBurnDownRequest', () => {
  const window = { start: new Date('2026-08-01T00:00:00Z'), end: new Date('2026-08-08T00:00:00Z') };

  it('day request is always account-scoped, day-bucketed, and sets the shared limit', () => {
    const request = buildLensDayRequest({ scope: 'account', scopeId: 'acct_1' }, window);
    expect(request.scope).toBe('account');
    expect(request.bucket).toBe('1 day');
    expect(request.group_by).toBeUndefined();
    expect(request.limit).toBeGreaterThan(0);
  });

  it('day request groups when a dimension is given', () => {
    expect(buildLensDayRequest({ scope: 'account', scopeId: 'acct_1' }, window, 'model').group_by).toEqual(['model']);
  });

  it('totals request spans the whole window as one bucket', () => {
    const request = buildLensTotalsRequest({ scope: 'account', scopeId: 'acct_1' }, window, 'model');
    expect(request.bucket).toBe('7 days');
    expect(request.group_by).toEqual(['model']);
  });

  it('carries the given scope/scopeId straight through — "scope-parameterized" is literal', () => {
    expect(buildLensDayRequest({ scope: 'project', scopeId: 'proj_7' }, window)).toMatchObject({
      scope: 'project',
      scope_id: 'proj_7',
    });
    expect(buildLensDayRequest({ scope: 'user', scopeId: 'usr_9' }, window)).toMatchObject({
      scope: 'user',
      scope_id: 'usr_9',
    });
  });

  it('burn-down request is always the current billing period, day-bucketed, ungrouped', () => {
    const request = buildBurnDownRequest('acct_1', new Date('2026-08-15T12:00:00Z'));
    expect(request.start_time).toBe('2026-08-01T00:00:00.000Z');
    expect(request.bucket).toBe('1 day');
    expect(request.group_by).toBeUndefined();
  });
});

describe('lensTotals', () => {
  it('sums requests and cost, computing cost-per-request', () => {
    const response: UsageQueryResponse = {
      points: [point({ requests: 3, total_cost: 3_000_000 }), point({ requests: 2, total_cost: 1_000_000 })],
    };
    const totals = lensTotals(response);
    expect(totals.requests).toBe(5);
    expect(totals.cost).toBeCloseTo(4);
    expect(totals.costPerRequest).toBeCloseTo(0.8);
  });

  it('never divides by zero — costPerRequest is 0 with no requests at all', () => {
    expect(lensTotals({ points: [] })).toEqual({ requests: 0, cost: 0, costPerRequest: 0 });
  });

  it('guards a malformed negative requests count to 0 for that point', () => {
    const response: UsageQueryResponse = { points: [point({ requests: -5, total_cost: 1_000_000 })] };
    expect(lensTotals(response).requests).toBe(0);
  });
});

describe('toAggregateDaySeries', () => {
  it('sums every point sharing a bucket into one series, regardless of any grouping', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ model: 'a', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 1_000_000 }),
        point({ model: 'b', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 2_000_000 }),
        point({ model: 'a', bucket_start: '2026-08-02T00:00:00.000Z', total_cost: 4_000_000 }),
      ],
    };

    const series = toAggregateDaySeries(response, 'This account');

    expect(series.key).toBe('total');
    expect(series.points.map((p) => p.y)).toEqual([3, 4]);
  });
});

describe('toRankedSeriesRows', () => {
  it('builds one row per key with a value and an oldest-first sparkline', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ model: 'gpt-4o', bucket_start: '2026-08-02T00:00:00.000Z', total_cost: 5_000_000 }),
        point({ model: 'gpt-4o', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 3_000_000 }),
      ],
    };

    const rows = toRankedSeriesRows(response, 'model');

    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBeCloseTo(8);
    expect(rows[0].formattedValue).toBe('$8.00');
    expect(rows[0].sparklinePoints).toEqual([3, 5]);
  });

  it('resolves labels through the given labeller while keeping the id as the key', () => {
    const response: UsageQueryResponse = {
      points: [point({ project_id: 'proj_a', total_cost: 1_000_000 })],
    };

    const rows = toRankedSeriesRows(response, 'project_id', (key) =>
      key === 'proj_a' ? 'gateway-prod' : key
    );

    expect(rows[0]).toMatchObject({ key: 'proj_a', label: 'gateway-prod' });
  });
});

describe('toLatencyRows', () => {
  it('maps each model point to its own p50/p95/p99/samples', () => {
    const response: UsageQueryResponse = {
      points: [
        point({
          model: 'gpt-4o',
          latency_p50_ms: 400,
          latency_p95_ms: 900,
          latency_p99_ms: 1500,
          latency_samples: 210,
        }),
      ],
    };

    const rows = toLatencyRows(response);

    expect(rows).toEqual([
      { key: 'gpt-4o', model: 'gpt-4o', p50Ms: 400, p95Ms: 900, p99Ms: 1500, samples: 210 },
    ]);
  });

  it('drops a point with no model at all rather than emitting a blank-keyed row', () => {
    const response: UsageQueryResponse = { points: [point({ model: undefined })] };
    expect(toLatencyRows(response)).toEqual([]);
  });
});
