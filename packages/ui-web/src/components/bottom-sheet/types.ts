import type { ReactNode } from 'react';

export interface BottomSheetProps {
  /** Controls the expanded/collapsed state — the compact-tier dock for right-rail content. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Label shown next to the drag handle in both states. */
  title?: string;
  /** Collapsed peek row — a one-line summary of the docked content. */
  peek?: ReactNode;
  /** Expanded content — the same children the right rail would have rendered at `full`. */
  children: ReactNode;
  className?: string;
}
