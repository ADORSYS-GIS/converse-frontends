import type { ReactNode } from 'react';

export interface BudgetSummaryReady {
  status?: 'ready';
  value: number;
  ceiling: number;
  /** Fraction (0-1) at/past which the meter turns `--signal`. Defaults to `BudgetHero`'s own 0.9. */
  threshold?: number;
  /** Inter prose caption, e.g. "account ceiling · 28% used this budget period". */
  caption: string;
}

export interface BudgetSummaryUnwired {
  status: 'unwired';
  /** Inter prose caption explaining WHY, e.g. "Budget figures arrive with the budget query wiring." */
  caption: string;
}

/** #306 — the budget-balance/usage query is in flight. See `BudgetHeroLoadingProps`. */
export interface BudgetSummaryLoading {
  status: 'loading';
}

/** #306 — the budget-balance/usage query ran and failed, distinct from `'unwired'`. See
 *  `BudgetHeroErrorProps`. */
export interface BudgetSummaryError {
  status: 'error';
  errorMessage?: string;
  onRetry?: () => void;
}

/**
 * `value`/`ceiling` are absent (not optional-and-zero) on the `'unwired'` branch — see
 * `BudgetHeroProps`'s docstring for why this is a type-level guarantee, not just a convention.
 */
export type BudgetSummary =
  BudgetSummaryReady | BudgetSummaryUnwired | BudgetSummaryLoading | BudgetSummaryError;

/**
 * The account's next budget reset (converse-frontends#451, story C8) — resolved by
 * `getEffectiveResetSchedule`, which answers with the WINNING schedule for this account
 * (account > billing_plan > global). Precedence is the backend's answer and is never recomputed
 * here, so a card can never disagree with what the scheduler will actually do.
 *
 * `'none'` is a real, explicit line ("No reset scheduled"), NOT a hidden block: the story's own
 * negative acceptance criterion says so, and for good reason — blank space beside a balance reads
 * as "it will be topped up somehow", which is exactly the belief this feature exists to replace.
 * `'unavailable'` is the separate, honest case where the read itself could not be made (no
 * `budget:read` on this session, a forbidden account) and the console must not claim either way.
 */
export type BudgetNextReset =
  | { status: 'scheduled'; /** e.g. "Next reset in 3 days → $2.00 (reset)". */ label: string }
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'unavailable'; caption: string };

/**
 * Spend over the window since the reset schedule LAST fired (owner question, 2026-09-03) — the
 * companion row to `BudgetNextReset`, and the answer to the question the hero above cannot give.
 *
 * The hero's numeral and the "Budget remaining" stat beside it are both measured over the ledger's
 * `Period` — the calendar month — because that is what the ledger itself means by `remaining`
 * (`effective_budget_micros` − month-to-date spend), and a console that redefined it would be
 * showing a number the backend would never agree with. But an operator on a $2/day reset is asking
 * "how much of TODAY's $2 is gone", which is a different window and therefore a different row.
 *
 * `'none'` renders NOTHING here, unlike `BudgetNextReset`'s own `'none'`: without a schedule the
 * phrase "since last reset" names no window at all, and a line reading "since the period started"
 * would restate the hero's own figure under a second name.
 */
export type BudgetSinceReset =
  | { status: 'ready'; /** e.g. "Spent since last reset $0.84 · 2 h ago". */ label: string }
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'unavailable'; caption: string };

export interface BudgetNeedsAttentionProject {
  name: string;
  value: number;
  ceiling: number;
  threshold?: number;
  /** Inter prose caption, e.g. "91% of ceiling · 6 days left". */
  caption: string;
  refillActionLabel?: string;
}

export interface BudgetRefillRequestStatus {
  pendingCount: number;
  /** e.g. "submitted 2 days ago". */
  submittedLabel: string;
}

export interface BudgetPanelProps {
  /** Uppercase tracked heading. Defaults to overview.svg's own wording. */
  label?: string;
  budget: BudgetSummary;
  /**
   * #306 — the account-level hero's OWN inline refill control, forwarded verbatim to
   * `BudgetHero`'s `action` slot (ADR 0008 Decision 7: "number beside its ceiling beside its
   * control"). Distinct from `needsAttentionProject`'s `onRequestRefill`/`refillActionLabel`
   * below, which is a PROJECT-scoped control for a sub-block this schema currently has no
   * project-level ceiling to populate — see `overview-usage.ts`'s module doc comment. The caller
   * decides when to render it (e.g. only once the account itself is breached), matching
   * `BudgetHeroProps.action`'s own "only present once breached" convention.
   */
  heroAction?: ReactNode;
  /**
   * The next reset line, under the hero (story C8). Unlike every other optional block on this
   * panel, `'none'` still RENDERS — see `BudgetNextReset`. Omitting the prop entirely is for a
   * caller that has not adopted schedules at all (the loading skeleton, a story predating them);
   * a caller wired to `getEffectiveResetSchedule` always passes one of the four states.
   */
  nextReset?: BudgetNextReset;
  /**
   * The "spent since last reset" row, ABOVE the next-reset line (owner question, 2026-09-03) —
   * the two read as one pair: what this cycle has drawn, then when the next one starts. See
   * `BudgetSinceReset` for why its `'none'` renders nothing where `nextReset`'s renders a line.
   */
  sinceReset?: BudgetSinceReset;
  /** Omitted entirely when no project is near its ceiling — never an empty placeholder block. */
  needsAttentionProject?: BudgetNeedsAttentionProject;
  onRequestRefill?: () => void;
  /** Omitted entirely when there is nothing pending. */
  refillRequestStatus?: BudgetRefillRequestStatus;
  onReviewInAdmin?: () => void;
  /**
   * The heading row's own trigger slot — today the standing, always-visible "Request refill…"
   * secondary action (owner, 2026-08-30: "budget refill form disappeared" — the refill control
   * used to appear ONLY past `BUDGET_BREACH_THRESHOLD`; this is what makes it reachable before
   * that). IA v3 phase 3 ("refill as a page") retargets it from a dialog to a navigation, to
   * `/accounts/<id>/refill` — distinct from `heroAction`, which stays breach-only and sits beside
   * the numeral itself (ADR 0008 Decision 7) — the two are not mutually exclusive: both navigate
   * to the same page.
   */
  actions?: ReactNode;
  className?: string;
}
