// Fixtures for the dry-run preview (converse-frontends#451, story C8).
//
// The entry list deliberately mixes all three real cases the backend can report: an account below
// the target (a positive grant), an account ABOVE it (a negative `correction` row — the owner's
// "reset clamps both ways" ruling, the case a preview exists to surface), and an account already
// overspent into a negative remaining.

import type { BudgetSchedulePreviewEntry } from './types';

export const budgetSchedulePreviewEntries: BudgetSchedulePreviewEntry[] = [
  { budgetAccountId: 'acct_northwind', accountLabel: 'northwind-ai', remaining: 0.42, delta: 1.58 },
  { budgetAccountId: 'acct_stark', accountLabel: 'stark-infer', remaining: 12.4, delta: -10.4 },
  { budgetAccountId: 'acct_acme', accountLabel: 'acme-labs', remaining: -3.2, delta: 5.2 },
  { budgetAccountId: 'acct_globex', accountLabel: 'globex-research', remaining: 1.99, delta: 0.01 },
  { budgetAccountId: 'acct_fabrikam', accountLabel: 'fabrikam-ml', remaining: 0, delta: 2 },
  {
    budgetAccountId: 'acct_initech',
    accountLabel: 'initech-core',
    remaining: 0.006338,
    delta: 1.993662,
  },
  { budgetAccountId: 'acct_wayne', accountLabel: 'wayne-analytics', remaining: 5.5, delta: -3.5 },
  // An id nothing resolved — the label falls back to the id rather than inventing a name.
  {
    budgetAccountId: 'acct_unresolved_9f2',
    accountLabel: 'acct_unresolved_9f2',
    remaining: 2.5,
    delta: -0.5,
  },
];
