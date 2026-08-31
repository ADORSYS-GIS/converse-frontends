import React from 'react';

import { cn } from '../../cn';
import { TOP_BAR_CLASS } from '../../lib/shell-grid';
import type { ConsoleTopBarProps } from './types';

// Shell brief (2026-08-30) — the mobile/tablet (<md) replacement for the persistent sidebar: a
// 48px sticky band carrying the brand, a compact workspace switcher, the `⌘K` palette trigger and
// a trailing slot. `TOP_BAR_CLASS` (lib/shell-grid.ts) owns the band's own geometry (height,
// `chrome` fill, the trailing hairline, sticky, hidden at `md`+); this component is a pure slot
// host and arranges nothing but the row itself.
//
// The `identity` slot (`AccountMenu`'s `inline` variant) is GONE (owner ruling, 2026-08-31, issue
// #368: "We don't need a drop down for the connected user, since it's in the left rail" —
// `AccountMenu` is deleted outright). `trailing` is what is left of that slot: real
// `apps/console` (`ConsoleTopBarContent`) renders only `ThemeToggle` into it now. Sign out is
// reachable everywhere, including below `md` where this band replaces the sidebar entirely, via
// the `⌘K` command palette's own "Sign out" action — this band carries no identity affordance of
// its own any more.
//
// `scripts/base-ui-adoption.ts` records `null` for this component, same reasoning the old
// `console-header` was refused under: every behaviour lives in the slots it hosts (`AccountBadge`,
// `CommandPaletteTrigger`, `ThemeToggle`), and this band is a layout band around opaque children —
// there is no primitive to delegate a layout band's own behaviour to, because it has none.
export function ConsoleTopBar({
  brand,
  workspaceSwitcher,
  paletteTrigger,
  trailing,
  className,
}: ConsoleTopBarProps) {
  return (
    <header className={cn(TOP_BAR_CLASS, className)}>
      {brand}
      {workspaceSwitcher}
      <div className="flex-1" />
      {paletteTrigger}
      {trailing}
    </header>
  );
}
