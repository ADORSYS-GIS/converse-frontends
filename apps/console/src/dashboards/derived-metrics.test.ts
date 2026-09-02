import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import { describe, expect, it } from 'vitest';

import { DERIVED_METRICS } from './dashboard-spec';
import {
  activeActors,
  activeActorsPerBucket,
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

describe('activeActorsPerBucket', () => {
  const points = [
    point({
      bucket_start: '2026-09-01T00:00:00Z',
      account_id: 'a1',
      project_id: 'p1',
      requests: 3,
    }),
    point({
      bucket_start: '2026-09-01T00:00:00Z',
      account_id: 'a1',
      project_id: 'p2',
      requests: 5,
    }),
    point({
      bucket_start: '2026-09-02T00:00:00Z',
      account_id: 'a2',
      project_id: 'p3',
      requests: 1,
    }),
  ];

  it('counts DISTINCT keys per bucket, one series per dimension — not one per key', () => {
    const [accounts, projects] = activeActorsPerBucket(response(points), [
      'account_id',
      'project_id',
    ]);
    expect(accounts.dimension).toBe('account_id');
    expect(accounts.points.map((p) => p.y)).toEqual([1, 1]);
    expect(projects.points.map((p) => p.y)).toEqual([2, 1]);
  });

  it('shares one x-domain across dimensions, zero-filling rather than dropping a bucket', () => {
    const [accounts, projects] = activeActorsPerBucket(
      response([
        point({ bucket_start: '2026-09-01T00:00:00Z', account_id: 'a1', requests: 2 }),
        point({
          bucket_start: '2026-09-02T00:00:00Z',
          account_id: 'a1',
          project_id: 'p1',
          requests: 2,
        }),
      ]),
      ['account_id', 'project_id']
    );
    expect(accounts.points).toHaveLength(2);
    expect(projects.points.map((p) => p.y)).toEqual([0, 1]);
  });

  /** A bucket the backend returned with no requests is not evidence the actor was active in it. */
  it('does not count a zero-request bucket as activity', () => {
    const [accounts] = activeActorsPerBucket(
      response([point({ bucket_start: '2026-09-01T00:00:00Z', account_id: 'a1', requests: 0 })]),
      ['account_id']
    );
    expect(accounts.points.map((p) => p.y)).toEqual([0]);
  });

  /** "Usage attributed to nobody" is not one more actor — the same rule the scalar count keeps. */
  it('never counts a null or empty group key', () => {
    const [projects] = activeActorsPerBucket(
      response([
        point({ bucket_start: '2026-09-01T00:00:00Z', project_id: null, requests: 4 }),
        point({ bucket_start: '2026-09-01T00:00:00Z', project_id: '', requests: 4 }),
        point({ bucket_start: '2026-09-01T00:00:00Z', project_id: 'p1', requests: 4 }),
      ]),
      ['project_id']
    );
    expect(projects.points.map((p) => p.y)).toEqual([1]);
  });

  it('is an empty series list for no dimensions, and empty points for no data', () => {
    expect(activeActorsPerBucket(response(points), [])).toEqual([]);
    expect(activeActorsPerBucket(response([]), ['account_id'])).toEqual([
      { dimension: 'account_id', points: [] },
    ]);
  });
});

describe('the registry', () => {
  it('implements exactly the derived metrics the schema accepts', () => {
    expect(Object.keys(derivedMetrics).sort()).toEqual([...DERIVED_METRICS].sort());
  });
});
