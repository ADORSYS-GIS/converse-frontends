import type { ReactNode } from 'react';

interface BudgetHeroSharedProps {
  /** Inline action slot, e.g. a `Request refill` primary Button — only present once breached. */
  action?: ReactNode;
  className?: string;
}

export interface BudgetHeroReadyProps extends BudgetHeroSharedProps {
  status?: 'ready';
  value: number;
  ceiling: number;
  /** Fraction (0–1) at and past which the meter turns `--signal`. Defaults to 0.9. */
  threshold?: number;
  /** Inter prose caption below the meter, e.g. "account ceiling · 28% used this budget period". */
  caption?: ReactNode;
}

export interface BudgetHeroUnwiredProps extends BudgetHeroSharedProps {
  status: 'unwired';
  /**
   * Inter prose caption -- explains WHY, e.g. "Budget figures arrive with the budget query
   * wiring." Optional, but strongly recommended: this branch's headline alone only says "unknown,"
   * not why.
   */
  caption?: ReactNode;
}

/**
 * #306 -- a real budget-balance/usage query is now in flight or can now fail, which `'ready'`/
 * `'unwired'` alone had no way to express honestly: `'unwired'` means "never queried," not "queried
 * and waiting" or "queried and failed," the same distinction `DashboardStatus` already draws for
 * `SpendDashboard`/`SpendShareSection`. Skeleton geometry matches the `'ready'` branch's own numeral
 * + meter frame (console-ui skill states: "skeleton blocks matching final geometry").
 */
export interface BudgetHeroLoadingProps extends BudgetHeroSharedProps {
  status: 'loading';
}

/** #306 -- a budget-balance/usage query that ran and failed, distinct from `'unwired'` (never run
 *  at all) per this epic's own governing principle: a failed query must never render the same as
 *  "unknown." Same `ErrorLine` idiom `SpendDashboard`/`SpendShareSection` use in place of their value. */
export interface BudgetHeroErrorProps extends BudgetHeroSharedProps {
  status: 'error';
  errorMessage?: string;
  onRetry?: () => void;
}

/**
 * `value`/`ceiling` are deliberately absent from the `'unwired'` branch, not merely optional --
 * this is a real budget consumption vs. ceiling that has never been queried, and the type system
 * should make it impossible to hand this component a fabricated `0`/`0` to draw a numeral from
 * (#273: "the current BudgetHero ... makes the false number the dominant visual element"). Render
 * behaviour: `'unwired'` shows its own headline ("Not wired") at the SAME visual weight the real
 * numeral would have carried, per the ticket's "at least as prominent as the number display would
 * be" acceptance criterion, rather than a small caption underneath a confident false figure.
 */
export type BudgetHeroProps =
  BudgetHeroReadyProps | BudgetHeroUnwiredProps | BudgetHeroLoadingProps | BudgetHeroErrorProps;
