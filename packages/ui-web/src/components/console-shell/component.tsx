import React, { useState } from 'react';

import { cn } from '../../cn';
import { useIsBelowMd } from '../../lib/use-is-below-breakpoint';
import { BottomSheet } from '../bottom-sheet';
import { NavSpine } from '../nav-spine';
import { RailPanel } from '../rail-panel';
import type { ConsoleShellProps } from './types';
import { LABEL_CLASS } from '../../lib/type-roles';

// Sticky offset for both rails — must match the header's real height (`ConsoleHeader`'s `h-14`
// = 56px). Written as a literal class string (not interpolated) so Tailwind's content scanner
// can see it — a template-literal-built `md:top-[${x}]` would never be generated.
//
// `min-h-[calc(100dvh-56px)]` alongside the matching `max-h`/`overflow-y-auto` is what makes the
// flush-rail contract (console-ui skill "Rails are flush, aligned, full-height columns") hold on
// short-content pages, not just long ones: without it, `position: sticky` sizes the column to its
// own content (its parent flex row, `items-start`, never stretches children to the row's cross
// size), so a rail whose stacked sections are shorter than the viewport stopped short of the
// floor — the bug this fixes. Pinning `min-h` to the same `calc(100dvh-56px)` the `max-h` already
// caps at forces the column to always render exactly "viewport minus header" tall while sticky:
// short content still fills that box (the `surface` background reaches the bottom edge), and
// content taller than the viewport still scrolls internally via the existing `overflow-y-auto`
// rather than growing the column past it. Sticky positioning itself is untouched — only the
// column's own box height changes.
const RAIL_STICKY =
  'md:sticky md:top-[56px] md:min-h-[calc(100dvh-56px)] md:max-h-[calc(100dvh-56px)] md:overflow-y-auto';

