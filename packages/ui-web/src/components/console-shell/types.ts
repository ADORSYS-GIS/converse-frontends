import type { ReactNode } from 'react';

import type { NavSpineProps } from '../nav-spine';

export interface ConsoleShellProps {
  /** Fully composed `ConsoleHeader` (or equivalent) — sticky at the very top of the shell. */
  header: ReactNode;
  /**
   * Structured nav data, not a pre-rendered rail. `ConsoleShell` owns two renderings of the
   * same `NavSpineProps` — a vertical `NavSpine` in the left rail at `md`/`lg`, and a
   * `layout="bottom-bar"` `NavSpine` docked as a fixed bottom navigation bar below `md`
   * (console-ui skill "Shape and layout" — mobile-first ladder). Both are always in the DOM;
   * only one is visible at a time via CSS (`md:hidden` / `hidden md:flex`), so the tier switch
   * needs no JS viewport detection.
   */
  nav: NavSpineProps;
  /**
   * Secondary left-rail content stacked below the nav panel — a `SCOPE` echo or a section
   * `SubNav` (docs/design/console-redesign/README.md §3's "left rail is a stack of panels").
   * Rendered inline at `md`/`lg`. Below `md` it is not in the rail at all (there is no rail);
   * instead it is reachable from a small trigger row under the header that opens it in a vaul
   * drawer — provide `leftSecondaryLabel` alongside this to label both the trigger and the
   * drawer title.
   */
  leftSecondary?: ReactNode;
  /** Trigger label and drawer title for `leftSecondary` below `md`. Required whenever
   * `leftSecondary` is set — omitting it while `leftSecondary` is present leaves the mobile
   * trigger unlabelled. */
  leftSecondaryLabel?: string;
  /**
   * Right rail content — parameters and the action that consumes them (README §3/§10.3).
   * Persistent and inline at `lg` (never an overlay, per ADR 0008 Decision 3). Below `lg` there
   * is no shell-owned fallback for this prop at all (owner revision 2026-08-25, console-ui
   * skill "Shape and layout" — no persistent footer/peek bar at 600–1024, and no docked panel
   * below 600 either): `ConsoleShell` does not own right-rail sheet state below `lg`. Each page
   * decomposes its own right-rail sections into individually-triggered `SectionSheet`s, placed
   * in context next to the on-page element they parameterise (a filter icon in a table toolbar,
   * a view/range icon beside a chart header, …) — see the sections under `src/sections/` and the
   * full-screen compositions under `src/pages-stories/`.
   */
  rightRail?: ReactNode;
  /** Centre floor content — no card, no max-width. The document's own scroller; both rails are
   * sticky and scroll independently of it at `md`/`lg`. */
  children: ReactNode;
  className?: string;
}
