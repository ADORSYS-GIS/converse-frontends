import type { ReactNode } from 'react';

/**
 * The 12px structural line glyphs a contextual rail-section trigger can wear. Structural, not
 * decorative (console-ui skill) — one per kind of rail section the console actually has, kept in
 * the library so a page never hand-rolls a glyph next to a table it filters.
 */
export type SectionSheetTriggerIcon = 'view' | 'filter' | 'export' | 'scope' | 'report';

export interface SectionSheetTriggerProps {
  /** Which 12px glyph the ghost icon-button wears. */
  icon: SectionSheetTriggerIcon;
  /** Accessible name of the trigger button, e.g. `"Open filters"`. */
  triggerLabel: string;
  /** The rail section's own heading — becomes the sheet's title, e.g. `"Filters"`. */
  label: string;
  /** The rail section's content, rendered bare inside the sheet (the sheet supplies the heading). */
  children: ReactNode;
  className?: string;
  /**
   * Controlled open state. Omit both this and `onOpenChange` to keep the uncontrolled convenience
   * (the component owns the open flag itself); supply both to let the consumer own it.
   *
   * ADR 0010's "uncontrolled conveniences must always offer the controlled form" — and ADR 0011
   * is the consumer that needs it: `apps/console` keeps *which rail section is open* in the query
   * string (`?sheet=filters`), so a configured screen is linkable and Back closes the sheet. A
   * component that owns that flag internally cannot participate in that contract.
   */
  open?: boolean;
  /** Controlled counterpart to `open`. Called with the requested next state. */
  onOpenChange?: (open: boolean) => void;
}
