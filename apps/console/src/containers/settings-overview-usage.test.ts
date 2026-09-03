import { describe, expect, it } from 'vitest';

import type { UsageQueryResponse } from '@lightbridge/api-rest';

import { buildBurnDownRequest, toAggregateDaySeries } from './settings-overview-usage';

/**
 * What is left of this suite after C12 (converse-frontends#455).
 *
 * It used to cover a whole lens vocabulary — `buildLensDayRequest`, `buildLensTotalsRequest`,
 * `wholeWindowBucket`, `lensTotals`, `toRankedSeriesRows`, `toMultiSeriesSpend`, `toLatencyRows`.
 * Every one of those moved into the declarative engine when `/settings/overview/*` became
 * `dashboards.yaml` entries, and each is covered there instead: request building by
 * `resolve-dashboard.test.ts`, response shaping by `panel-adapters.test.tsx`, the stat row's own
 * cost-per-request by `derived-metrics.test.ts`. Deleting the tests with the functions is the
 * point — a suite that outlives its subject only pins a shape nobody renders.
 *
 * The burn-down is what survives, because it is measured over the BILLING PERIOD rather than the
 * page's range and so is not a panel at all.
 */

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

const response = (points: UsageQueryResponse['points']): UsageQueryResponse => ({
  truncated: false,
  points,
});

describe('buildBurnDownRequest', () => {
  it('is always the current billing period, day-bucketed, ungrouped and account-scoped', () => {
    const request = buildBurnDownRequest('acct_1', new Date('2026-08-15T12:00:00Z'));
    expect(request.scope).toBe('account');
    expect(request.scope_id).toBe('acct_1');
    expect(request.start_time).toBe('2026-08-01T00:00:00.000Z');
    expect(request.bucket).toBe('1 day');
    expect(request.group_by).toBeUndefined();
    expect(request.limit).toBeGreaterThan(0);
  });

  /** The whole reason it is not a panel: a panel follows the range picker, and a ceiling does not. */
  it('ignores any range the page happens to be showing — the month is not negotiable', () => {
    const july = buildBurnDownRequest('acct_1', new Date('2026-07-31T23:59:00Z'));
    expect(july.start_time).toBe('2026-07-01T00:00:00.000Z');
  });
});

describe('toAggregateDaySeries', () => {
  it('sums every point sharing a bucket into one series, regardless of any grouping', () => {
    const series = toAggregateDaySeries(
      response([
        point({ model: 'a', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 1_000_000 }),
        point({ model: 'b', bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 2_000_000 }),
        point({ model: 'a', bucket_start: '2026-08-02T00:00:00.000Z', total_cost: 4_000_000 }),
      ]),
      'This account'
    );

    expect(series.key).toBe('total');
    expect(series.label).toBe('This account');
    expect(series.points.map((p) => p.y)).toEqual([3, 4]);
  });

  it('orders buckets oldest first, whatever order the backend returned them in', () => {
    const series = toAggregateDaySeries(
      response([
        point({ bucket_start: '2026-08-03T00:00:00.000Z', total_cost: 3_000_000 }),
        point({ bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 1_000_000 }),
      ]),
      'x'
    );
    expect(series.points.map((p) => p.y)).toEqual([1, 3]);
  });
});
