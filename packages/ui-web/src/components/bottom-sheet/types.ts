import type { ReactNode } from 'react';

export interface BottomSheetProps {
  /** `true` mounts the drawer behind a backdrop; `false` unmounts it (transient modal drawer). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Label shown in the header row, and used as the drawer's accessible title. */
  title?: string;
  /** Drawer content, shown while `open`. */
  children: ReactNode;
  /** Edge the drawer slides from. Defaults to `bottom`. */
  direction?: 'bottom' | 'right';
  /** Extra classes for the panel itself — geometry a caller owns, e.g. `ConsoleShell`'s
   * `bottom-14` lifting the sheet above the navigation dock. NOT the place for a tier class. */
  className?: string;
  /** Extra classes for `Drawer.Portal`'s wrapper element, and the ONLY correct hook for a tier
   * class (`lg:hidden`/`md:hidden`) on a below-`lg`-only sheet.
   *
   * `Drawer.Portal` renders to `document.body`, so a class on a wrapping element in the caller's
   * own tree never reaches the sheet — but unlike vaul's, Base UI's portal IS an element, and it
   * is the only one that covers everything the sheet puts on screen. Tiering the backdrop and the
   * panel is NOT equivalent and was the trap here: a modal `Drawer.Portal` also renders Floating
   * UI's `InternalBackdrop`, an unclassable `position: fixed; inset: 0` div that exists to absorb
   * outside presses. Hide the backdrop and the panel and that layer stays behind — an invisible,
   * full-screen click-eater over a page that looks perfectly normal. Hiding the portal takes all
   * three at once. */
  portalClassName?: string;
}
