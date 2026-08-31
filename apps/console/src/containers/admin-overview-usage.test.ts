import { describe, expect, it } from 'vitest';

import type { UsageQueryResponse } from '@lightbridge/api-rest';

import { UNASSIGNED_KEY } from './overview-usage';
import type { AccountUsageResponse } from './usage-overview-usage';
import {
  activeAccountsPerDay,
  activeProjectsPerDay,
  ADOPTION_ESTATE_LIMITS_CAPTION,
  adoptionOverTimeSeries,
  budgetPressureAccountIds,
  budgetPressureTruncationCaption,
  buildEstateMtdRequest,
  buildEstateModelRequest,
  buildEstatePreviousRequest,
  buildEstateProjectActivityRequest,
  combineModelDaySeries,
  dayPrecisionLastActiveLabel,
  estateAccountLabel,
  estateProjectLabel,
  requestVolumeSeries,
  safeRequests,
  spendDelta,
  splitResponseByAccount,
  summarizeMtdUsage,
} from './admin-overview-usage';

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

describe('safeRequests', () => {
  it('guards a malformed or negative request count to 0', () => {
    expect(safeRequests(point({ requests: 4 }))).toBe(4);
    expect(safeRequests(point({ requests: -1 }))).toBe(0);
    expect(safeRequests(point({ requests: Number.NaN }))).toBe(0);
  });
});

describe('combineModelDaySeries', () => {
  const perAccount: AccountUsageResponse[] = [
    {
      accountId: 'acct_1',
      response: {
        points: [
          point({ bucket_start: '2026-08-01T00:00:00.000Z', model: 'gpt-4o', total_cost: 5_000_000 }),
          point({ bucket_start: '2026-08-02T00:00:00.000Z', model: 'gpt-4o', total_cost: 3_000_000 }),
          point({ bucket_start: '2026-08-01T00:00:00.000Z', model: 'claude', total_cost: 1_000_000 }),
          point({ bucket_start: '2026-08-01T00:00:00.000Z', model: 'mini', total_cost: 500_000 }),
          point({ bucket_start: '2026-08-01T00:00:00.000Z', model: null, total_cost: 200_000 }),
        ],
      },
    },
  ];

  it('caps to the top N models by total spend and folds the rest into one "Other" series', () => {
    const series = combineModelDaySeries(perAccount, 2, (count) => `Other (${count} models)`);
    expect(series.map((s) => s.key)).toEqual(['gpt-4o', 'claude', '__other__']);
    const other = series.find((s) => s.key === '__other__');
    expect(other?.label).toBe('Other (2 models)');
    // mini (0.5) + unassigned (0.2) on 2026-08-01
    expect(other?.points).toEqual([{ x: new Date('2026-08-01T00:00:00.000Z'), y: 0.7 }]);
  });

  it('never truncates when there are fewer models than the cap', () => {
    const series = combineModelDaySeries(perAccount, 10);
    expect(series.some((s) => s.key === '__other__')).toBe(false);
    expect(series).toHaveLength(4);
  });
});

describe('requestVolumeSeries', () => {
  it('sums requests per day across the whole fan-out, ignoring the model dimension', () => {
    const perAccount: AccountUsageResponse[] = [
      {
        accountId: 'acct_1',
        response: {
          points: [
            point({ bucket_start: '2026-08-01T00:00:00.000Z', model: 'a', requests: 4 }),
            point({ bucket_start: '2026-08-01T00:00:00.000Z', model: 'b', requests: 6 }),
          ],
        },
      },
      {
        accountId: 'acct_2',
        response: {
          points: [point({ bucket_start: '2026-08-01T00:00:00.000Z', requests: 3 })],
        },
      },
    ];
    const { series, totalRequests } = requestVolumeSeries(perAccount);
    expect(series.points).toEqual([{ x: new Date('2026-08-01T00:00:00.000Z'), y: 13 }]);
    expect(totalRequests).toBe(13);
  });
});

