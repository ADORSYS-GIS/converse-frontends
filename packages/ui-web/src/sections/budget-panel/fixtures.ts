// overview.svg's BUDGET dashboard, moved here from the deleted `pages/overview/fixtures.ts`.

import type {
  BudgetNeedsAttentionProject,
  BudgetRefillRequestStatus,
  BudgetSummary,
} from './types';

export const overviewBudget: BudgetSummary = {
  value: 142.55,
  ceiling: 500,
  caption: 'account ceiling · 28% used · resets 01 Mar',
};

export const overviewEmptyBudget: BudgetSummary = {
  value: 0,
  ceiling: 500,
  caption: 'account ceiling · 0% used · resets 01 Mar',
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
