import type { ReactNode } from 'react';

export interface BudgetSummaryReady {
  status?: 'ready';
  value: number;
  ceiling: number;
  /** Fraction (0-1) at/past which the meter turns `--signal`. Defaults to `BudgetHero`'s own 0.9. */
  threshold?: number;
  /** Inter prose caption, e.g. "account ceiling · 28% used · resets 01 Mar". */
  caption: string;
}

export interface BudgetSummaryUnwired {
  status: 'unwired';
  /** Inter prose caption explaining WHY, e.g. "Budget figures arrive with the budget query wiring." */
  caption: string;
}

/**
 * `value`/`ceiling` are absent (not optional-and-zero) on the `'unwired'` branch — see
 * `BudgetHeroProps`'s docstring for why this is a type-level guarantee, not just a convention.
 */
export type BudgetSummary = BudgetSummaryReady | BudgetSummaryUnwired;

export interface BudgetNeedsAttentionProject {
  name: string;
  value: number;
  ceiling: number;
  threshold?: number;
  /** Inter prose caption, e.g. "91% of ceiling · 6 days left". */
  caption: string;
  refillActionLabel?: string;
}

export interface BudgetRefillRequestStatus {
  pendingCount: number;
  /** e.g. "submitted 2 days ago". */
  submittedLabel: string;
}

export interface BudgetPanelProps {
  /** Uppercase tracked heading. Defaults to overview.svg's own wording. */
  label?: string;
  budget: BudgetSummary;
  /** Omitted entirely when no project is near its ceiling — never an empty placeholder block. */
  needsAttentionProject?: BudgetNeedsAttentionProject;
  onRequestRefill?: () => void;
  /** Omitted entirely when there is nothing pending. */
  refillRequestStatus?: BudgetRefillRequestStatus;
  onReviewInAdmin?: () => void;
  /** Compact-tier trigger slot on the heading row (EXPORT lives beside this zone). */
  actions?: ReactNode;
  className?: string;
}
