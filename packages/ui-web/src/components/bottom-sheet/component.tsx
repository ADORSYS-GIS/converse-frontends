import React from 'react';
import { Drawer } from 'vaul';

import { cn } from '../../cn';
import type { BottomSheetProps } from './types';
import { LABEL_CLASS } from '../../lib/type-roles';

// Contract: docs/design/console-redesign/README.md §4 `BottomSheet` / ADR 0009 Decision 6 —
// vaul is the console's only drawer primitive; no hand-rolled sheets. A standard transient vaul
// modal drawer — mounts on `open` behind a `muted/80` overlay, unmounts on close. Dialog
// semantics (focus trap, Escape-to-close, aria-modal) come from vaul's underlying Radix Dialog
// primitive.
//
// Formerly also supported a `peek` mode (a persistent, non-modal docked panel for the compact
// right rail — vaul `snapPoints`, collapsed state rendered outside `Drawer.Root` to sidestep a
// Radix modality bug). That mode is gone (owner revision 2026-08-25, console-ui skill "Shape and
// layout"): the compact right rail is no longer a persistent footer/peek bar at all — its content
// is reached through contextual per-section triggers (`SectionSheet`, each a plain transient
// modal drawer scoped to one rail section) rendered in context on the page, not docked chrome
// owned by the shell. `ConsoleShell` no longer renders a peek-mode `BottomSheet` for the right
// rail; nothing else used `peek` either, so it is removed here rather than left dormant.
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
    'fixed z-50 flex flex-col bg-surface outline-hidden',
    isBottom
      ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-[2px]'
      : 'inset-y-0 right-0 h-full w-[85vw] max-w-[320px] rounded-l-[2px]',
    className,
  );

  const handle = isBottom ? (
    <div className="flex justify-center pt-2">
      <Drawer.Handle className="h-[3px] w-8 rounded-[2px] bg-raised" />
    </div>
  ) : null;

  const titleLabel = title ? (
    <Drawer.Title className={LABEL_CLASS}>
      {title}
    </Drawer.Title>
  ) : (
    <Drawer.Title className="sr-only">Drawer</Drawer.Title>
  );

  const description = (
    <Drawer.Description className="sr-only">
      {title ? `${title} drawer` : 'Drawer content'}
    </Drawer.Description>
  );

  const closeButton = (
    <button
      type="button"
      aria-label="Close"
      onClick={() => onOpenChange(false)}
      className="font-mono text-sm leading-none text-subtle hover:text-ink"
    >
      ×
    </button>
  );

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={direction}>
      <Drawer.Portal>
        <Drawer.Overlay className={cn('fixed inset-0 z-40 bg-muted/80', overlayClassName)} />
        <Drawer.Content className={contentClassName}>
          <div className="flex shrink-0 flex-col gap-1">
            {handle}
            <div className="flex items-center justify-between px-4 py-2">
              {titleLabel}
              {closeButton}
            </div>
            {description}
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
