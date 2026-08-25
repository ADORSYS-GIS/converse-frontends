import React, { useEffect } from 'react';

import { cn } from '../../cn';
import { BottomSheet } from '../bottom-sheet';
import { useIsBelowLg } from '../../lib/use-is-below-lg';
import type { SectionSheetProps } from './types';

// Contract: console-ui skill "Shape and layout" (owner revision 2026-08-25) — below `lg`, the
// right rail is no longer a persistent footer/peek bar. Its content is reachable through
// contextual icon-button triggers placed where they make sense on the page (a filter icon in a
// table toolbar, a view/range icon beside a chart header, …); each trigger opens the ONE rail
// section it labels — never the whole rail — as a transient `BottomSheet`, and dismisses on
// action or backdrop.
//
// `SectionSheet` is that per-section sheet: a thin wrapper around `BottomSheet` (the console's
// only drawer primitive) so a page never hand-rolls the `lg`-gating or the modal-drawer plumbing
// itself. Two independent, deliberately redundant layers keep it from ever actually opening a
// real modal dialog at `lg`, even though its trigger button is merely `lg:hidden` CSS and every
// caller is otherwise free to set `open` from whatever page-level state fits (a click handler, a
// selection-driven effect, …):
//
//  1. **`useIsBelowLg`-gated `open`** (`effectiveOpen = open && isBelowLg`, passed to
//     `BottomSheet`): this is the primary defence, and the reason it exists at all rather than
//     trusting the trigger's own `lg:hidden` CSS — a trigger cannot be *clicked* at `lg` in a
//     real browser (`display:none` removes it from hit-testing and the accessibility tree), but
//     a sheet already open below `lg` stays open in React state across a live resize up past
//     `lg` (window un-maximised, tablet rotated, …) unless something explicitly closes it. Empi-
//     rically confirmed in a real browser during this feature's own build: leaving a
//     `SectionSheet` open, then resizing past `lg` without an `isBelowLg` gate, left the
//     dialog's own CSS (`lg:hidden`, layer 2 below) correctly invisible — but Radix's
//     `Dialog.Root`, which vaul never gives its own `modal` prop to (see `BottomSheet`'s
//     history in this file's git blame / the old peek-mode docstring this replaced), still ran
//     `hideOthers()` unconditionally: `document.body` kept `pointer-events: none` and the rest
//     of the page stayed `aria-hidden`, silently freezing the entire app with no visible cause.
//     CSS visibility and Radix's modality are two independent systems; only suppressing `open`
//     itself stops the latter. The effect below also mirrors the gate back into the caller's own
//     `open` state via `onOpenChange(false)`, so a later resize back down doesn't spuriously pop
//     the sheet back open from stale `true` state with no fresh trigger/selection.
//  2. **`lg:hidden` directly on `BottomSheet`'s overlay and content** (`overlayClassName`/
//     `className` — not a wrapping `<div>`, since vaul's `Drawer.Portal` renders to
//     `document.body` by default and a class on a wrapper never reaches the portaled dialog):
//     a static safety net for the moment between a real `lg` crossing and this hook's `resize`
//     listener firing, and for any caller that ever bypasses `useIsBelowLg` (there should be
//     none, but the two layers are cheap and independent).
export function SectionSheet({ open, onOpenChange, label, children, className }: SectionSheetProps) {
  const isBelowLg = useIsBelowLg();

  useEffect(() => {
    if (open && !isBelowLg) onOpenChange(false);
  }, [open, isBelowLg, onOpenChange]);

  return (
    <BottomSheet
      open={open && isBelowLg}
      onOpenChange={onOpenChange}
      title={label}
      overlayClassName="lg:hidden"
      className={cn('lg:hidden', className)}
    >
      {children}
    </BottomSheet>
  );
}
