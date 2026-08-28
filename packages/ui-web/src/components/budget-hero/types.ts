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
  /** Inter prose caption below the meter, e.g. "account ceiling · 28% used · resets 01 Mar". */
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
 * `value`/`ceiling` are deliberately absent from the `'unwired'` branch, not merely optional --
 * this is a real budget consumption vs. ceiling that has never been queried, and the type system
 * should make it impossible to hand this component a fabricated `0`/`0` to draw a numeral from
 * (#273: "the current BudgetHero ... makes the false number the dominant visual element"). Render
 * behaviour: `'unwired'` shows its own headline ("Not wired") at the SAME visual weight the real
 * numeral would have carried, per the ticket's "at least as prominent as the number display would
 * be" acceptance criterion, rather than a small caption underneath a confident false figure.
 */
export type BudgetHeroProps = BudgetHeroReadyProps | BudgetHeroUnwiredProps;
