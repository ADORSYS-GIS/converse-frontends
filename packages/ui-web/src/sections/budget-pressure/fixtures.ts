// Fixtures for the admin overview's budget-pressure zone. Shapes and magnitudes are the ones the
// console actually sees: sub-cent per-project spend against a $12.00 account ceiling is the real
// production case that forced `lib/money`'s precision ladder, so it is what the stories exercise.

import type { BudgetPressureProject } from './types';

export const ADMIN_CEILING = 12;

/**
 * The three rows sum to `ADMIN_SPEND_THIS_PERIOD`, deliberately: the pressure list is a
 * decomposition of the account hero beside it, and a story whose parts do not add up to its whole
 * teaches the wrong thing about what the two zones mean. `gateway-prod` sits past the 0.9 breach
 * threshold, so exactly one meter carries the accent.
 */
export const adminBudgetPressureProjects: BudgetPressureProject[] = [
  { key: 'proj_gateway', name: 'gateway-prod', spend: 10.94 },
  { key: 'proj_ingest', name: 'ingest-batch', spend: 0.86 },
  { key: 'proj_playground', name: 'playground', spend: 0.006338 },
];

/** The account's own consumption this period — the sum of the rows above. */
export const ADMIN_SPEND_THIS_PERIOD = 10.94 + 0.86 + 0.006338;

/** Every project genuinely spent nothing this period — a real, wired, empty answer. */
export const adminBudgetPressureEmpty: BudgetPressureProject[] = [];

/**
 * The caveat the real screen carries: there is no per-project ceiling in the authz schema, so each
 * meter is a draw on the account's single ceiling.
 */
export const ADMIN_BUDGET_PRESSURE_NOTE =
  'Each bar is this project’s draw on the account’s single ceiling. Projects have no ceiling of ' +
  'their own — a project’s quota is a governance tier, not a currency amount.';
