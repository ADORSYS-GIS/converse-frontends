import type { HTMLAttributes, ReactNode, Ref } from 'react';

/**
 * Everything a `<section>` natively takes, minus `title` (which this component redefines as the
 * head row's heading, not the browser's tooltip attribute).
 *
 * The pass-through arrived with the declarative dashboard engine (converse-frontends#446):
 * `DashboardPanel` needs the card itself to be the focus target (`tabIndex`), to carry its own
 * accessible name, and to declare its grid span through a `data-` attribute the grid's own CSS
 * block reads. Wrapping the card in another `<div>` to hang those off would have put a second box
 * between the grid and its item, which breaks the span rule outright.
 */
export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** `section-title` role — rendered in the optional `.card-head` row alongside `actions`. */
  title?: ReactNode;
  /** Right-aligned controls in the head row (a menu trigger, a link) — rendered even without a
   *  title, so a card can carry actions with no heading of its own. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** React 19 passes `ref` as an ordinary prop to a function component — no `forwardRef` needed. */
  ref?: Ref<HTMLElement>;
}
