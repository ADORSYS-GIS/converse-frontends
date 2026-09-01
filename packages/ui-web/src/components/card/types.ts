import type { ReactNode } from 'react';

export interface CardProps {
  /** `section-title` role — rendered in the optional `.card-head` row alongside `actions`. */
  title?: string;
  /** Right-aligned controls in the head row (a menu trigger, a link) — rendered even without a
   *  title, so a card can carry actions with no heading of its own. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}
