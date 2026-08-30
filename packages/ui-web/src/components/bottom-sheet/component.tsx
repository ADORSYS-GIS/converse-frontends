import React from 'react';
import { Drawer } from '@base-ui/react/drawer';

import { cn } from '../../cn';
import { Button } from '../button';
import type { BottomSheetProps } from './types';
import { LABEL_CLASS } from '../../lib/type-roles';
import { OVERLAY_BACKDROP_CLASS, OVERLAY_CLASS } from '../../lib/overlay';

// Contract: docs/design/console-redesign/README.md §4 BottomSheet / ADR 0009 Decision 6 — one
// drawer primitive for the console, no hand-rolled sheets. That primitive is Base UI's Drawer
// (owner decision 2026-08-29, superseding ADR 0010 Decision 2's `vaul`: Base UI shipped no drawer
// when the ADR was written, and 1.7.0 does). A standard transient modal drawer — mounts on open
// behind a muted/80 scrim, unmounts on close. Dialog semantics (focus trap, Escape, aria-modal)
// and swipe-to-dismiss are the primitive's.
//
// It takes the same two shared strings every other overlay in the library takes: the scrim is
// OVERLAY_BACKDROP_CLASS and the panel is OVERLAY_CLASS. The hairline that comes with the latter
// is the point, not a side effect — a sheet is the one overlay guaranteed to sit against
// arbitrary content, and at the viewport edge only the edge facing the page is visible anyway.
// The close affordance is the library's Button, handed to Drawer.Close through `render` so the
// dismissal is the primitive's rather than a second onClick path.
//
// Formerly also supported a peek mode (a persistent, non-modal docked panel for the compact right
// rail). That mode is gone (owner revision 2026-08-25, console-ui skill "Shape and layout"), and
// the right rail concept it served is gone too (shell revamp phase 3, 2026-08-30 — Manage and
// Admin's selection-driven detail is `DetailSheet` now, at every tier). `BottomSheet` remains the
// console's one general drawer primitive for whatever below-`lg` overflow needs one next (nav
// overflow, a future transient panel); nothing consumes it today, and that is fine — it is not
// rail-specific chrome, so it is not deleted alongside the rail concept it used to also serve.
export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  direction = 'bottom',
  className,
  portalClassName,
}: BottomSheetProps) {
  const isBottom = direction === 'bottom';

  // Base UI names the axis by the gesture that DISMISSES the sheet, not by the edge it hangs off:
  // a bottom sheet is swiped down, an edge sheet is swiped back out to the right. The value lands
  // on the popup as `data-swipe-direction`, and the panel's geometry is selected off that — so
  // the two directions are not a ternary here that has to stay in step with `direction`.
  const swipeDirection = isBottom ? 'down' : 'right';

  const titleLabel = title ? (
    <Drawer.Title className={LABEL_CLASS}>{title}</Drawer.Title>
  ) : (
    <Drawer.Title className="sr-only">Drawer</Drawer.Title>
  );

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(nextOpen) => onOpenChange(nextOpen)}
      swipeDirection={swipeDirection}>
      <Drawer.Portal className={portalClassName}>
        <Drawer.Backdrop className={OVERLAY_BACKDROP_CLASS} />
        {/* The viewport is Base UI's swipe and scroll-lock host and is required around the popup,
            but it must not become a box of its own: a full-screen viewport would swallow presses
            meant for the page. `display: contents` gives it no box at all, and the panel keeps
            its own `position: fixed`. */}
        <Drawer.Viewport className="contents">
          <Drawer.Popup className={cn('sheet-panel', OVERLAY_CLASS, className)}>
            {/* Base UI ships no grab-bar part (`Drawer.Handle` is the imperative handle object for
                detached triggers, not an element), so this is ours — which is exactly why its
                paint finally applies: nothing injects a competing unlayered rule. Rendering it
                stays conditional: an edge sheet is dragged from its edge, and a grab bar at the
                top of one means nothing. */}
            {isBottom ? <div className="sheet-handle" /> : null}
            <div className="sheet-header">
              {titleLabel}
              {/* The × reads as chrome rather than as an action — `subtle` until pointed at.
                  That pair is `sheet-header`'s, not this call site's: it is what the header's
                  trailing control IS, and stating it here made a two-part treatment that only
                  ever appears inside this one header look like a prop of the button. */}
              <Drawer.Close
                render={<Button variant="ghost" size="icon" aria-label="Close" />}>
                ×
              </Drawer.Close>
            </div>
            <Drawer.Description className="sr-only">
              {title ? `${title} drawer` : 'Drawer content'}
            </Drawer.Description>
            {/* Drawer.Content, not a plain div: it marks the scrollable region so a drag that
                starts inside the body scrolls it instead of dismissing the sheet. */}
            <Drawer.Content className="sheet-body">{children}</Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
