import React, { useState } from 'react';

import { SectionSheet } from '../section-sheet';
import type { SelectionSheetProps } from './types';

// Contract: console-ui skill "Shape and layout" (owner revision 2026-08-25) — "Selection-driven
// rail content (e.g. Admin's review detail) opens its sheet on row selection". Unlike
// `SectionSheetTrigger` there is no button to press: the same `onSelectRow` callback fires at
// every tier (there is only one ledger table), so the sheet's open state follows the selection.
//
// The open is adjusted **during render**, not in a `useEffect` — the React docs' own recommended
// pattern for "adjust state when a prop changes" (a conditional `setState` gated on a
// state-tracked previous value; React discards the stale render and re-renders immediately, so no
// intermediate frame is ever painted).
//
// No tier check is needed here: `SectionSheet` is itself gated by `useIsBelowLg`, which is
// precisely what stops a selection at `lg` from opening an invisible-but-fully-modal drawer and
// freezing the page (see `use-is-below-breakpoint`'s docstring for the mechanism).
export function SelectionSheet({ selectionKey, label, children, className }: SelectionSheetProps) {
  const [open, setOpen] = useState(false);
  const [previousSelectionKey, setPreviousSelectionKey] = useState<string | null>(null);

  if (selectionKey !== previousSelectionKey) {
    setPreviousSelectionKey(selectionKey);
    if (selectionKey !== null) setOpen(true);
  }

  return (
    <SectionSheet open={open} onOpenChange={setOpen} label={label} className={className}>
      {children}
    </SectionSheet>
  );
}
