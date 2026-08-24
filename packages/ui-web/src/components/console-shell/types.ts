import type { ReactNode } from 'react';

/**
 * Responsive tier, computed by the consumer (docs/design/console-redesign/README.md §7):
 * - `full` — ≥1024, all three zones render, right rail is persistent.
 * - `compact` — 600–1024, right rail is NOT rendered inline; the consumer docks the same
 *   content in a `BottomSheet` rendered alongside `ConsoleShell`.
 * - `guard` — ≤600, only header + centre render. Not a design target (ADR 0008 Decision 2).
 */
export type ConsoleShellTier = 'full' | 'compact' | 'guard';

export interface ConsoleShellProps {
  tier: ConsoleShellTier;
  header: ReactNode;
  /** Left rail stack (nav spine, then a scope/sub-nav panel). Not rendered at `guard`. */
  leftRail?: ReactNode;
  /** Right rail content. Rendered inline only at `full`; ignored at `compact`/`guard`. */
  rightRail?: ReactNode;
  /** Centre floor content — no card, no max-width. */
  children: ReactNode;
  className?: string;
}
