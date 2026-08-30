import type { ReactNode } from 'react';

import type { NavGroup } from '../../components/nav-spine';
import type { LinkComponent } from '../../lib/link-component';

export interface ConsoleSidebarProps {
  /** Logo + wordmark, top of the column (~52px row). */
  brand: ReactNode;
  /** The account/workspace switcher — typically `AccountBadge` at `variant="sidebar"`. */
  workspaceSwitcher: ReactNode;
  /** The nav groups — same shape `NavSpine` takes, rendered at both `sidebar` (persistent, `md`+)
   *  and `bottom-bar` (mobile dock, below `md`) layouts from this one prop. */
  groups: NavGroup[];
  /** The footer stack — search/palette trigger, theme, offline status, identity. Rendered only
   *  in the persistent sidebar; the mobile top bar carries its own compact equivalents. */
  footer: ReactNode;
  /** Same seam as `NavSpineProps.linkComponent` — see `lib/link-component.tsx`. */
  linkComponent?: LinkComponent;
  className?: string;
}
