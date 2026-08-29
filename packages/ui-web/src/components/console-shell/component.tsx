import React, { useState } from 'react';

import { cn } from '../../cn';
import { LABEL_CLASS } from '../../lib/type-roles';
import {
  LEFT_RAIL_CLASS,
  RAIL_STICKY_CLASS,
  RIGHT_RAIL_CLASS,
  SHELL_CENTRE_CLASS,
} from '../../lib/shell-grid';
import { useIsBelowMd } from '../../lib/use-is-below-breakpoint';
import { BottomSheet } from '../bottom-sheet';
import { NavSpine } from '../nav-spine';
import { RailPanel } from '../rail-panel';
import type { ConsoleShellProps } from './types';
import { Chevron } from '../chevron';

// Contract: docs/design/console-redesign/README.md §3 (shell and grid) + console-ui skill
// "Shape and layout" — mobile-first ladder, flex-shell (owner directive 2026-08-25), and flush
// rails (owner revision 2026-08-25, supersedes the floating-panel-with-gutters reading of ADR
// 0008 Decision 3).
//
// PRIMITIVES.md's `console-shell` row is NO UPSTREAM: daisy's drawer is a CSS-grid sidebar and is
// explicitly rejected — a grid sidebar cannot be sticky, independently scrollable and flush under
// the header at once. Every class here is therefore a hand-written utility by necessity. What the
// daisy/Base UI pass changed is where they LIVE: the four column/geometry strings moved to
// lib/shell-grid.ts, beside the existing lib/rail-grid.ts, each annotated with the clause that
// requires it — so the shell's grid is stated once instead of being re-typed per consumer.
//
//  - **Flex shell, centre-only stretch**: below the header, a flex row where both rails are
//    fixed-width and non-flexing (LEFT_RAIL_CLASS/RIGHT_RAIL_CLASS); the centre is the only
//    stretching zone (SHELL_CENTRE_CLASS, which carries the mandatory min-width reset). No
//    page-level horizontal overflow at any tier — anything intrinsically wide scrolls inside its
//    own container.
//  - **Rails are flush, aligned, full-height columns**: each rail is ONE continuous surface
//    column, edge-to-edge against the viewport side and flush under the header — no outer gutter
//    on the row that holds header/rails/centre. Sections inside a rail (RailPanels — a rail
//    *section*, not a self-panelled card) stack with the column's own divider, so consecutive
//    sections separate with a single hairline rule rather than a gap that lets the floor show
//    through. Only the centre column pads itself, since it alone sits on the floor.
//  - **Sticky, independently-scrollable rails** at md/lg (RAIL_STICKY_CLASS) — the centre column
//    is the document's own scroller.
//  - **CSS-driven tiers, not a JS `tier` prop**: `nav` is rendered twice from one NavSpineProps
//    (rail vs bottom-bar); Tailwind's md/lg variants decide which is visible, so there is no
//    viewport-width detection to get out of sync with a real resize.
//  - **The shell does not own right-rail sheet state below lg** (owner revision 2026-08-25 — no
//    persistent footer/peek bar at 600–1024): `rightRail` renders inline at lg only. Below that,
//    its content is reached through page-placed contextual triggers, each opening one rail
//    section as its own SectionSheet — that state belongs to the page, not the shell.
//  - **The one drawer the shell DOES own — `leftSecondary` below md — is gated in JS, not only
//    in CSS**: `open && useIsBelowMd()`, plus a hidden-at-md class on vaul's own overlay and
//    content. See the comment at that BottomSheet for why a wrapper <div> is never enough.
export function ConsoleShell({
  header,
  nav,
  leftSecondary,
  leftSecondaryLabel,
  rightRail,
  banner,
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
    <div className={cn('shell-root', className)}>
      {/* The chrome stack — header, console-wide banner, and the mobile-only trigger for
          `leftSecondary` — is sticky as ONE block, so the banner can never scroll out from under
          the header it belongs to. */}
      <div className="shell-chrome-stack">
        {header}
        {banner}
        {leftSecondary ? (
          <div className="shell-secondary-trigger-bar md:hidden">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={leftDrawerOpen}
              onClick={() => setLeftDrawerOpen(true)}
              // The shared `label` role, not a re-typed one. This trigger was the console's last
              // surviving uppercase label — banned outright by the console-ui skill's "Never do"
              // since the owner review of 2026-08-29. Only the hover affordance is local.
              className={cn(LABEL_CLASS, 'hover:text-ink flex items-center gap-1.5')}>
              {leftSecondaryLabel}
              <Chevron />
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 items-start">
        <div className={cn(LEFT_RAIL_CLASS, RAIL_STICKY_CLASS)}>
          <RailPanel>
            <NavSpine {...nav} />
          </RailPanel>
          {leftSecondary}
        </div>

        <main className={SHELL_CENTRE_CLASS}>{children}</main>

        {rightRail ? (
          <div className={cn(RIGHT_RAIL_CLASS, RAIL_STICKY_CLASS)}>{rightRail}</div>
        ) : null}
      </div>

      {/* Bottom navigation below md — nav, not knobs, so it is unaffected by the rail rules. */}
      <div className="shell-dock-band md:hidden">
        <NavSpine {...nav} layout="bottom-bar" />
      </div>

      {/* The left-secondary drawer carries the SAME two-layer gate SectionSheet does — it is the
          same vaul/Radix modality problem, one tier down (md, not lg):

           1. `open && isBelowMd`, not merely a hidden-at-md wrapper — plus the render-phase reset
              above, so a later resize back down does not pop a stale drawer open again with no
              fresh trigger. vaul's Drawer.Portal renders into document.body, so a class on a
              wrapping <div> never reaches the portaled overlay/content at all; and even a class
              that DID reach it would only hide the dialog visually while Radix's unconditional
              modality kept <body> non-interactive and the rest of the page aria-hidden. Leaving
              this drawer open below md and then resizing up past it froze the whole app with no
              visible cause — suppressing `open` itself is the only thing that stops that.
           2. The hidden-at-md class on the overlay and the content themselves
              (`overlayClassName`/`className`) — a static net for the frame between a real md
              crossing and the hook's listener firing. */}
      {leftSecondary ? (
        <BottomSheet
          open={leftDrawerOpen && isBelowMd}
          onOpenChange={setLeftDrawerOpen}
          title={leftSecondaryLabel}
          overlayClassName="md:hidden"
          className="bottom-14 md:hidden">
          {leftSecondary}
        </BottomSheet>
      ) : null}
    </div>
  );
}
