import type { ReactNode } from 'react';

import type { LinkComponent } from '../../lib/link-component';

export interface NavSpineItem {
  /** Stable identity, also passed to `onSelect`. */
  key: string;
  label: string;
  /** Icon slot — a 10–12px glyph per the mockups. Structural, not decorative. */
  icon?: ReactNode;
  active?: boolean;
  /** Renders the item as an `<a>` when set; otherwise a `<button>`. */
  href?: string;
  onSelect?: (key: string) => void;
}

/**
 * One nav group — a `sidebar-group-label` (docs/design/console-revamp shell brief §"Nav groups")
 * heading rendered before its items when `label` is set, otherwise just the items. The
 * "Operator" group's own presence (or absence) IS the console's role marker now — there is no
 * separate `adminItems`/`showAdmin` axis any more: a caller that wants a gated group simply
 * includes or omits it from `groups`.
 */
export interface NavGroup {
  key: string;
  /** Sentence-case, e.g. "Workspace", "Account", "Operator" — never uppercase. Omit for a group
   *  with no heading of its own. */
  label?: string;
  items: NavSpineItem[];
}

export interface NavSpineProps {
  groups: NavGroup[];
  /**
   * `sidebar` is the persistent left-sidebar stack: icon + label side by side, active = 2px
   * `--signal` left bar, groups separated by their own label rows. `bottom-bar` is the
   * mobile-first (<600) fixed bottom navigation dock: a horizontal row, icon above label, active
   * = `primary` text + a 2px `--signal` top bar — every group's items flattened into one strip,
   * since a 56px dock has no legible home for group headings. Same `NavGroup[]` data either way —
   * `ConsoleSidebar` is the only consumer that renders both layouts (CSS-hidden per tier) from
   * one `groups` prop.
   */
  layout: 'sidebar' | 'bottom-bar';
  className?: string;
  /**
   * Component rendering each `href` item — `next/link` in `apps/console`, a plain `<a>`
   * (`DefaultAnchor`) everywhere else. See `lib/link-component.tsx` for why this seam exists: a
   * bare anchor is a full document reload under the Next.js App Router, not a client-side
   * transition.
   */
  linkComponent?: LinkComponent;
}
