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

/** #306 — the budget-balance/usage query is in flight. See `BudgetHeroLoadingProps`. */
export interface BudgetSummaryLoading {
  status: 'loading';
}

/** #306 — the budget-balance/usage query ran and failed, distinct from `'unwired'`. See
 *  `BudgetHeroErrorProps`. */
export interface BudgetSummaryError {
  status: 'error';
  errorMessage?: string;
  onRetry?: () => void;
}

/**
 * `value`/`ceiling` are absent (not optional-and-zero) on the `'unwired'` branch — see
 * `BudgetHeroProps`'s docstring for why this is a type-level guarantee, not just a convention.
 */
export type BudgetSummary =
  BudgetSummaryReady | BudgetSummaryUnwired | BudgetSummaryLoading | BudgetSummaryError;

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
  /**
   * #306 — the account-level hero's OWN inline refill control, forwarded verbatim to
   * `BudgetHero`'s `action` slot (ADR 0008 Decision 7: "number beside its ceiling beside its
   * control"). Distinct from `needsAttentionProject`'s `onRequestRefill`/`refillActionLabel`
   * below, which is a PROJECT-scoped control for a sub-block this schema currently has no
   * project-level ceiling to populate — see `overview-usage.ts`'s module doc comment. The caller
   * decides when to render it (e.g. only once the account itself is breached), matching
   * `BudgetHeroProps.action`'s own "only present once breached" convention.
   */
  heroAction?: ReactNode;
  /** Omitted entirely when no project is near its ceiling — never an empty placeholder block. */
  needsAttentionProject?: BudgetNeedsAttentionProject;
  onRequestRefill?: () => void;
  /** Omitted entirely when there is nothing pending. */
  refillRequestStatus?: BudgetRefillRequestStatus;
  onReviewInAdmin?: () => void;
  /**
   * The heading row's own trigger slot — today the standing, always-visible "Request refill…"
   * secondary action (owner, 2026-08-30: "budget refill form disappeared" — the refill control
   * used to appear ONLY past `BUDGET_BREACH_THRESHOLD`; this is what makes it reachable before
   * that). IA v3 phase 3 ("refill as a page") retargets it from a dialog to a navigation, to
   * `/accounts/<id>/refill` — distinct from `heroAction`, which stays breach-only and sits beside
   * the numeral itself (ADR 0008 Decision 7) — the two are not mutually exclusive: both navigate
   * to the same page.
   */
  actions?: ReactNode;
  className?: string;
}
