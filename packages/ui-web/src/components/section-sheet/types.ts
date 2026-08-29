import type { ReactNode } from 'react';

export interface SectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Heading shown in the sheet header and used as its accessible title — the rail section's
   * own `RailPanel` label (`"Filters"`, `"Scope"`, …), so the sheet reads as that one section,
   * not the whole rail. */
  label: string;
  /** The rail section's own content — typically the same `RailPanel` children rendered inline
   * at `lg`. */
  children: ReactNode;
  className?: string;
}
