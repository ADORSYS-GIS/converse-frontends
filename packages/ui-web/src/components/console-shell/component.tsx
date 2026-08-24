import React, { useState } from 'react';

import { cn } from '../../cn';
import { BottomSheet } from '../bottom-sheet';
import { NavSpine } from '../nav-spine';
import { RailPanel } from '../rail-panel';
import type { ConsoleShellProps } from './types';

// Sticky offset for both rails — must match the header's real height (`ConsoleHeader`'s `h-14`
// = 56px). Written as a literal class string (not interpolated) so Tailwind's content scanner
// can see it — a template-literal-built `md:top-[${x}]` would never be generated.
const RAIL_STICKY = 'md:sticky md:top-[56px] md:max-h-[calc(100dvh-56px)] md:overflow-y-auto';

// Contract: docs/design/console-redesign/README.md §3 (shell and grid) + console-ui skill
// "Shape and layout" — mobile-first ladder and flex-shell (owner directive 2026-08-25):
//
//  - **Flex shell, centre-only stretch**: below the header, a flex row where both rails are
//    `flex-none` and fixed-width; the centre is the only stretching zone (`flex-1 min-w-0`).
//    No page-level horizontal overflow at any tier — anything intrinsically wide scrolls inside
//    its own container.
//  - **Sticky, independently-scrollable rails**: `sticky top-[56px] max-h-[calc(100dvh-56px)]
//    overflow-y-auto` at `md`/`lg` — the centre column is the document's own scroller.
//  - **CSS-driven tiers, not a JS `tier` prop**: `nav` is rendered twice from one
//    `NavSpineProps` (rail vs `bottom-bar`) and the right rail is rendered both inline and as a
//    `BottomSheet`; Tailwind's `md:`/`lg:` classes decide which is visible, so there is no
//    viewport-width detection to get out of sync with a real resize.
export function ConsoleShell({
  header,
  nav,
  leftSecondary,
  leftSecondaryLabel,
  rightRail,
  rightRailTitle,
  rightRailPeek,
  children,
  className,
}: ConsoleShellProps) {
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);

  return (
    <div className={cn('flex min-h-dvh flex-col bg-muted', className)}>
      <div className="sticky top-0 z-40 flex flex-col bg-chrome">
        {header}
        {leftSecondary ? (
          <div className="flex items-center justify-between border-t border-raised px-4 py-2 md:hidden">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={leftDrawerOpen}
              onClick={() => setLeftDrawerOpen(true)}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.09em] text-subtle hover:text-ink"
            >
              {leftSecondaryLabel}
              <svg aria-hidden="true" viewBox="0 0 8 8" className="h-2 w-2 stroke-current" fill="none" strokeWidth="1.4">
                <path d="M1 3l3 3 3-3" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 items-start gap-6 px-4 py-6">
        <div
          className={cn(
            'hidden flex-none flex-col gap-2 md:flex md:w-[208px]',
            RAIL_STICKY,
          )}
        >
          <RailPanel>
            <NavSpine {...nav} />
          </RailPanel>
          {leftSecondary}
        </div>

        {/* Bottom clearance for the fixed bottom nav (56px, below `md`) stacked under the right
            rail's `BottomSheet` peek row (~96px, below `lg`) — both are position: fixed, so the
            centre needs real padding or their last rows would sit underneath them. */}
        <main
          className={cn(
            'min-w-0 flex-1',
            rightRail ? 'pb-40 md:pb-28 lg:pb-6' : 'pb-20 md:pb-6',
          )}
        >
          {children}
        </main>

        {rightRail ? (
          <div className={cn('hidden lg:flex lg:w-[280px] lg:flex-none lg:flex-col', RAIL_STICKY)}>
            {rightRail}
          </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 h-14 bg-chrome md:hidden">
        <NavSpine {...nav} layout="bottom-bar" />
      </div>

      {rightRail ? (
        <div className="lg:hidden">
          <BottomSheet
            open={rightSheetOpen}
            onOpenChange={setRightSheetOpen}
            title={rightRailTitle}
            peek={rightRailPeek}
            className="bottom-14 md:bottom-0"
          >
            {rightRail}
          </BottomSheet>
        </div>
      ) : null}

      {leftSecondary ? (
        <div className="md:hidden">
          <BottomSheet
            open={leftDrawerOpen}
            onOpenChange={setLeftDrawerOpen}
            title={leftSecondaryLabel}
            className="bottom-14"
          >
            {leftSecondary}
          </BottomSheet>
        </div>
      ) : null}
    </div>
  );
}
