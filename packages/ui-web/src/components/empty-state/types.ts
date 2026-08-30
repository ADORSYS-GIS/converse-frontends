import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** `section-title` role — the one-line statement of what is missing. */
  headline: string;
  /** `meta` role — a sentence of context under the headline. */
  explainer?: string;
  /** The one recovery affordance for this empty state (a `Button`, a link) — never more than one. */
  action?: ReactNode;
}
