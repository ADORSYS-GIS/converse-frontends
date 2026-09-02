import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import { describe, expect, it } from 'vitest';

import { DERIVED_METRICS } from './dashboard-spec';
import {
  activeActors,
  avgCostPerMillionTokens,
  chatCount,
  derivedMetrics,
} from './derived-metrics';

/** A point with only the fields a given assertion cares about — every other numeric column is a
 *  real zero, not `undefined`, because the wire type declares them required. */
function point(overrides: Partial<UsageSeriesPoint>): UsageSeriesPoint {
  return {
    bucket_start: '2026-09-01T00:00:00Z',
    completion_tokens: 0,
    latency_samples: 0,
    prompt_tokens: 0,
    requests: 0,
    total_cost: 0,
    total_tokens: 0,
    usage_value: 0,
    ...overrides,
  };
}

const response = (points: UsageSeriesPoint[]): UsageQueryResponse => ({ points });

describe('avgCostPerMillionTokens', () => {
  /** Money is micro-USD on the wire: 2_000_000 µUSD is $2.00, over 1M tokens = $2.00 / 1M. */
  it('converts micro-USD to USD and scales to a million tokens', () => {
    expect(
      avgCostPerMillionTokens(response([point({ total_cost: 2_000_000, total_tokens: 1_000_000 })]))
    ).toBeCloseTo(2, 10);
  });

  it('sums across every point before dividing, never averages per-point ratios', () => {
    const value = avgCostPerMillionTokens(
      response([
        point({ total_cost: 1_000_000, total_tokens: 1_000_000 }),
        point({ total_cost: 3_000_000, total_tokens: 1_000_000 }),
      ])
    );
    expect(value).toBeCloseTo(2, 10);
  });

  /** "NULL means unknown, never 0": there is no honest cost-per-token for a window with no
   *  tokens, and `$0.00 / 1M` would read as "we measured it and it is free". */
  it.each([
    ['no points at all', []],
    ['spend with no tokens', [point({ total_cost: 5_000_000 })]],
    ['a malformed negative token count', [point({ total_cost: 5_000_000, total_tokens: -12 })]],
  ])('returns null for %s', (_label, points) => {
    expect(avgCostPerMillionTokens(response(points))).toBeNull();
  });

  it('clamps a malformed cost for that point alone rather than throwing', () => {
    const value = avgCostPerMillionTokens(
      response([
        point({ total_cost: Number.NaN, total_tokens: 500_000 }),
        point({ total_cost: 1_000_000, total_tokens: 500_000 }),
      ])
    );
    expect(value).toBeCloseTo(1, 10);
  });
});

describe('activeActors', () => {
  it('counts distinct group keys with real activity', () => {
    expect(
      activeActors(
        response([
          point({ user_id: 'u1', requests: 3 }),
          point({ user_id: 'u1', requests: 5 }),
          point({ user_id: 'u2', requests: 1 }),
        ])
      )
    ).toBe(2);
  });

  it('does not count a bucket the backend returned with zero requests', () => {
    expect(activeActors(response([point({ user_id: 'u1', requests: 0 })]))).toBe(0);
  });

  /** "Usage attributed to nobody" is not one more actor — the same rule `activeProjectsPerDay`
   *  states for an unassigned project. */
  it.each([
    ['null', null],
    ['empty', ''],
  ])('excludes a %s group key rather than counting it as an actor', (_label, value) => {
    expect(activeActors(response([point({ user_id: value, requests: 4 })]))).toBe(0);
  });

  it('counts whichever dimension it is asked for', () => {
    const points = [
      point({ user_id: 'u1', account_id: 'a1', requests: 1 }),
      point({ user_id: 'u2', account_id: 'a1', requests: 1 }),
    ];
    expect(activeActors(response(points), 'user_id')).toBe(2);
    expect(activeActors(response(points), 'account_id')).toBe(1);
  });
});

describe('chatCount', () => {
  it('sums request counts across the window', () => {
    expect(chatCount(response([point({ requests: 10 }), point({ requests: 32 })]))).toBe(42);
  });

  it('ignores a malformed or negative count for that point alone', () => {
    expect(
      chatCount(
        response([point({ requests: Number.NaN }), point({ requests: -5 }), point({ requests: 7 })])
      )
    ).toBe(7);
  });

  it('is zero for an empty response — a real count, not an unknown', () => {
    expect(chatCount(response([]))).toBe(0);
  });
});

describe('the registry', () => {
  it('implements exactly the derived metrics the schema accepts', () => {
    expect(Object.keys(derivedMetrics).sort()).toEqual([...DERIVED_METRICS].sort());
  });
});
