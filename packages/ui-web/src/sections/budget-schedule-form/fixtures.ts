// Fixtures for the budget-schedule form's Storybook stories and RTL tests
// (converse-frontends#451, story C8).

import type { BillingPlanChoice, BudgetScheduleFormErrors, BudgetScheduleFormValue } from './types';
import { createBlankBudgetSchedule } from './schedule-validation';

/** The `listBillingPlans` catalogue, as the console's own plans read today. */
export const budgetScheduleBillingPlans: BillingPlanChoice[] = [
  { id: 'free', label: 'free' },
  { id: 'starter', label: 'starter' },
  { id: 'growth', label: 'growth' },
  { id: 'enterprise', label: 'enterprise' },
];

/** A first-run draft — every field empty, every example line carrying the whole explanation. */
export const budgetScheduleFormEmpty: BudgetScheduleFormValue = createBlankBudgetSchedule();

/** The story's own worked example: "Reset remaining to $2.00 every day at 00:00 UTC", estate-wide. */
export const budgetScheduleFormDailyGlobal: BudgetScheduleFormValue = {
  name: 'estate-daily-reset',
  scopeKind: 'global',
  scopeId: '',
  cadence: 'daily',
  anchor: '',
  runAtUtc: '00:00',
  amount: '2',
  mode: 'reset',
  nextRunAt: '',
  enabled: false,
};

/** Weekly + top-up + plan scope — the three branches the daily/global fixture does not exercise. */
export const budgetScheduleFormWeeklyTopUp: BudgetScheduleFormValue = {
  name: 'free-plan-monday-top-up',
  scopeKind: 'billing_plan',
  scopeId: 'free',
  cadence: 'weekly',
  anchor: '1',
  runAtUtc: '06:00',
  amount: '15',
  mode: 'top_up',
  nextRunAt: '',
  enabled: true,
};

/** Monthly + single-account scope, anchored on the first — the shape an operator authors for one
 *  customer who agreed a fixed monthly allowance. */
export const budgetScheduleFormMonthlyAccount: BudgetScheduleFormValue = {
  name: 'northwind-monthly-allowance',
  scopeKind: 'account',
  scopeId: 'acct_c9k2m4x8p1q6r3t7v0w5y2',
  cadence: 'monthly',
  anchor: '1',
  runAtUtc: '00:00',
  amount: '250',
  mode: 'reset',
  nextRunAt: '',
  enabled: true,
};

/** Every field wrong at once — an empty name, a missing plan, an out-of-range day of month, a
 *  half-typed time and a zero amount. */
export const budgetScheduleFormInvalid: BudgetScheduleFormValue = {
  name: '   ',
  scopeKind: 'billing_plan',
  scopeId: '',
  cadence: 'monthly',
  anchor: '31',
  runAtUtc: '7:3',
  amount: '0',
  mode: 'reset',
  // In the past relative to `BUDGET_SCHEDULE_INVALID_NOW` below — a backdated window is the one
  // forced-execution mistake the backend refuses outright.
  nextRunAt: '2020-01-01T00:00',
  enabled: false,
};

/** The instant `budgetScheduleFormInvalidErrors` was computed against. Pinned, because "is this
 *  date in the future" is the one rule on this form that depends on a clock. */
export const BUDGET_SCHEDULE_INVALID_NOW = Date.parse('2026-09-03T12:00:00.000Z');

/** The errors `validateBudgetSchedule(budgetScheduleFormInvalid)` actually produces — asserted in
 *  `schedule-validation.test.ts` so the story can never show a message the validator would not. */
export const budgetScheduleFormInvalidErrors: BudgetScheduleFormErrors = {
  name: 'Give the schedule a name — it is how it is identified in the list.',
  scopeId: 'Choose the billing plan this schedule applies to.',
  anchor:
    'Choose a day of the month between 1 and 28 — later days are refused so the schedule never skips February.',
  runAtUtc: 'Enter a 24-hour UTC time as HH:MM, e.g. 00:00.',
  amount: 'Enter an amount greater than $0.00.',
  nextRunAt: 'Choose a time in the future — a past window would fire immediately.',
};

/**
 * A schedule whose next window an operator FORCED onto a date, on the edit route — the field is
 * filled here only because that is what the story has to show; the real edit route opens it empty
 * (an omitted `nextRunAt` is what leaves the stored window alone).
 */
export const budgetScheduleFormForcedWindow: BudgetScheduleFormValue = {
  ...budgetScheduleFormDailyGlobal,
  name: 'estate-daily-reset',
  nextRunAt: '2026-09-15T09:30',
  enabled: true,
};
