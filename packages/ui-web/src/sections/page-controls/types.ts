import type { ReactNode } from 'react';

/**
 * One labelled cluster of controls in the page's parameter row.
 *
 * A GROUP is the unit the hairline divider parts, so the grouping is a statement about meaning:
 * "what window this is a picture of" is one group, "which slice" is another, "how much of it you
 * see" is a third. Splitting five controls into five groups would draw four hairlines and say
 * nothing; putting all five in one says they are one decision, which they are not.
 */
export interface PageControlsGroup {
  /** React key, and the `data-group` the tests and Storybook read. Never rendered as text. */
  id: string;
  /**
   * The group's accessible name (`role="group"` + `aria-label`).
   *
   * It is never shown: every control inside self-describes through its own chosen value ("Last 30
   * days", "By project", a person's name) — the phase-9 rule that killed the "Group by Project
   * Project All projects" stutter. What a sighted reader gets from proximity and a hairline, a
   * screen-reader reader gets from this.
   */
  label: string;
  children: ReactNode;
  /**
   * `end` pushes this group — and every group after it — to the trailing edge at `sm`+, the way
   * Export and Per-page sit opposite the filters on both reference screens. Below `sm` the row
   * wraps and alignment is meaningless, so it is ignored there. Defaults to `start`.
   */
  align?: 'start' | 'end';
}

export interface PageControlsProps {
  /**
   * The row's own accessible name — `Filters` reads wrong on a page whose controls are a range
   * and a lens rather than a narrowing. Callers in `apps/console` pass a translated string
   * (`common:controls.*`); Storybook and other consumers get the English default.
   */
  label?: string;
  groups: PageControlsGroup[];
  /**
   * Clears every filter the row owns, as a ghost button in the trailing group.
   *
   * Pass it only while something is actually being narrowed (Dub's "Clear Filters" appears with
   * the first filter and not before): a Reset that is always on screen is a control that usually
   * does nothing, and the reader has to press it to find that out.
   */
  onReset?: () => void;
  /** The reset affordance's copy. Defaults to `Reset filters`. */
  resetLabel?: string;
  className?: string;
}
