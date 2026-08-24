import type { ReactNode } from 'react';

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
  /** Text for the right-aligned marker preceding the Admin group. Defaults to `ROLE`. */
  roleLabel?: string;
  className?: string;
}