describe('activeAccountsPerDay', () => {
  it('counts an account active a day only when its summed spend that day is > 0', () => {
    const perAccount: AccountUsageResponse[] = [
      {
        accountId: 'acct_1',
        response: { points: [point({ bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 1_000_000 })] },
      },
      {
        accountId: 'acct_2',
        response: { points: [point({ bucket_start: '2026-08-01T00:00:00.000Z', total_cost: 0 })] },
      },
      {
        accountId: 'acct_3',
        response: { points: [point({ bucket_start: '2026-08-02T00:00:00.000Z', total_cost: 2_000_000 })] },
      },
    ];
    const byDay = activeAccountsPerDay(perAccount);
    expect(byDay.get(new Date('2026-08-01T00:00:00.000Z').getTime())).toBe(1);
    expect(byDay.get(new Date('2026-08-02T00:00:00.000Z').getTime())).toBe(1);
  });
});

describe('activeProjectsPerDay', () => {
  it('counts distinct projects with real spend, excluding unassigned spend entirely', () => {
    const perAccount: AccountUsageResponse[] = [
      {
        accountId: 'acct_1',
        response: {
          points: [
            point({ bucket_start: '2026-08-01T00:00:00.000Z', project_id: 'proj_a', total_cost: 1_000_000 }),
            point({ bucket_start: '2026-08-01T00:00:00.000Z', project_id: 'proj_b', total_cost: 1_000_000 }),
            point({ bucket_start: '2026-08-01T00:00:00.000Z', project_id: null, total_cost: 5_000_000 }),
          ],
        },
      },
    ];
    const byDay = activeProjectsPerDay(perAccount);
    expect(byDay.get(new Date('2026-08-01T00:00:00.000Z').getTime())).toBe(2);
  });
});

describe('adoptionOverTimeSeries', () => {
  it('zero-fills whichever side has no entry for a day either map carries', () => {
    const accounts = new Map([[new Date('2026-08-01T00:00:00.000Z').getTime(), 3]]);
    const projects = new Map([
      [new Date('2026-08-01T00:00:00.000Z').getTime(), 5],
      [new Date('2026-08-02T00:00:00.000Z').getTime(), 2],
    ]);
    const series = adoptionOverTimeSeries(accounts, projects);
    const active = series.find((s) => s.key === 'active-accounts');
    expect(active?.points).toEqual([
      { x: new Date('2026-08-01T00:00:00.000Z'), y: 3 },
      { x: new Date('2026-08-02T00:00:00.000Z'), y: 0 },
    ]);
  });
});

describe('summarizeMtdUsage', () => {
  it('sums account-level spend/last-active and a per-project breakdown, excluding unassigned', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ bucket_start: '2026-08-01T00:00:00.000Z', project_id: 'proj_a', total_cost: 1_000_000 }),
        point({ bucket_start: '2026-08-05T00:00:00.000Z', project_id: 'proj_a', total_cost: 2_000_000 }),
        point({ bucket_start: '2026-08-03T00:00:00.000Z', project_id: 'proj_b', total_cost: 500_000 }),
        point({ bucket_start: '2026-08-10T00:00:00.000Z', project_id: null, total_cost: 4_000_000 }),
      ],
    };
    const summary = summarizeMtdUsage(response);
    expect(summary.spend).toBe(7.5);
    expect(summary.lastActive).toEqual(new Date('2026-08-10T00:00:00.000Z'));
    expect(summary.projects).toHaveLength(2);
    const projA = summary.projects.find((p) => p.projectId === 'proj_a');
    expect(projA?.spend).toBe(3);
    expect(projA?.lastActive).toEqual(new Date('2026-08-05T00:00:00.000Z'));
  });

  it('is honestly empty for a response with no points', () => {
    const summary = summarizeMtdUsage({ points: [] });
    expect(summary).toEqual({ spend: 0, lastActive: null, projects: [] });
  });
});

