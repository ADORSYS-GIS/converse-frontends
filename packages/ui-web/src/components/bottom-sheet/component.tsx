import React, { type KeyboardEvent } from 'react';
import { Drawer } from 'vaul';

import { cn } from '../../cn';
import type { BottomSheetProps } from './types';

// Peek snap height: handle row + one line of peek content (matches the old docked bar's
// footprint). Vaul accepts a pixel-string snap point alongside the `1` (fully open) point.
const PEEK_SNAP_POINT = '96px';
const SNAP_POINTS: Array<string | number> = [PEEK_SNAP_POINT, 1];

// Contract: docs/design/console-redesign/README.md §4 `BottomSheet` / ADR 0009 Decision 6 —
// vaul is the console's only drawer primitive; no hand-rolled sheets. Two usages:
//  - With `peek`: the compact-tier (600–1024) dock for right-rail content (shell-compact.svg).
//    Stays mounted via vaul's `snapPoints` (a peek height and the full height) instead of
//    unmounting on collapse — non-modal (`modal={false}`, `dismissible={false}`), so the
//    centre content underneath stays interactive while collapsed and there is no overlay.
//    `Drawer.Handle` is aria-hidden (pointer/touch drag only per vaul), so the title doubles
//    as an explicit `aria-expanded` toggle button for keyboard/click users.
//  - Without `peek`: a standard transient vaul modal drawer — mounts on `open` behind a
//    `muted/80` overlay, unmounts on close. Dialog semantics (focus trap, Escape-to-close,
//    aria-modal) come from vaul's underlying Radix Dialog primitive; no hand-rolled a11y
//    plumbing beyond the peek mode's Escape-to-collapse (below), which vaul has no concept of
//    since that mode's Root never unmounts.
export function BottomSheet({
  open,
  onOpenChange,
  title,
  peek,
  children,
  direction = 'bottom',
  className,
}: BottomSheetProps) {
  const isBottom = direction === 'bottom';

  const contentClassName = cn(
    'fixed z-50 flex flex-col bg-surface outline-none',
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
    <Drawer.Title className="font-mono text-[10px] uppercase tracking-[.09em] text-subtle">
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

  const closeButton = open ? (
    <button
      type="button"
      aria-label="Close"
      onClick={() => onOpenChange(false)}
      className="font-mono text-sm leading-none text-subtle hover:text-ink"
    >
      ×
    </button>
  ) : null;

  if (peek) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    return (
      <Drawer.Root
        open
        direction={direction}
        modal={false}
        dismissible={false}
        snapPoints={SNAP_POINTS}
        activeSnapPoint={open ? 1 : PEEK_SNAP_POINT}
        setActiveSnapPoint={(snap) => onOpenChange(snap === 1)}
      >
        <Drawer.Portal>
          <Drawer.Content onKeyDown={handleKeyDown} className={contentClassName}>
            <div className="flex shrink-0 flex-col gap-1">
              {handle}
              <div className="flex items-center justify-between px-4 py-2">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onOpenChange(!open)}
                  className="text-left hover:text-ink"
                >
                  {titleLabel}
                </button>
                {closeButton}
              </div>
              {description}
            </div>
            {open ? (
              <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
            ) : (
              <div className="px-4 pb-3">{peek}</div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={direction}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-muted/80" />
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
