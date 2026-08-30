import type { ReactNode } from 'react';

export interface ConsoleShellProps {
  /** Fully composed `ConsoleSidebar` (sections/console-sidebar) — the persistent left column at
   *  `md`+, and (internally, via the same component) the mobile bottom navigation dock below it. */
  sidebar: ReactNode;
  /** Fully composed `ConsoleTopBar` — the mobile/tablet-only 48px sticky replacement for the
   *  sidebar below `md`. */
  topBar: ReactNode;
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
