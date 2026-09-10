import { describe, expect, it } from 'vitest';
import type {
  ActorAccountLabel,
  BillingPlanInfo,
  BudgetResetSchedule,
  BudgetResetScheduleRunResult,
} from '@lightbridge/authz-rpc';

import {
  effectiveResetLabel,
  runResultAccountIds,
  scheduleScopeLabel,
  scheduleTiming,
  toBudgetScheduleRow,
  toPreviewEntries,
} from './budget-schedule-rows';

const NOW = Date.parse('2026-09-02T12:00:00Z');

function schedule(overrides: Partial<BudgetResetSchedule> = {}): BudgetResetSchedule {
  return {
    id: 'sched_1',
    name: 'estate-daily-reset',
    scopeKind: 'global',
    scopeId: null,
    cadence: 'daily',
    anchor: null,
    // 18:00 so the fixture is internally coherent: a daily schedule's computed window sits exactly
    // on its own `runAtUtc`, which is what makes it NOT a forced one. `nextRunAt` below is
    // 2026-09-02T18:00Z.
    runAtUtc: '18:00',
    amountMicros: '2000000',
    mode: 'reset',
    enabled: true,
    nextRunAt: '2026-09-02T18:00:00Z',
    lastRunAt: '2026-09-01T00:00:00Z',
    createdBy: 'user_1',
    createdAt: '2026-08-30T09:00:00Z',
    updatedAt: '2026-08-30T09:00:00Z',
    ...overrides,
  };
}

const PLANS: BillingPlanInfo[] = [
  { id: 'plan_free', name: 'free' },
  { id: 'plan_growth', name: 'growth' },
];

const ACCOUNT_LABELS: ActorAccountLabel[] = [
  { accountId: 'acct_northwind', name: 'northwind-ai', ownerUserId: 'user_9' },
];

describe('scheduleScopeLabel', () => {
  it('reads a global schedule as a sentence', () => {
    expect(scheduleScopeLabel(schedule(), PLANS, ACCOUNT_LABELS)).toBe('All accounts');
  });

  it('resolves a billing-plan id to the catalogue name', () => {
    expect(
      scheduleScopeLabel(
        schedule({ scopeKind: 'billing_plan', scopeId: 'plan_free' }),
        PLANS,
        ACCOUNT_LABELS
      )
    ).toBe('Plan free');
  });

  it('resolves an account id to its resolved name', () => {
    expect(
      scheduleScopeLabel(
        schedule({ scopeKind: 'account', scopeId: 'acct_northwind' }),
        PLANS,
        ACCOUNT_LABELS
      )
    ).toBe('Account northwind-ai');
  });

  // A blank scope cell would read as "global", which is the single most dangerous thing this
  // column could get wrong — a global schedule rewrites the whole estate.
  it.each([
    ['a plan no longer in the catalogue', 'billing_plan', 'plan_gone', 'Plan plan_gone'],
    ['an account nothing resolved', 'account', 'acct_gone', 'Account acct_gone'],
  ])('falls back to the raw id for %s', (_name, scopeKind, scopeId, expected) => {
    expect(scheduleScopeLabel(schedule({ scopeKind, scopeId }), PLANS, ACCOUNT_LABELS)).toBe(
      expected
    );
  });
});

describe('toBudgetScheduleRow', () => {
  it('renders the whole schedule as one sentence, plus its two relative timestamps', () => {
    expect(toBudgetScheduleRow(schedule(), NOW, PLANS, ACCOUNT_LABELS)).toEqual({
      id: 'sched_1',
      name: 'estate-daily-reset',
      scope: 'All accounts',
      cadence: 'Reset remaining to $2.00 every day at 18:00 UTC',
      nextRun: 'in 6 h',
      lastRun: '1 day ago',
      enabled: true,
    });
  });

  // A disabled schedule has a stored `nextRunAt` the scheduler will never reach — rendering it as
  // "in 6 h" would promise a run that is not going to happen.
  it('says "paused", not a next run, for a disabled schedule', () => {
    const row = toBudgetScheduleRow(schedule({ enabled: false }), NOW, PLANS, ACCOUNT_LABELS);
    expect(row.nextRun).toBe('paused');
    expect(row.enabled).toBe(false);
  });

  it('shows an em dash, never "never" or a fabricated date, for a schedule that has not fired', () => {
    expect(
      toBudgetScheduleRow(schedule({ lastRunAt: null }), NOW, PLANS, ACCOUNT_LABELS).lastRun
    ).toBe('—');
  });

  it('carries the top-up wording through to the ledger cell', () => {
    const row = toBudgetScheduleRow(
      schedule({
        mode: 'top_up',
        cadence: 'weekly',
        anchor: 1,
        runAtUtc: '06:00',
        amountMicros: '15000000',
      }),
      NOW,
      PLANS,
      ACCOUNT_LABELS
    );
    expect(row.cadence).toBe('Add $15.00 every Monday at 06:00 UTC');
  });

  // A window an operator pinned by hand sits off the cadence grid. Saying so is more honest than
  // letting the reader infer a cadence that does not exist — the row still says "every day at 18:00
  // UTC" beside it.
  it('marks a window that is not on the cadence grid as forced', () => {
    const row = toBudgetScheduleRow(
      schedule({ nextRunAt: '2026-09-14T09:30:00Z' }),
      NOW,
      PLANS,
      ACCOUNT_LABELS
    );
    expect(row.nextRun).toBe('in 11 days · forced');
  });

  it('does not call an on-grid window forced', () => {
    const row = toBudgetScheduleRow(
      schedule({ nextRunAt: '2026-09-14T18:00:00Z' }),
      NOW,
      PLANS,
      ACCOUNT_LABELS
    );
    expect(row.nextRun).toBe('in 12 days');
  });
});

