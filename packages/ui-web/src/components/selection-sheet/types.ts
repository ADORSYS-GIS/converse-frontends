import type { ReactNode } from 'react';

export interface SelectionSheetProps {
  /**
   * Identity of the currently-selected row, or `null` when nothing is selected. Every change to a
   * non-null value opens the sheet — including the very first one, so a screen that mounts with a
   * row already selected (a deep link, a story) opens it too, not only a *later* change.
   */
  selectionKey: string | null;
  /** The rail section's heading — becomes the sheet's title, e.g. `"SELECTION"`. */
  label: string;
  children: ReactNode;
  className?: string;
}
