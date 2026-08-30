import React from 'react';

import { cn } from '../../cn';
import { TOP_BAR_CLASS } from '../../lib/shell-grid';
import type { ConsoleTopBarProps } from './types';

// Shell brief (2026-08-30) — the mobile/tablet (<md) replacement for the persistent sidebar: a
// 48px sticky band carrying the brand, a compact workspace switcher, the `⌘K` palette trigger and
// the identity avatar. `TOP_BAR_CLASS` (lib/shell-grid.ts) owns the band's own geometry (height,
// `chrome` fill, the trailing hairline, sticky, hidden at `md`+); this component is a pure slot
// host and arranges nothing but the row itself.
//
// `scripts/base-ui-adoption.ts` records `null` for this component, same reasoning the old
// `console-header` was refused under: every behaviour lives in the slots it hosts (`AccountBadge`,
// `CommandPaletteTrigger`, `AccountMenu`), and this band is a layout band around opaque children —
// there is no primitive to delegate a layout band's own behaviour to, because it has none.
export function ConsoleTopBar({
  brand,
  workspaceSwitcher,
  paletteTrigger,
  identity,
  className,
}: ConsoleTopBarProps) {
  return (
    <header className={cn(TOP_BAR_CLASS, className)}>
      {brand}
      {workspaceSwitcher}
      <div className="flex-1" />
      {paletteTrigger}
      {identity}
    </header>
  );
}
