// Fixtures for the operator overview's estate budget-pressure zone — eight accounts, each with
// its own ceiling (unlike `budget-pressure`'s single shared ceiling), spread across consumption
// ratios so exactly the top two clear the 0.9 breach threshold and the rank order is genuinely
// about ratio, not raw dollars (`acme-labs` outspends every other row yet ranks third).

import type { EstateBudgetPressureAccount } from './types';

export const estateBudgetPressureAccounts: EstateBudgetPressureAccount[] = [
  { key: 'acct_northwind', name: 'northwind-ai', spend: 456.2, ceiling: 500 },
  { key: 'acct_stark', name: 'stark-infer', spend: 183.4, ceiling: 200 },
  { key: 'acct_acme', name: 'acme-labs', spend: 4218.62, ceiling: 5000 },
  { key: 'acct_globex', name: 'globex-research', spend: 640.1, ceiling: 1200 },
  { key: 'acct_fabrikam', name: 'fabrikam-ml', spend: 210.0, ceiling: 300 },
  { key: 'acct_initech', name: 'initech-core', spend: 88.4, ceiling: 150 },
  { key: 'acct_wayne', name: 'wayne-analytics', spend: 95.75, ceiling: 250 },
  { key: 'acct_umbrella', name: 'umbrella-platform', spend: 40.6, ceiling: 200 },
];

/** The single worst-ratio row above — the one dashboard 4's burn-down chart plots. */
export const worstEstateBudgetPressureAccount = [...estateBudgetPressureAccounts].sort(
  (a, b) => b.spend / b.ceiling - a.spend / a.ceiling
)[0];

/** Every account genuinely drew nothing this period — a real, wired, empty answer. */
export const estateBudgetPressureEmpty: EstateBudgetPressureAccount[] = [];
