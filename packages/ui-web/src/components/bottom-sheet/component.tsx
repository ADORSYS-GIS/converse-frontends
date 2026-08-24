import React from 'react';
import { Drawer } from 'vaul';

import { cn } from '../../cn';
import type { BottomSheetProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 `BottomSheet` / ADR 0009 Decision 6 —
// vaul is the console's only drawer primitive; no hand-rolled sheets. Two usages:
//
//  - With `peek`: the mobile-first dock for right-rail content (shell-compact.svg / console-ui
//    skill "Shape and layout"). Two distinct render trees, not one persistent vaul `Root`:
//      - **Collapsed** (`open` false): a plain fixed `<div>` — deliberately NOT a Dialog.
//        `vaul`'s `modal={false}` does not fully disable Radix Dialog's default modality: vaul
//        never forwards `modal` to the underlying `DialogPrimitive.Root` it wraps, so Radix's
//        `hideOthers` still runs and marks every sibling `aria-hidden` regardless (confirmed by
//        reading `vaul`'s `Root` implementation — it only uses its own `modal` value to correct
//        `document.body.style.pointerEvents` after the fact, never to change Radix's modality).
//        The result in a real page: the centre stays clickable (vaul's own correction), but
//        becomes invisible to assistive tech (Radix's correction never happens) — a real defect
//        for a rail that must stay both interactive AND accessible while merely docked.
//        Rendering the collapsed state outside vaul entirely sidesteps the bug at the source: a
//        plain WAI-ARIA disclosure button (`aria-expanded`) toggling a `peek` summary, no Dialog
//        role anywhere, so nothing hides the rest of the page.
//      - **Expanded** (`open` true): a real vaul modal drawer. Once the sheet fully covers the
//        centre, focus-trapping the rest of the page from assistive tech is correct, expected
//        bottom-sheet behaviour — so this state is allowed to be modal.
//  - Without `peek`: a standard transient vaul modal drawer — mounts on `open` behind a
//    `muted/80` overlay, unmounts on close. Dialog semantics (focus trap, Escape-to-close,
//    aria-modal) come from vaul's underlying Radix Dialog primitive.
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

  // Static, non-draggable counterpart of `Drawer.Handle` for the collapsed (non-Dialog) peek
  // state — same look, but there is no `DrawerContext` outside a `Drawer.Root` to drive a drag.
  const staticHandle = isBottom ? (
    <div className="flex justify-center pt-2">
      <div aria-hidden="true" className="h-[3px] w-8 rounded-[2px] bg-raised" />
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

  if (peek) {
    if (!open) {
      return (
        <div className={contentClassName}>
          <div className="flex shrink-0 flex-col gap-1">
            {staticHandle}
            <div className="flex items-center justify-between px-4 py-2">
              <button
                type="button"
                aria-expanded={false}
                onClick={() => onOpenChange(true)}
                className="text-left font-mono text-[10px] uppercase tracking-[.09em] text-subtle hover:text-ink"
              >
                {title}
              </button>
            </div>
          </div>
          <div className="px-4 pb-3">{peek}</div>
        </div>
      );
    }

    return (
      <Drawer.Root open onOpenChange={onOpenChange} direction={direction}>
        <Drawer.Portal>
          <Drawer.Content className={contentClassName}>
            <div className="flex shrink-0 flex-col gap-1">
              {handle}
              <div className="flex items-center justify-between px-4 py-2">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onOpenChange(false)}
                  className="text-left hover:text-ink"
                >
                  {titleLabel}
                </button>
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
