import type { ReactNode } from 'react';

export interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `section-title` role — the record this sheet is showing detail for. */
  title: string;
  /** `meta` role — a secondary line under the title (an id, a timestamp). */
  subtitle?: string;
  /** Sticky bottom row — the sheet's actions, when it has any. */
  footer?: ReactNode;
  children: ReactNode;
}
