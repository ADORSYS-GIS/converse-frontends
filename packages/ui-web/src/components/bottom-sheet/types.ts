import type { ReactNode } from 'react';

export interface BottomSheetProps {
  /** `true` mounts the drawer behind a backdrop; `false` unmounts it (transient vaul modal). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Label shown in the header row, and used as the drawer's accessible title. */
  title?: string;
  /** Drawer content, shown while `open`. */
  children: ReactNode;
  /** Edge the drawer slides from. Defaults to `bottom`. */
  direction?: 'bottom' | 'right';
  className?: string;
  /** Extra classes for the backdrop overlay — vaul's `Drawer.Portal` renders to `document.body`
   * by default, so a CSS-tiering class on a *wrapping* element (e.g. `lg:hidden`) never reaches
   * the portaled overlay/content; a caller that needs the sheet itself hidden at a breakpoint
   * (`SectionSheet`) must pass the class here and via `className` instead. */
  overlayClassName?: string;
}
