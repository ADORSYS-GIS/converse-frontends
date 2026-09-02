import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import { describe, expect, it } from 'vitest';

import { DERIVED_METRICS } from './dashboard-spec';
import {
  activeActors,
  activeActorsByGroup,
  activeActorsPerBucket,
  avgCostPerMillionTokens,
  chatCount,
  derivedMetrics,
  lastActiveByGroup,
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

const response = (points: UsageSeriesPoint[]): UsageQueryResponse => ({ truncated: false, points });

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

// ── converse-frontends#448: the two readings `/admin/usage` needs on top of the four above ────
describe('activeActorsByGroup', () => {
  it('counts DISTINCT actors of one dimension, broken down by a second', () => {
    expect(
      activeActorsByGroup(
        response([
          point({ account_id: 'a1', billing_plan: 'pro', requests: 3 }),
          point({ account_id: 'a1', billing_plan: 'pro', requests: 5 }),
          point({ account_id: 'a2', billing_plan: 'pro', requests: 1 }),
          point({ account_id: 'a3', billing_plan: 'free', requests: 2 }),
        ]),
        'account_id',
        'billing_plan'
      )
    ).toEqual([
      { key: 'pro', count: 2 },
      { key: 'free', count: 1 },
    ]);
  });

  /** A plan change mid-window is a real event, so the per-plan counts genuinely do NOT sum to the
   *  estate's account count — the panel prints no total for exactly this reason. */
  it('counts one account under both plans when it moved between them', () => {
    const byPlan = activeActorsByGroup(
      response([
        point({ account_id: 'a1', billing_plan: 'free', requests: 1 }),
        point({ account_id: 'a1', billing_plan: 'pro', requests: 1 }),
      ]),
      'account_id',
      'billing_plan'
    );
    expect(byPlan.reduce((sum, group) => sum + group.count, 0)).toBe(2);
    expect(activeActors(response([point({ account_id: 'a1', requests: 1 })]), 'account_id')).toBe(
      1
    );
  });

  it('is not evidence of activity when the bucket carried no requests', () => {
    expect(
      activeActorsByGroup(
        response([point({ account_id: 'a1', billing_plan: 'pro', requests: 0 })]),
        'account_id',
        'billing_plan'
      )
    ).toEqual([]);
  });

  it('invents no bucket for a null plan — "no plan we can name" is not a plan', () => {
    expect(
      activeActorsByGroup(
        response([
          point({ account_id: 'a1', billing_plan: null, requests: 4 }),
          point({ account_id: 'a2', billing_plan: 'pro', requests: 4 }),
        ]),
        'account_id',
        'billing_plan'
      )
    ).toEqual([{ key: 'pro', count: 1 }]);
  });
});

describe('lastActiveByGroup', () => {
  it('is the START of the most recent bucket that carried activity', () => {
    const latest = lastActiveByGroup(
      response([
        point({ user_id: 'u1', bucket_start: '2026-09-01T00:00:00Z', requests: 3 }),
        point({ user_id: 'u1', bucket_start: '2026-09-03T00:00:00Z', requests: 1 }),
        point({ user_id: 'u1', bucket_start: '2026-09-02T00:00:00Z', requests: 2 }),
      ]),
      'user_id'
    );
    expect(latest.get('u1')?.toISOString()).toBe('2026-09-03T00:00:00.000Z');
  });

  it('is ABSENT for an actor with rows but no activity — never dated at the window start', () => {
    const latest = lastActiveByGroup(
      response([point({ user_id: 'u1', bucket_start: '2026-09-01T00:00:00Z', requests: 0 })]),
      'user_id'
    );
    expect(latest.has('u1')).toBe(false);
  });
});

describe('the registry', () => {
  it('implements exactly the derived metrics the schema accepts', () => {
    expect(Object.keys(derivedMetrics).sort()).toEqual([...DERIVED_METRICS].sort());
  });
});
