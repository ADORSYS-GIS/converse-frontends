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
  enabled: false,
};

/** The errors `validateBudgetSchedule(budgetScheduleFormInvalid)` actually produces — asserted in
 *  `schedule-validation.test.ts` so the story can never show a message the validator would not. */
export const budgetScheduleFormInvalidErrors: BudgetScheduleFormErrors = {
  name: 'Give the schedule a name — it is how it is identified in the list.',
  scopeId: 'Choose the billing plan this schedule applies to.',
  anchor:
    'Choose a day of the month between 1 and 28 — later days are refused so the schedule never skips February.',
  runAtUtc: 'Enter a 24-hour UTC time as HH:MM, e.g. 00:00.',
  amount: 'Enter an amount greater than $0.00.',
};
