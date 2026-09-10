import { describe, expect, it } from 'vitest';

import {
  budgetPeriodCaption,
  SINCE_PERIOD_START_LABEL,
  spentSinceResetLabel,
} from './budget-period-caption';

/**
 * The caption is the console's ONLY statement of what a ceiling is, so every assertion here is
 * about a claim it must not make: no "billing period" (nothing bills against the ledger's
 * `Period`), and no "a fact about this calendar month" beside a schedule that steps the ceiling up
 * once a day.
 */

const NOW = Date.parse('2026-09-03T12:00:00Z');

const DAILY_RESET = {
  cadence: 'daily',
  anchor: null,
  runAtUtc: '00:00',
  amountMicros: '2000000',
  mode: 'reset',
  nextRunAt: '2026-09-04T00:00:00Z',
};

describe('budgetPeriodCaption', () => {
  it('names the budget period and the range picker when there is no schedule', () => {
    expect(budgetPeriodCaption({ periodStart: '2026-09-01' })).toBe(
      "Budget figures follow the account's budget period (calendar month, 2026-09-01 → today); " +
        'the range picker above only changes the usage charts.'
    );
  });

  it('never says "billing period" — the ledger Period is a budget period, nothing bills on it', () => {
    const withoutSchedule = budgetPeriodCaption({ periodStart: '2026-09-01' });
    const withSchedule = budgetPeriodCaption({
      periodStart: '2026-09-01',
      schedule: DAILY_RESET,
      now: NOW,
    });
    expect(withoutSchedule).not.toMatch(/billing period/i);
    expect(withSchedule).not.toMatch(/billing period/i);
  });

  it('never claims the ceiling is a fact about the calendar month', () => {
    expect(
      budgetPeriodCaption({ periodStart: '2026-09-01', schedule: DAILY_RESET, now: NOW })
    ).not.toMatch(/ceiling is a fact/i);
  });

  it('states the cadence, the next run and that the ceiling grows, under a daily reset', () => {
    expect(
      budgetPeriodCaption({ periodStart: '2026-09-01', schedule: DAILY_RESET, now: NOW })
    ).toBe(
      'Budget figures follow the budget period (calendar month, 2026-09-01 → today). ' +
        'Reset remaining to $2.00 every day at 00:00 UTC (next in 12 h) — each reset is booked ' +
        'into this month, so the remaining balance returns to $2.00 while the ceiling grows by ' +
        'every reset. The range picker above only changes the usage charts.'
    );
  });

  it('words a top-up schedule as a rise, never as a return to the amount', () => {
    const caption = budgetPeriodCaption({
      periodStart: '2026-09-01',
      schedule: {
        cadence: 'weekly',
        anchor: 1,
        runAtUtc: '06:00',
        amountMicros: '15000000',
        mode: 'top_up',
        nextRunAt: '2026-09-07T06:00:00Z',
      },
      now: NOW,
    });
    expect(caption).toContain('Add $15.00 every Monday at 06:00 UTC (next in 3 days)');
    expect(caption).toContain(
      'the remaining balance rises by $15.00 and the ceiling grows with it'
    );
    expect(caption).not.toContain('returns to');
  });

  it('describes an unrecognised mode without inventing a verb for it', () => {
    const caption = budgetPeriodCaption({
      periodStart: '2026-09-01',
      schedule: { ...DAILY_RESET, mode: 'prorate' },
      now: NOW,
    });
    expect(caption).toContain('unrecognised mode "prorate"');
    expect(caption).toContain(
      'each tick is booked into this month, so the ceiling grows by every one'
    );
  });

  it('drops the "next" clause rather than fabricating one when nextRunAt is absent', () => {
    const caption = budgetPeriodCaption({
      periodStart: '2026-09-01',
      schedule: { ...DAILY_RESET, nextRunAt: null },
      now: NOW,
    });
    expect(caption).not.toContain('(next');
    expect(caption).toContain('Reset remaining to $2.00 every day at 00:00 UTC — ');
  });

  it('drops the "next" clause when the caller passed no read timestamp', () => {
    expect(budgetPeriodCaption({ periodStart: '2026-09-01', schedule: DAILY_RESET })).not.toContain(
      '(next'
    );
  });
});

describe('spentSinceResetLabel', () => {
  it('names its own window beside the figure', () => {
    expect(spentSinceResetLabel('$0.84', '2 h ago')).toBe('Spent since last reset $0.84 · 2 h ago');
  });

  it('says so explicitly when no reset has fired in this period', () => {
    expect(spentSinceResetLabel('$0.84', SINCE_PERIOD_START_LABEL)).toBe(
      'Spent since last reset $0.84 · since the period started (no reset has fired yet)'
    );
  });
});
