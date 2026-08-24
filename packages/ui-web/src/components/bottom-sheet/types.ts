import type { ReactNode } from 'react';

export interface BottomSheetProps {
  /**
   * Controls the sheet's state. With `peek` set, this toggles between vaul's collapsed
   * ("peek") and full snap points — the sheet stays mounted and docked throughout, which is
   * the compact-tier (600–1024) pattern for right-rail content. Without `peek`, this is a
   * standard vaul modal drawer: `true` mounts it behind a backdrop, `false` unmounts it.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Label shown in the header row, and used as the drawer's accessible title. */
  title?: string;
  /**
   * Collapsed peek content — a one-line summary shown at vaul's low snap point. When
   * provided, the sheet docks persistently via `snapPoints` instead of unmounting on close;
   * omit for a transient modal drawer that fully closes.
   */
  peek?: ReactNode;
  /** Full content — shown while `open` (or, in peek mode, at the full snap point). */
  children: ReactNode;
  /** Edge the drawer slides from. Defaults to `bottom`. */
  direction?: 'bottom' | 'right';
  className?: string;
}
