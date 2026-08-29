import React, { useEffect } from 'react';

import { BottomSheet } from '../bottom-sheet';
import { useIsBelowLg } from '../../lib/use-is-below-breakpoint';
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
//     `lg` (window un-maximised, tablet rotated, …) unless something explicitly closes it.
//
//     WHAT CHANGED WITH BASE UI, read off a live browser on 2026-08-29 rather than carried over
//     from the old story. Under vaul the failure was `document.body` stuck at
//     `pointer-events: none` — vaul never forwarded its `modal` prop to the Radix dialog beneath
//     it, so `hideOthers()` ran unconditionally. Base UI does NOT do that: `<body>` keeps
//     `pointer-events: auto` and nothing is marked `inert`. What it does instead is render a
//     `position: fixed; inset: 0` press-absorber inside the drawer's own portal, mark the
//     siblings `aria-hidden`, and lock body scroll — for exactly the same trigger, the drawer
//     being `open`. So a sheet left open across a resize past `lg` is still a frozen page. The
//     gate is as load-bearing as it ever was; only the element you would find in devtools moved.
//
//     The effect below also mirrors the gate back into the caller's own `open` state via
//     `onOpenChange(false)`, so a later resize back down doesn't spuriously pop the sheet back
//     open from stale `true` state with no fresh trigger/selection.
//  2. **`lg:hidden` on `BottomSheet`'s `portalClassName`**: a static safety net for the moment
//     between a real `lg` crossing and this hook's `resize` listener firing, and for any caller
//     that ever bypasses `useIsBelowLg`. It goes on the portal and nowhere else — hiding the
//     backdrop and the panel individually leaves Base UI's own `InternalBackdrop` on screen, a
//     full-screen invisible press-absorber; see `BottomSheetProps.portalClassName`.
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
      portalClassName="lg:hidden"
      className={className}
    >
      {children}
    </BottomSheet>
  );
}
