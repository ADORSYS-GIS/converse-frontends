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

export interface NavSpineProps {
  /** The four fixed nav groups (minus Admin, which is gated separately). */
  items: NavSpineItem[];
  /**
   * Admin group items. Rendered only when `showAdmin` is true, preceded by a `--raised`
   * rule and a right-aligned role marker (docs/design/console-redesign/README.md §3, §4).
   */
  adminItems?: NavSpineItem[];
  /** Gates the Admin group — pass the `lightbridge-admin` grant check result. */
  showAdmin?: boolean;
  /** Text for the right-aligned marker preceding the Admin group at `rail` layout. Defaults to `ROLE`. */
  roleLabel?: string;
  /**
   * `rail` (default) is the vertical left-rail stack: icon + label side by side, active = 2px
   * `--signal` left bar. `bottom-bar` is the mobile-first (<600) fixed bottom navigation dock
   * (console-ui skill "Shape and layout"): a horizontal row, icon above label, active = `primary`
   * text + a 2px `--signal` top bar. Same `NavSpineItem[]` data either way — `ConsoleShell` is
   * the only consumer that renders both layouts (CSS-hidden per tier) from one `nav` prop.
   */
  layout?: 'rail' | 'bottom-bar';
  className?: string;
  /**
   * Component rendering each `href` item — `next/link` in `apps/console`, a plain `<a>`
   * (`DefaultAnchor`) everywhere else. See `lib/link-component.tsx` for why this seam exists: a
   * bare anchor is a full document reload under the Next.js App Router, not a client-side
   * transition.
   */
  linkComponent?: LinkComponent;
}
