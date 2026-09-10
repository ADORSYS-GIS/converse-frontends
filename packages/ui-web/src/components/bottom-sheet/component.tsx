import React from 'react';
import { Drawer } from '@base-ui/react/drawer';

import { cn } from '../../cn';
import { useCopy } from '../../lib/copy';
import { OVERLAY_BACKDROP_CLASS, OVERLAY_CLASS } from '../../lib/overlay';
import { META_CLASS, SECTION_TITLE_CLASS } from '../../lib/type-roles';
import { Button } from '../button';
import type { BottomSheetProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 BottomSheet / ADR 0009 Decision 6 — one
// drawer primitive for the console, no hand-rolled sheets. That primitive is Base UI's Drawer
// (owner decision 2026-08-29, superseding ADR 0010 Decision 2's `vaul`). A standard transient
// modal drawer — mounts on open behind a muted/80 scrim, unmounts on close. Dialog semantics
// (focus trap, Escape, aria-modal) and swipe-to-dismiss are the primitive's.
//
// **Bottom-only, on purpose** (owner's locked layout contract, restated 2026-08-30: "3 slices:
// left rail, main content, right rail... Right rail on large screens, bottom sheet on medium and
// small. Not from sides."). This used to also support `direction: 'right'`, a side-docked edge
// sheet — that variant is DELETED, not merely unused: no side-docked drawer geometry survives
// anywhere in the console (`theme.css`'s `sheet-panel` carries only the `down` swipe-direction
// branch now). `DetailSheet` — the component that used to own the RIGHT-docked, always-420px
// version of row detail — is gone with it; every one of its former callers
// (`projects-centre.tsx`, `admin-centre.tsx`, `project-settings-centre.tsx`) renders THIS
// component instead, below `lg` only where a persistent rail isn't the detail surface
// (`portalClassName="lg:hidden"` — see `types.ts`'s own doc comment on why that prop, not a
// wrapper class, is the correct tier hook for a portalled overlay).
//
// It takes the same two shared strings every other overlay in the library takes: the scrim is
// OVERLAY_BACKDROP_CLASS and the panel is OVERLAY_CLASS. The hairline that comes with the latter
// is the point, not a side effect. The close affordance is the library's Button, handed to
// Drawer.Close through `render` so the dismissal is the primitive's rather than a second onClick
// path.
export function BottomSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  headerAction,
  footer,
  className,
  portalClassName,
}: BottomSheetProps) {
  // `Close`'s accessible name comes from the copy context (ADR 0017's ui-web contract).
  const copy = useCopy();
  const titleLabel = title ? (
    <Drawer.Title className={SECTION_TITLE_CLASS}>{title}</Drawer.Title>
  ) : (
    <Drawer.Title className="sr-only">Drawer</Drawer.Title>
  );

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(nextOpen) => onOpenChange(nextOpen)}
      swipeDirection="down">
      <Drawer.Portal className={portalClassName}>
        <Drawer.Backdrop className={OVERLAY_BACKDROP_CLASS} />
        {/* The viewport is Base UI's swipe and scroll-lock host and is required around the popup,
            but it must not become a box of its own: a full-screen viewport would swallow presses
            meant for the page. `display: contents` gives it no box at all, and the panel keeps
            its own `position: fixed`. */}
        <Drawer.Viewport className="contents">
          <Drawer.Popup className={cn('sheet-panel', OVERLAY_CLASS, className)}>
            {/* Base UI ships no grab-bar part (`Drawer.Handle` is the imperative handle object for
                detached triggers, not an element), so this is ours. Always rendered now that
                bottom is the only direction. */}
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div className="sheet-header-title">
                {titleLabel}
                {subtitle ? (
                  <Drawer.Description className={META_CLASS}>{subtitle}</Drawer.Description>
                ) : null}
              </div>
              <div className="sheet-header-actions">
                {/* Addition E (2026-08-30 owner round): "primary action (Rename) as a small
                    secondary button IN THE HEADER row, never a stranded footer button" — grouped
                    with Close, not `footer`, which stays for content that genuinely belongs at
                    the sheet's foot (a decision panel's own Approve/Decline). */}
                {headerAction}
                {/* The × reads as chrome rather than as an action — `subtle` until pointed at.
                    That pair is `sheet-header`'s, not this call site's: it is what the header's
                    trailing control IS, and stating it here made a two-part treatment that only
                    ever appears inside this one header look like a prop of the button. */}
                <Drawer.Close
                  render={<Button variant="ghost" size="icon" aria-label={copy.close} />}>
                  ×
                </Drawer.Close>
              </div>
            </div>
            {!subtitle ? (
              <Drawer.Description className="sr-only">
                {title ? `${title} drawer` : 'Drawer content'}
              </Drawer.Description>
            ) : null}
            {/* Drawer.Content, not a plain div: it marks the scrollable region so a drag that
                starts inside the body scrolls it instead of dismissing the sheet. */}
            <Drawer.Content className="sheet-body">{children}</Drawer.Content>
            {footer ? <div className="sheet-footer">{footer}</div> : null}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
