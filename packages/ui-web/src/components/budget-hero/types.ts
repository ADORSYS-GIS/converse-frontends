import type { ReactNode } from 'react';

export interface BudgetHeroProps {
  value: number;
  ceiling: number;
  /** Fraction (0–1) at and past which the meter turns `--signal`. Defaults to 0.9. */
  threshold?: number;
  /** Inter prose caption below the meter, e.g. "account ceiling · 28% used · resets 01 Mar". */
  caption?: ReactNode;
  /** Inline action slot, e.g. a `Request refill` primary Button — only present once breached. */
  action?: ReactNode;
  className?: string;
}