describe('spendDelta', () => {
  it('reads "new this period" for real current spend off a zero base', () => {
    expect(spendDelta(50, 0)).toEqual({ direction: 'up', label: 'new this period' });
  });

  it('reads flat for a zero/zero pair', () => {
    expect(spendDelta(0, 0)).toEqual({ direction: 'flat', label: 'no change' });
  });

  it('computes a rounded percentage change, direction from sign', () => {
    expect(spendDelta(122, 100)).toEqual({ direction: 'up', label: '22% vs prev period' });
    expect(spendDelta(80, 100)).toEqual({ direction: 'down', label: '20% vs prev period' });
  });

  it('rounds a sub-0.5% change to flat rather than "0% vs prev period"', () => {
    expect(spendDelta(100.2, 100)).toEqual({ direction: 'flat', label: 'no change' });
  });
});

describe('dayPrecisionLastActiveLabel', () => {
  const today = new Date('2026-08-15T18:00:00.000Z');

  it('never claims sub-day precision', () => {
    expect(dayPrecisionLastActiveLabel(new Date('2026-08-15T02:00:00.000Z'), today)).toBe('Active today');
    expect(dayPrecisionLastActiveLabel(new Date('2026-08-14T00:00:00.000Z'), today)).toBe('1 day ago');
    expect(dayPrecisionLastActiveLabel(new Date('2026-08-10T00:00:00.000Z'), today)).toBe('5 days ago');
  });

  it('is honest about no activity at all rather than fabricating a date', () => {
    expect(dayPrecisionLastActiveLabel(null, today)).toBe('Never active');
  });
});

// UNASSIGNED_KEY import kept: `combineModelDaySeries`'s own "Unassigned" relabeling is covered
// implicitly above (the `model: null` point folds into the top-2 "gpt-4o"/"claude" case's
// remainder); this asserts the sentinel itself never leaks as a visible label.
describe('combineModelDaySeries — unassigned relabeling', () => {
  it('relabels the UNASSIGNED_KEY series as "Unassigned" when it survives into the top N', () => {
    const perAccount: AccountUsageResponse[] = [
      {
        accountId: 'acct_1',
        response: {
          points: [point({ bucket_start: '2026-08-01T00:00:00.000Z', model: null, total_cost: 9_000_000 })],
        },
      },
    ];
    const series = combineModelDaySeries(perAccount, 5);
    expect(series).toHaveLength(1);
    expect(series[0].key).toBe(UNASSIGNED_KEY);
    expect(series[0].label).toBe('Unassigned');
  });
});

// ── estate request builders (lightbridge-authz#605) — each board fires exactly ONE
// `scope: 'all', scope_id: ''` request, varying only the group-by dimension it needs. ──────────
describe('estate request builders', () => {
  const window = { start: new Date('2026-08-01T00:00:00.000Z'), end: new Date('2026-08-31T00:00:00.000Z') };

  it('buildEstateModelRequest groups by account_id and model', () => {
    const request = buildEstateModelRequest(window);
    expect(request.scope).toBe('all');
    expect(request.scope_id).toBe('');
    expect(request.group_by).toEqual(['account_id', 'model']);
    expect(request.bucket).toBe('1 day');
    expect(request.start_time).toBe(window.start.toISOString());
    expect(request.end_time).toBe(window.end.toISOString());
  });

  it('buildEstatePreviousRequest is ungrouped', () => {
    const request = buildEstatePreviousRequest(window);
    expect(request.scope).toBe('all');
    expect(request.scope_id).toBe('');
    expect(request.group_by).toBeUndefined();
  });

  it('buildEstateProjectActivityRequest groups by project_id only', () => {
    expect(buildEstateProjectActivityRequest(window).group_by).toEqual(['project_id']);
  });

  it('buildEstateMtdRequest groups by account_id and project_id', () => {
    const request = buildEstateMtdRequest(window);
    expect(request.scope).toBe('all');
    expect(request.scope_id).toBe('');
    expect(request.group_by).toEqual(['account_id', 'project_id']);
  });
});

