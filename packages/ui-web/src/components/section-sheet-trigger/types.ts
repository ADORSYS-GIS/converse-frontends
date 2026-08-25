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
  /** The rail section's own heading — becomes the sheet's title, e.g. `"FILTERS"`. */
  label: string;
  /** The rail section's content, rendered bare inside the sheet (the sheet supplies the heading). */
  children: ReactNode;
  className?: string;
}