describe('scheduleTiming', () => {
  // ABSOLUTE, unlike the list's relative cells: the preview sheet is the last screen before an
  // estate-wide grant, and "in 6 h" is not the same answer as the instant it will fire on.
  it('renders the next window absolutely and the last run relatively', () => {
    expect(scheduleTiming(schedule(), NOW)).toEqual({
      nextRun: '2026-09-02 18:00 UTC',
      nextRunForced: false,
      lastRun: '1 day ago',
    });
  });

  it('flags a forced window, and uses the same off-grid test the list cell does', () => {
    const timing = scheduleTiming(schedule({ nextRunAt: '2026-09-14T09:30:00Z' }), NOW);
    expect(timing).toEqual({
      nextRun: '2026-09-14 09:30 UTC',
      nextRunForced: true,
      lastRun: '1 day ago',
    });
  });

  it('shows an em dash for a schedule that has never fired', () => {
    expect(scheduleTiming(schedule({ lastRunAt: null }), NOW).lastRun).toBe('—');
  });
});

function runResult(
  overrides: Partial<BudgetResetScheduleRunResult> = {}
): BudgetResetScheduleRunResult {
  return {
    scheduleId: 'sched_1',
    dryRun: true,
    windowStart: '2026-09-02T00:00:00Z',
    entries: [
      { budgetAccountId: 'acct_northwind', remainingMicros: '420000', deltaMicros: '1580000' },
      { budgetAccountId: 'acct_stark', remainingMicros: '12400000', deltaMicros: '-10400000' },
    ],
    deferredAccountIds: ['acct_deferred'],
    supersededAccountIds: [],
    ...overrides,
  };
}

describe('toPreviewEntries', () => {
  it('converts micro-USD to USD and resolves the account label', () => {
    expect(toPreviewEntries(runResult(), ACCOUNT_LABELS, 25)).toEqual([
      {
        budgetAccountId: 'acct_northwind',
        accountLabel: 'northwind-ai',
        remaining: 0.42,
        delta: 1.58,
      },
      // The clamp-down: an account above the target gets a NEGATIVE row, which is the owner's
      // "reset clamps both ways" ruling as an operator actually sees it.
      { budgetAccountId: 'acct_stark', accountLabel: 'acct_stark', remaining: 12.4, delta: -10.4 },
    ]);
  });

  it('caps at the limit so the caller can state "the first N of M"', () => {
    expect(toPreviewEntries(runResult(), ACCOUNT_LABELS, 1)).toHaveLength(1);
  });

  // Never a fabricated "Unknown account" — two unresolved rows would then look like the same one.
  it('falls back to the id for an unresolved account, and for a blank resolved name', () => {
    const labels: ActorAccountLabel[] = [
      { accountId: 'acct_stark', name: '   ', ownerUserId: 'user_2' },
    ];
    const rows = toPreviewEntries(runResult(), labels, 25);
    expect(rows[0].accountLabel).toBe('acct_northwind');
    expect(rows[1].accountLabel).toBe('acct_stark');
  });
});

describe('runResultAccountIds', () => {
  it('de-duplicates the ids a result mentions', () => {
    const result = runResult({
      entries: [
        { budgetAccountId: 'a', remainingMicros: '0', deltaMicros: '1' },
        { budgetAccountId: 'a', remainingMicros: '0', deltaMicros: '1' },
        { budgetAccountId: 'b', remainingMicros: '0', deltaMicros: '1' },
      ],
    });
    expect(runResultAccountIds(result)).toEqual(['a', 'b']);
  });
});

describe('effectiveResetLabel', () => {
  it('states when, how much and which mode', () => {
    expect(
      effectiveResetLabel({ schedule: schedule(), nextRunAt: '2026-09-05T12:00:00Z' }, NOW)
    ).toBe('Next reset in 3 days → $2.00 (reset)');
  });

  // The envelope's `nextRunAt` is what the backend resolved for THIS account; the schedule's own
  // column is the rule's next window, which can differ.
  it('prefers the envelope’s nextRunAt over the schedule’s own column', () => {
    expect(
      effectiveResetLabel(
        {
          schedule: schedule({ nextRunAt: '2026-09-02T18:00:00Z' }),
          nextRunAt: '2026-09-09T12:00:00Z',
        },
        NOW
      )
    ).toContain('in 7 days');
  });

  it('falls back to the schedule’s own nextRunAt when the envelope carries none', () => {
    expect(effectiveResetLabel({ schedule: schedule(), nextRunAt: null }, NOW)).toContain('in 6 h');
  });

  // `null` means "say nothing" — a RESOLVED absence is the caller's to word, because the Budget
  // card and an estate row render it differently.
  it('returns null when no schedule covers the account, and when the read has not answered', () => {
    expect(effectiveResetLabel({ schedule: null, nextRunAt: null }, NOW)).toBeNull();
    expect(effectiveResetLabel(undefined, NOW)).toBeNull();
  });
});
