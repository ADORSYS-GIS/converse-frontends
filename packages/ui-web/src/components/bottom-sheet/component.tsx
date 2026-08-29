import React from 'react';
import { Drawer } from 'vaul';

import { cn } from '../../cn';
import { Button } from '../button';
import type { BottomSheetProps } from './types';
import { LABEL_CLASS } from '../../lib/type-roles';
import { OVERLAY_BACKDROP_CLASS, OVERLAY_CLASS } from '../../lib/overlay';

// Contract: docs/design/console-redesign/README.md §4 BottomSheet / ADR 0009 Decision 6 — vaul is
// the console's only drawer primitive; no hand-rolled sheets. A standard transient vaul modal
// drawer — mounts on open behind a muted/80 scrim, unmounts on close. Dialog semantics (focus
// trap, Escape to close, aria-modal) come from vaul's underlying Radix Dialog primitive.
//
// It now takes the same two shared strings every other overlay in the library takes: the scrim is
// OVERLAY_BACKDROP_CLASS and the panel is OVERLAY_CLASS. The hairline that comes with the latter
// is the point, not a side effect — a sheet is the one overlay guaranteed to sit against
// arbitrary content, and at the viewport edge only the edge facing the page is visible anyway.
// The close affordance is the library's Button rather than a bare element re-typing btn's mono
// face and hit area by hand.
//
// Formerly also supported a peek mode (a persistent, non-modal docked panel for the compact right
// rail — vaul snapPoints, collapsed state rendered outside Drawer.Root to sidestep a Radix
// modality bug). That mode is gone (owner revision 2026-08-25, console-ui skill "Shape and
// layout"): the compact right rail is no longer a persistent footer or peek bar at all — its
// content is reached through contextual per-section triggers (SectionSheet, each a plain
// transient modal drawer scoped to one rail section) rendered in context on the page, not docked
// chrome owned by the shell. ConsoleShell no longer renders a peek-mode BottomSheet for the right
// rail; nothing else used peek either, so it is removed here rather than left dormant.
export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  direction = 'bottom',
  className,
  overlayClassName,
}: BottomSheetProps) {
  const isBottom = direction === 'bottom';

  // Geometry is `sheet-panel`'s, selected off the `data-vaul-drawer-direction` vaul puts on this
  // element — so the two directions are not a ternary here that has to stay in step with the
  // `direction` prop passed in above.
  const contentClassName = cn('sheet-panel', OVERLAY_CLASS, className);

  // The handle's paint (and the reason it has to beat vaul's own runtime <style> with
  // `!important`) is `sheet-panel`'s `[data-vaul-handle]` branch. Rendering it stays conditional:
  // a side sheet is dragged from its edge, and a grab bar at the top of one means nothing.
  const handle = isBottom ? <Drawer.Handle /> : null;

  const titleLabel = title ? (
    <Drawer.Title className={LABEL_CLASS}>{title}</Drawer.Title>
  ) : (
    <Drawer.Title className="sr-only">Drawer</Drawer.Title>
  );

  const description = (
    <Drawer.Description className="sr-only">
      {title ? `${title} drawer` : 'Drawer content'}
    </Drawer.Description>
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={direction}>
      <Drawer.Portal>
        <Drawer.Overlay className={cn(OVERLAY_BACKDROP_CLASS, overlayClassName)} />
        <Drawer.Content className={contentClassName}>
          {handle}
          <div className="sheet-header">
            {titleLabel}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="text-subtle hover:text-ink">
              ×
            </Button>
          </div>
          {description}
          <div className="sheet-body">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
