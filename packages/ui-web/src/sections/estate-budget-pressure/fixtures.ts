// Fixtures for the operator overview's estate budget-pressure zone — eight accounts, each with
// its own ceiling (unlike `budget-pressure`'s single shared ceiling), spread across consumption
// ratios so exactly the top two clear the 0.9 breach threshold and the rank order is genuinely
// about ratio, not raw dollars (`acme-labs` outspends every other row yet ranks third).

import type { EstateBudgetPressureAccount } from './types';

// `nextReset` is the row's own resolved schedule (converse-frontends#451, story C8) — a mix on
// purpose: a daily global reset, a plan-scoped weekly top-up, an account-scoped monthly one, and
// two accounts no enabled schedule covers at all (which state so rather than rendering blank).
export const estateBudgetPressureAccounts: EstateBudgetPressureAccount[] = [
  {
    key: 'acct_northwind',
    name: 'northwind-ai',
    spend: 456.2,
    ceiling: 500,
    nextReset: 'Next reset in 6 h → $500.00 (reset)',
  },
  {
    key: 'acct_stark',
    name: 'stark-infer',
    spend: 183.4,
    ceiling: 200,
    nextReset: 'Next reset in 3 days → $50.00 (top up)',
  },
  {
    key: 'acct_acme',
    name: 'acme-labs',
    spend: 4218.62,
    ceiling: 5000,
    nextReset: 'Next reset in 12 days → $5 000.00 (reset)',
  },
  {
    key: 'acct_globex',
    name: 'globex-research',
    spend: 640.1,
    ceiling: 1200,
    nextReset: 'No reset scheduled',
  },
  {
    key: 'acct_fabrikam',
    name: 'fabrikam-ml',
    spend: 210.0,
    ceiling: 300,
    nextReset: 'No reset scheduled',
  },
  {
    key: 'acct_initech',
    name: 'initech-core',
    spend: 88.4,
    ceiling: 150,
    nextReset: 'Next reset in 6 h → $150.00 (reset)',
  },
  // Still resolving — no line at all, never a fabricated "no schedule".
  { key: 'acct_wayne', name: 'wayne-analytics', spend: 95.75, ceiling: 250 },
  { key: 'acct_umbrella', name: 'umbrella-platform', spend: 40.6, ceiling: 200 },
];

/** The single worst-ratio row above — the one dashboard 4's burn-down chart plots. */
export const worstEstateBudgetPressureAccount = [...estateBudgetPressureAccounts].sort(
  (a, b) => b.spend / b.ceiling - a.spend / a.ceiling
)[0];

/** Every account genuinely drew nothing this period — a real, wired, empty answer. */
export const estateBudgetPressureEmpty: EstateBudgetPressureAccount[] = [];
