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

  const contentClassName = cn(
    'fixed z-50 flex flex-col',
    OVERLAY_CLASS,
    isBottom
      ? 'inset-x-0 bottom-0 max-h-[85vh]'
      : 'inset-y-0 right-0 h-full w-[85vw] max-w-[320px]',
    className
  );

  // Every `!` here is beating vaul, not daisy, and it is load-bearing: vaul injects its handle
  // rule through a plain <style> element, which is UNLAYERED, and an unlayered declaration
  // outranks every layered one no matter the specificity — Tailwind emits utilities inside
  // its utilities layer. So the plain height, radius and fill this line carried until now never
  // applied at all: the computed handle was vaul's own 5px-tall #e2e2e4 bar at
  // border-radius 16px and opacity .7 — a hardcoded light-grey PILL sitting on a black sheet,
  // against both the no-pills and the no-hex-in-components rules (confirmed by reading the
  // computed style in Storybook, not by reading the class list). Marking them important is the
  // one thing that outranks an unlayered rule. Width and horizontal centring are NOT repeated:
  // vaul's own 32px and auto margins are already what the contract wants.
  const handle = isBottom ? (
    <Drawer.Handle className="bg-raised! mt-2 h-[3px]! shrink-0 rounded-[2px]! opacity-100!" />
  ) : null;

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
          <div className="flex shrink-0 items-center justify-between px-4 py-2">
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
          <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