// Contract: docs/design/console-redesign/README.md §3 (shell and grid) + console-ui skill
// "Shape and layout" — mobile-first ladder, flex-shell (owner directive 2026-08-25), and flush
// rails (owner revision 2026-08-25, supersedes the floating-panel-with-gutters reading of ADR
// 0008 Decision 3):
//
//  - **Flex shell, centre-only stretch**: below the header, a flex row where both rails are
//    `flex-none` and fixed-width; the centre is the only stretching zone (`flex-1 min-w-0`).
//    No page-level horizontal overflow at any tier — anything intrinsically wide scrolls inside
//    its own container.
//  - **Rails are flush, aligned, full-height columns**: each rail is ONE continuous `surface`
//    column, edge-to-edge against the viewport side and flush under the header — no outer
//    gutter on the row that holds header/rails/centre. Sections inside a rail (`RailPanel`s —
//    now a rail *section*, not a self-panelled card, see that component's own docstring) stack
//    with `divide-y divide-raised` so consecutive sections separate with one hairline rule,
//    never a gap that lets the floor show through. Only the centre column carries its own
//    padding, since it (and only it) sits directly on the floor.
//  - **Sticky, independently-scrollable rails**: `sticky top-[56px] max-h-[calc(100dvh-56px)]
//    overflow-y-auto` at `md`/`lg` — the centre column is the document's own scroller.
//  - **CSS-driven tiers, not a JS `tier` prop**: `nav` is rendered twice from one
//    `NavSpineProps` (rail vs `bottom-bar`); Tailwind's `md:`/`lg:` classes decide which is
//    visible, so there is no viewport-width detection to get out of sync with a real resize.
//  - **The shell does not own right-rail sheet state below `lg`** (owner revision 2026-08-25 —
//    no persistent footer/peek bar at 600–1024, superseding the earlier peek-mode `BottomSheet`
//    reading of ADR 0008/README §3): `rightRail` renders only inline, `lg:flex`. Below `lg` its
//    content is reached through page-placed contextual triggers, each opening one rail section
//    as its own `SectionSheet` — that state and composition belongs to the page, not the shell.
//  - **The one drawer the shell DOES own — `leftSecondary` below `md` — is gated in JS, not only
//    in CSS**: `open && useIsBelowMd()`, plus `md:hidden` on vaul's own overlay/content. See the
//    comment at that `BottomSheet` for why a `md:hidden` wrapper `<div>` is never enough.
export function ConsoleShell({
  header,
  nav,
  leftSecondary,
  leftSecondaryLabel,
  rightRail,
  children,
  className,
}: ConsoleShellProps) {
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const isBelowMd = useIsBelowMd();

  // Close the drawer when a live resize crosses up past `md`, adjusted **during render** rather
  // than in a `useEffect` — the React docs' own recommended pattern for "reset state when
  // something changes" (a conditional `setState` gated on a state-tracked previous value; React
  // discards the stale render and re-renders immediately, so no intermediate frame is painted).
  // An effect here would be a cascading render, and `react-hooks/set-state-in-effect` says so.
  const [previousIsBelowMd, setPreviousIsBelowMd] = useState(isBelowMd);
  if (isBelowMd !== previousIsBelowMd) {
    setPreviousIsBelowMd(isBelowMd);
    if (!isBelowMd) setLeftDrawerOpen(false);
  }

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
              className={cn('flex items-center gap-1.5 hover:text-ink', LABEL_CLASS)}
            >
              {leftSecondaryLabel}
              <svg aria-hidden="true" viewBox="0 0 8 8" className="h-2 w-2 stroke-current" fill="none" strokeWidth="1.4">
                <path d="M1 3l3 3 3-3" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 items-start">
        <div
          className={cn(
            'hidden flex-none flex-col divide-y divide-raised bg-surface md:flex md:w-[208px]',
            RAIL_STICKY,
          )}
        >
          <RailPanel>
            <NavSpine {...nav} />
          </RailPanel>
          {leftSecondary}
        </div>

        {/* The centre is the only padded, only stretching zone — it sits directly on the floor
            between two edge-to-edge rails, so it (not the row) owns the gutter. Bottom clearance
            only needs to clear the fixed bottom nav (56px, below `md`) — the right rail no
            longer contributes any fixed chrome below `lg` (owner revision 2026-08-25: no
            persistent footer/peek bar), so a page's own `SectionSheet` triggers render inline,
            in flow, needing no extra reserved space here. */}
        <main className="min-w-0 flex-1 px-4 py-6 pb-20 md:px-6 md:pb-6">{children}</main>

        {rightRail ? (
          <div
            className={cn(
              'hidden lg:flex lg:w-[280px] lg:flex-none lg:flex-col divide-y divide-raised bg-surface',
              RAIL_STICKY,
            )}
          >
            {rightRail}
          </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 h-14 bg-chrome md:hidden">
        <NavSpine {...nav} layout="bottom-bar" />
      </div>

      {/* The left-secondary drawer carries the SAME two-layer gate `SectionSheet` does — it is
          the same vaul/Radix modality problem, one tier down (`md`, not `lg`):

           1. `open && isBelowMd` (not merely a `md:hidden` wrapper) — plus the render-phase reset
              above, so a later resize back down does not pop a stale drawer open again with no
              fresh trigger: vaul's `Drawer.Portal`
              renders to `document.body`, so a class on a wrapping `<div>` never reaches the
              portaled overlay/content at all — and even a class that DID reach it would only
              hide the dialog visually while Radix's unconditional `modal: true` kept `<body>`
              at `pointer-events: none` and the rest of the page `aria-hidden`. Leaving this
              drawer open below `md` and then resizing up past it froze the whole app with no
              visible cause; suppressing `open` itself is the only thing that stops that.
           2. `md:hidden` on the overlay and the content themselves (`overlayClassName` /
              `className`) — a static net for the frame between a real `md` crossing and the
              hook's listener firing. */}
      {leftSecondary ? (
        <BottomSheet
          open={leftDrawerOpen && isBelowMd}
          onOpenChange={setLeftDrawerOpen}
          title={leftSecondaryLabel}
          overlayClassName="md:hidden"
          className="bottom-14 md:hidden"
        >
          {leftSecondary}
        </BottomSheet>
      ) : null}
    </div>
  );
}
