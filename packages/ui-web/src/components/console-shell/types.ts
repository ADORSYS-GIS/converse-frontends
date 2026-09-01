import type { ReactNode } from 'react';

export interface ConsoleShellProps {
  /** Fully composed `ConsoleSidebar` (sections/console-sidebar) — the persistent left column at
   *  `md`+, and (internally, via the same component) the mobile bottom navigation dock below it. */
  sidebar: ReactNode;
  /** Fully composed `ConsoleTopBar` — the mobile/tablet-only 48px sticky replacement for the
   *  sidebar below `md`. */
  topBar: ReactNode;
  /**
   * The persistent right INSPECTOR rail — 280px, visible at `lg`+ only, absent entirely below it
   * (the same content lives in `DetailSheet` there). Optional, but in practice always supplied by
   * `app/(console)/layout.tsx`'s `InspectorRail` container, which never returns nothing: it
   * resolves to a selection's detail or the scope quick-settings panel, never a blank column
   * (`lib/shell-grid.ts`'s `INSPECTOR_RAIL_CLASS` doc comment — the owner's explicit condition for
   * bringing the rail back).
   */
  rail?: ReactNode;
  /**
   * The rail's current width, px — controlled, and required whenever `rail` is supplied. Owned by
   * `apps/console`'s `use-rail-width.ts` (a per-viewer `localStorage` preference, the same shape
   * `use-console-theme.ts` already establishes for the theme toggle), never by this package —
   * `packages/ui-web` stays presentational. Clamped by the caller to
   * `INSPECTOR_RAIL_MIN_WIDTH`/`INSPECTOR_RAIL_MAX_WIDTH` (`lib/shell-grid.ts`); this component
   * does not re-clamp it, since `RailResizer` (which it renders) already only ever reports a
   * clamped value.
   */
  railWidth?: number;
  /** Fires as the rail is dragged/keyboard-resized (`RailResizer`). Required whenever `rail` is
   *  supplied. */
  onRailWidthChange?: (width: number) => void;
  /**
   * A console-wide alert band, at the top of the content column — today only
   * `MutationFailureBanner` (converse-frontends#323: refine has no default visible failure path,
   * so the shell carries one slot every route gets for free). `undefined`/`null`/a component that
   * renders nothing reserves no space.
   */
  banner?: ReactNode;
  /** Centre floor content — no card, no max-width beyond the shell's own reading-measure cap. The
   * document's own scroller; the sidebar is sticky and scrolls independently of it at `md`+. */
  children: ReactNode;
  className?: string;
}
