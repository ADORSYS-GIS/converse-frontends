import type { ReactNode } from 'react';

/**
 * Per-section load status — one section failing must never take its neighbours down. Same
 * three-value vocabulary `spend-dashboard`'s `DashboardStatus` uses, minus `'unwired'`: this
 * section is only ever rendered against a query that has genuinely run (see `note` below for the
 * honesty contract it carries instead).
 */
export type BudgetPressureStatus = 'ready' | 'loading' | 'error';

export interface BudgetPressureProject {
  /** Stable identity — the project id, matching the spend chart's own series key. */
  key: string;
  /** The project's NAME, never its id (owner, 2026-08-29). */
  name: string;
  /** Spend attributed to this project over the measured period, in USD. */
  spend: number;
}

export interface BudgetPressureProps {
  /** Uppercase-free dashboard heading; defaults to this section's own wording. */
  label?: string;
  /** Rendered largest-draw first — the section sorts, so callers pass them in any order. */
  projects: BudgetPressureProject[];
  /**
   * The ceiling every row is measured against.
   *
   * `null` means no ceiling could be read at all, and rows then render their bare spend with **no
   * meter** — a track filled against a fabricated ceiling would be the exact class of invented
   * number this console refuses elsewhere (`ProjectRow.spendMtd`'s em dash, `BudgetHero`'s
   * `'unwired'` branch).
   */
  ceiling: number | null;
  /** Fraction (0–1) at/past which a row's meter turns `--signal`. Defaults to `Meter`'s own 0.9. */
  threshold?: number;
  status?: BudgetPressureStatus;
  errorMessage?: string;
  onRetry?: () => void;
  /** Inline status line shown over the still-rendered heading when no project drew anything. */
  emptyMessage?: ReactNode;
  /**
   * The scope caveat, as **DOM text** (never SVG `<text>` — console-ui skill "States").
   *
   * This section exists because the authz schema has no per-project budget ceiling: `projectQuota`
   * is a governance TIER id from an operator-configured catalogue, and `getBudgetBalance` is keyed
   * by `budgetAccountId` alone. What each row therefore shows is a project's draw on the ACCOUNT's
   * one ceiling, and the caller is expected to say so here rather than let the meters imply a
   * per-project headroom that does not exist.
   */
  note?: ReactNode;
  /** Skeleton rows rendered while `status="loading"`, matching the final row geometry. */
  loadingRowCount?: number;
  className?: string;
}
