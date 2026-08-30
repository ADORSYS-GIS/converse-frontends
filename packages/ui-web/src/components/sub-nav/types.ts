import type { LinkComponent } from '../../lib/link-component';

export interface SubNavItem {
  key: string;
  label: string;
  /** Rendered as plain trailing mono text in the same row — never a badge (console-ui skill). */
  count?: number;
  active?: boolean;
  href?: string;
  onSelect?: (key: string) => void;
}

export interface SubNavProps {
  items: SubNavItem[];
  className?: string;
  /** Same seam as `NavSpineProps.linkComponent` — see `lib/link-component.tsx`. */
  linkComponent?: LinkComponent;
  /**
   * `'vertical'` (default) is the rail row `NavSpine` also renders — full-width active fill, an
   * icon column reserved even on icon-less rows. `'horizontal'` is a plain line of text tabs
   * (Settings' Account/Projects row, Attio pattern): no icon column, no rail bleed, the active
   * cell marked by a 2px underline (`sub-nav-tab`, theme.css) instead of a fill — a fill reads as
   * a selected list row, wrong for a top-level section switch that sits under a `PageHeader`.
   */
  orientation?: 'vertical' | 'horizontal';
}
