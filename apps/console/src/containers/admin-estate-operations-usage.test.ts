import { describe, expect, it } from 'vitest';

import type { UsageQueryResponse } from '@lightbridge/api-rest';

import {
  budgetPressureAccountIds,
  budgetPressureTruncationCaption,
  buildEstateMtdRequest,
  estateAccountLabel,
  REFILL_DECISIONS_UNAVAILABLE_CAPTION,
  splitResponseByAccount,
  summarizeMtdSpend,
} from './admin-estate-operations-usage';

/**
 * The surviving half of `admin-overview-usage.test.ts` (converse-frontends#447, story C4). The
 * cases for `combineModelDaySeries`, `requestVolumeSeries`, `activeAccountsPerDay`,
 * `activeProjectsPerDay`, `adoptionOverTimeSeries`, `dayPrecisionLastActiveLabel`, `spendDelta`,
 * `safeRequests` and the three deleted request builders went with the functions themselves — the
 * engine does that work now and `panel-adapters.test.ts` / `derived-metrics.test.ts` cover it.
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
    ...overrides,
  } as UsageQueryResponse['points'][number];
}

describe('buildEstateMtdRequest', () => {
  const window = {
    start: new Date('2026-08-01T00:00:00.000Z'),
    end: new Date('2026-08-31T00:00:00.000Z'),
  };

  it('is estate-wide, day-bucketed and grouped by account only', () => {
    const request = buildEstateMtdRequest(window);
    expect(request.scope).toBe('all');
    expect(request.scope_id).toBe('');
    expect(request.bucket).toBe('1 day');
    expect(request.group_by).toEqual(['account_id']);
    expect(request.limit).toBeGreaterThan(0);
  });

  it('carries the window it was handed, not a clock reading', () => {
    const request = buildEstateMtdRequest(window);
    expect(request.start_time).toBe(window.start.toISOString());
    expect(request.end_time).toBe(window.end.toISOString());
  });
});

describe('summarizeMtdSpend', () => {
  it('sums micro-USD costs into USD across every point', () => {
    expect(
      summarizeMtdSpend({
        truncated: false,
        points: [
          point({ total_cost: 1_000_000 }),
          point({ total_cost: 2_500_000 }),
          point({ total_cost: 500_000 }),
        ],
      })
    ).toBe(4);
  });

  it('is honestly zero for a response with no points', () => {
    expect(summarizeMtdSpend({ truncated: false, points: [] })).toBe(0);
  });

  it('clamps a malformed or negative cost per point rather than dropping the whole account', () => {
    expect(
      summarizeMtdSpend({
        truncated: false,
        points: [point({ total_cost: 1_000_000 }), point({ total_cost: -5_000_000 })],
      })
    ).toBe(1);
  });
});

describe('splitResponseByAccount', () => {
  it('groups points by account_id into the AccountUsageResponse[] shape the zone reads', () => {
    const response: UsageQueryResponse = {
      truncated: false,
      points: [
        point({ account_id: 'acct_1', total_cost: 1_000_000 }),
        point({ account_id: 'acct_2', total_cost: 2_000_000 }),
        point({ account_id: 'acct_1', total_cost: 500_000 }),
      ],
    };
    const split = splitResponseByAccount(response);
    expect(split).toHaveLength(2);
    expect(split.find((r) => r.accountId === 'acct_1')?.response.points).toHaveLength(2);
    expect(split.find((r) => r.accountId === 'acct_2')?.response.points).toHaveLength(1);
  });

  it('drops a point with no account_id rather than inventing a pseudo-account for it', () => {
    const response: UsageQueryResponse = {
      truncated: false,
      points: [
        point({ account_id: 'acct_1', total_cost: 1_000_000 }),
        point({ account_id: null, total_cost: 5_000_000 }),
        point({ total_cost: 5_000_000 }),
      ],
    };
    const split = splitResponseByAccount(response);
    expect(split).toEqual([
      {
        accountId: 'acct_1',
        // Each slice carries the PARENT's `truncated` flag: a slice of a query that dropped
        // buckets is short by the same amount, and claiming otherwise per account would be the
        // more confident lie (converse-frontends#448, mirroring lightbridge-authz#578).
        response: { points: [split[0].response.points[0]], truncated: false },
      },
    ]);
  });

  it('carries a truncated parent flag onto every slice rather than resetting it', () => {
    const split = splitResponseByAccount({
      truncated: true,
      points: [point({ account_id: 'acct_1' }), point({ account_id: 'acct_2' })],
    });
    expect(split.map((slice) => slice.response.truncated)).toEqual([true, true]);
  });

  it('an empty response splits to an empty array', () => {
    expect(splitResponseByAccount({ truncated: false, points: [] })).toEqual([]);
  });
});

describe('estateAccountLabel', () => {
  const family = [
    { id: 'acct_1', name: 'Brightline' },
    { id: 'acct_2', name: null },
  ];

  it('uses the real name for a family account', () => {
    expect(estateAccountLabel('acct_1', family)).toBe('Brightline');
  });

  it('falls back to accountScopeLabel’s own short-id form for an unnamed family account', () => {
    expect(estateAccountLabel('acct_2', family)).toBe('acct_acct_2');
  });

  it('never leaks the raw id for a foreign account — short sentinel form instead', () => {
    const label = estateAccountLabel('a1b2c3d4-e5f6-7890-aaaa-bbbbccccdddd', family);
    expect(label).toBe('acct_a1b2c3d4');
    expect(label).not.toContain('-');
  });
});

describe('budgetPressureAccountIds', () => {
  it('unions usage-named ids and family ids, usage-named first, with no duplicates', () => {
    const result = budgetPressureAccountIds(['acct_1', 'acct_2'], ['acct_2', 'acct_9'], 10);
    expect(result.ids).toEqual(['acct_1', 'acct_2', 'acct_9']);
    expect(result.totalCandidates).toBe(3);
    expect(result.truncated).toBe(false);
  });

  it('caps the union at `cap`, usage-named accounts winning the cap before family-only ones', () => {
    const result = budgetPressureAccountIds(
      ['acct_1', 'acct_2', 'acct_3'],
      ['acct_4', 'acct_5'],
      4
    );
    expect(result.ids).toEqual(['acct_1', 'acct_2', 'acct_3', 'acct_4']);
    expect(result.totalCandidates).toBe(5);
    expect(result.truncated).toBe(true);
  });

  it('both sources empty yields an empty, non-truncated result', () => {
    const result = budgetPressureAccountIds([], [], 10);
    expect(result).toEqual({ ids: [], totalCandidates: 0, truncated: false });
  });
});

describe('budgetPressureTruncationCaption', () => {
  it('is undefined when nothing was truncated', () => {
    expect(
      budgetPressureTruncationCaption({ ids: ['acct_1'], totalCandidates: 1, truncated: false })
    ).toBeUndefined();
  });

  it('states the real candidate total when truncated', () => {
    const caption = budgetPressureTruncationCaption({
      ids: ['acct_1', 'acct_2'],
      totalCandidates: 5,
      truncated: true,
    });
    expect(caption).toContain('Showing budget pressure for 2 of 5 accounts');
  });
});

describe('REFILL_DECISIONS_UNAVAILABLE_CAPTION', () => {
  it('names the real backend gap rather than hiding the missing board', () => {
    expect(REFILL_DECISIONS_UNAVAILABLE_CAPTION).toContain('lightbridge-authz#556');
    expect(REFILL_DECISIONS_UNAVAILABLE_CAPTION).toContain('pending queue');
  });
});