// ── splitResponseByAccount (lightbridge-authz#605 rewrite) — the one function that lets every
// per-account adapter above keep reading an `AccountUsageResponse[]`, now assembled from a
// single `scope: 'all'` response instead of a per-account fan-out. ─────────────────────────────
describe('splitResponseByAccount', () => {
  it('groups points by account_id into the same AccountUsageResponse[] shape the old fan-out produced', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ account_id: 'acct_1', model: 'gpt-4o', total_cost: 1_000_000 }),
        point({ account_id: 'acct_2', model: 'claude', total_cost: 2_000_000 }),
        point({ account_id: 'acct_1', model: 'mini', total_cost: 500_000 }),
      ],
    };
    const split = splitResponseByAccount(response);
    expect(split).toHaveLength(2);
    const acct1 = split.find((r) => r.accountId === 'acct_1');
    expect(acct1?.response.points).toHaveLength(2);
    const acct2 = split.find((r) => r.accountId === 'acct_2');
    expect(acct2?.response.points).toHaveLength(1);
  });

  it('drops a point with no account_id — cannot happen for a group_by: [account_id, …] request, defensive only', () => {
    const response: UsageQueryResponse = {
      points: [
        point({ account_id: 'acct_1', total_cost: 1_000_000 }),
        point({ account_id: null, total_cost: 5_000_000 }),
        point({ total_cost: 5_000_000 }),
      ],
    };
    const split = splitResponseByAccount(response);
    expect(split).toEqual([{ accountId: 'acct_1', response: { points: [split[0].response.points[0]] } }]);
  });

  it('an empty response splits to an empty array', () => {
    expect(splitResponseByAccount({ points: [] })).toEqual([]);
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

describe('estateProjectLabel', () => {
  const family = [{ id: 'proj_1', name: 'Payments' }];

  it('uses the real name for a family project', () => {
    expect(estateProjectLabel('proj_1', family)).toBe('Payments');
  });

  it('never leaks the raw id for a foreign project — short sentinel form instead', () => {
    const label = estateProjectLabel('f1e2d3c4-b5a6-7890-aaaa-bbbbccccdddd', family);
    expect(label).toBe('proj_f1e2d3c4');
    expect(label).not.toContain('-');
  });
});

// ── budgetPressureAccountIds / budgetPressureTruncationCaption (lightbridge-authz#605 rewrite) —
// replaces the old family∪pending-queue `estateAccountIds` for the ONE board that still fans out
// per-account (`getBudgetBalance`, an RPC the usage scope=all widening does not touch). ─────────
describe('budgetPressureAccountIds', () => {
  it('unions usage-named ids and family ids, usage-named first, with no duplicates', () => {
    const result = budgetPressureAccountIds(['acct_1', 'acct_2'], ['acct_2', 'acct_9'], 10);
    expect(result.ids).toEqual(['acct_1', 'acct_2', 'acct_9']);
    expect(result.totalCandidates).toBe(3);
    expect(result.truncated).toBe(false);
  });

  it('caps the union at `cap`, usage-named accounts winning the cap before family-only ones', () => {
    const result = budgetPressureAccountIds(['acct_1', 'acct_2', 'acct_3'], ['acct_4', 'acct_5'], 4);
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

describe('ADOPTION_ESTATE_LIMITS_CAPTION', () => {
  it('is honest, non-empty wording naming both structural limits', () => {
    expect(ADOPTION_ESTATE_LIMITS_CAPTION.length).toBeGreaterThan(0);
    expect(ADOPTION_ESTATE_LIMITS_CAPTION).toContain('New accounts this period');
    expect(ADOPTION_ESTATE_LIMITS_CAPTION).toContain('Gone quiet');
  });
});
