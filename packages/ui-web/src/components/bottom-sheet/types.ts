import type { ReactNode } from 'react';

export interface BottomSheetProps {
  /** `true` mounts the drawer behind a backdrop; `false` unmounts it (transient modal drawer). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Label shown in the header row, and used as the drawer's accessible title. */
  title?: string;
  /** A secondary line under the title — an id, a status, a scope. */
  subtitle?: string;
  /** Drawer content, shown while `open`. */
  children: ReactNode;
  /**
   * A small secondary action in the HEADER row, beside Close — e.g. `Rename` (Addition E,
   * 2026-08-30 owner round: "primary action (Rename) as a small secondary button IN THE HEADER
   * row, never a stranded footer button"). Distinct from `footer`, which is for content that
   * genuinely belongs at the sheet's foot (a decision panel's own Approve/Decline).
   */
  headerAction?: ReactNode;
  /** Sticky bottom row — the sheet's own foot-of-content actions, when it has any. */
  footer?: ReactNode;
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
   * three at once — this is the mechanism `projects-centre.tsx`/`admin-centre.tsx` rely on to keep
   * this sheet out of the DOM's interactive surface entirely at `lg`+, where the inspector rail is
   * the detail surface instead (`component.tsx`'s own doc comment). */
  portalClassName?: string;
}
