import React, { useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import { SectionSheet } from '../section-sheet';
import type { SectionSheetTriggerIcon, SectionSheetTriggerProps } from './types';

// 12px structural line glyphs (console-ui skill: "structural, not decorative"). One per kind of
// rail section — the three copies of this set that used to live inside the page monoliths are
// gone; this is the single source.
const ICONS: Record<SectionSheetTriggerIcon, ReactNode> = {
  view: (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M1 3.5h10M1 8.5h10" strokeLinecap="round" />
      <circle cx="4" cy="3.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M1.5 2h9M3.5 6h5M5 10h2" strokeLinecap="round" />
    </svg>
  ),
  export: (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path
        d="M6 1.2v6.4M3.2 5l2.8 2.8L8.8 5M1.5 10.3h9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  scope: (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <circle cx="6" cy="6" r="4.3" />
      <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  report: (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M2 10V6M6 10V2M10 10V4" strokeLinecap="round" />
    </svg>
  ),
};

// Contract: console-ui skill "Shape and layout" (owner revision 2026-08-25) — below `lg` the
// right rail is not rendered at all, and each of its sections is reached through a contextual
// 30×30 ghost icon-button placed next to the on-page element it parameterises (a filter icon in
// the toolbar of the table it filters, a view/range icon beside the chart it configures, the
// export action near the data it exports). Activating it opens THAT ONE section — never the whole
// rail — as a transient `SectionSheet`.
//
// This owns the pair: the `lg:hidden` trigger and the sheet it controls, plus the open state
// between them. A section never needs to thread sheet state through its own props — it just takes
// the composed trigger in an `actions` slot and renders it where the mockup puts it.
//
// The trigger's `lg:hidden` is only the first of the two independent gates; `SectionSheet` itself
// carries the `useIsBelowLg` gate that stops an already-open sheet from freezing pointer events
// after a live resize past `lg` (see that component's docstring).
//
// Open state is **controllable**: pass `open`/`onOpenChange` and the consumer owns it; omit both
// and the internal `useState` below runs the uncontrolled convenience unchanged. That pairing is
// ADR 0010's rule for every uncontrolled convenience in this package, and `apps/console` is the
// consumer that needs it — ADR 0011 keeps *which rail section is open* in the query string, so the
// sheet has to be able to open from a link and close on Back.
export function SectionSheetTrigger({
  icon,
  triggerLabel,
  label,
  children,
  className,
  open: controlledOpen,
  onOpenChange,
}: SectionSheetTriggerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!controlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={triggerLabel}
        onClick={() => setOpen(true)}
        className={cn('lg:hidden', className)}>
        {ICONS[icon]}
      </Button>
      <SectionSheet open={open} onOpenChange={setOpen} label={label}>
        {children}
      </SectionSheet>
    </>
  );
}
