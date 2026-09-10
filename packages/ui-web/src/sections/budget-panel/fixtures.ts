// overview.svg's BUDGET dashboard, moved here from the deleted `pages/overview/fixtures.ts`.

import type {
  BudgetNeedsAttentionProject,
  BudgetRefillRequestStatus,
  BudgetSummary,
} from './types';

export const overviewBudget: BudgetSummary = {
  value: 142.55,
  ceiling: 500,
  caption: 'account ceiling · 28% used this budget period',
};

export const overviewEmptyBudget: BudgetSummary = {
  value: 0,
  ceiling: 500,
  caption: 'account ceiling · 0% used this budget period',
};

// #273 — Overview's real state today: no usage-backend query client exists, so neither
// consumption nor ceiling has ever been queried. Distinct from `overviewEmptyBudget` above,
// which is a real, wired account that genuinely consumed nothing this period.
export const overviewUnwiredBudget: BudgetSummary = {
  status: 'unwired',
  caption: 'Budget figures arrive with the budget query wiring.',
};

export const overviewNeedsAttentionProject: BudgetNeedsAttentionProject = {
  name: 'gateway-prod',
  value: 455.2,
  ceiling: 500,
  caption: '91% of ceiling · 6 days left',
  refillActionLabel: 'Request refill',
};

export const overviewRefillRequestStatus: BudgetRefillRequestStatus = {
  pendingCount: 1,
  submittedLabel: 'submitted 2 days ago',
};

// #306 — a budget-balance/usage query in flight, distinct from `overviewUnwiredBudget` (never
// queried at all).
export const overviewLoadingBudget: BudgetSummary = { status: 'loading' };

// #306 — a budget-balance/usage query that ran and failed, distinct from both `'unwired'` and
// `'loading'`.
export const overviewErrorBudget: BudgetSummary = {
  status: 'error',
  errorMessage: 'Failed to load budget consumption.',
};
