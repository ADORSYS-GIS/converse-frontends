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
}
