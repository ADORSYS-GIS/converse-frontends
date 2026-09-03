import React from 'react';

import { cn } from '../../cn';
import { NavSpine } from '../../components/nav-spine';
import { DefaultAnchor } from '../../lib/link-component';
import { SIDEBAR_CLASS } from '../../lib/shell-grid';
import type { ConsoleSidebarProps } from './types';

// Shell brief (2026-08-30) — the console's persistent left sidebar, replacing the old three-rail,
// header-band shell entirely. This is the ONE place `NavSpine` is composed: it renders both of
// the primitive's layouts from the same `groups` data — the persistent `sidebar` list (visible at
// `md`+, inside the column this component owns) and the mobile-first `bottom-bar` dock (visible
// below `md`, fixed to the viewport's bottom edge regardless of where this component sits in the
// DOM) — so a page never has to remember to mount the dock itself.
//
// `SIDEBAR_CLASS` (lib/shell-grid.ts) owns the column's own geometry (296px, `chrome` fill, the
// trailing hairline, sticky, its own scroll, hidden below `md`) — this component owns only its
// five internal rows, top to bottom: brand, workspace switcher, the nav list, a spacer, and the
// footer stack. `ConsoleShell` places the whole thing as one `sidebar` slot.
//
// NO UPSTREAM: a sidebar composing a brand mark, a switcher, a nav list and a settings footer has
// no single Base UI primitive under it — each of those already delegates its own behaviour
// (`NavSpine` to `navigation-menu`, the switcher to `AccountBadge`'s `menu`, the footer rows to
// their own components). This component is the layout that arranges them (`scripts/base-ui-adoption.ts`
// records the `null`).
export function ConsoleSidebar({
  brand,
  workspaceSwitcher,
  groups,
  footer,
  linkComponent = DefaultAnchor,
  className,
}: ConsoleSidebarProps) {
  return (
    <>
      <aside className={cn(SIDEBAR_CLASS, className)}>
        <div className="sidebar-brand-row">{brand}</div>
        <div className="sidebar-switcher-row">{workspaceSwitcher}</div>
        <nav className="sidebar-nav">
          <NavSpine groups={groups} layout="sidebar" linkComponent={linkComponent} />
        </nav>
        <div className="sidebar-footer">{footer}</div>
      </aside>

      {/* The mobile-first bottom navigation dock — the SAME `groups` data, rotated onto the
          bottom edge. `shell-dock-band` is `position: fixed`, so nesting it here rather than at
          `ConsoleShell`'s top level costs nothing positionally, and it is what lets one `groups`
          prop answer for navigation at every tier without `ConsoleShell` itself knowing about
          nav data at all. */}
      <div className="shell-dock-band md:hidden">
        <NavSpine groups={groups} layout="bottom-bar" linkComponent={linkComponent} />
      </div>
    </>
  );
}
