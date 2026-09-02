/**
 * The ONE "vs previous" window helper (converse-frontends#446, decision D-F; owner Q8 confirmed
 * verbatim on 2026-09-02).
 *
 * Before this there were two half-implementations and no shared rule:
 * `usage-overview-usage.ts`'s `previousWindow` (the immediately preceding window of equal length)
 * and `admin-overview-usage.ts`'s `spendDelta` (the wording of the delta, with no say in what
 * "previous" meant). Neither knew about a reset cadence, so "vs previous" on a daily-resetting
 * account compared yesterday to the day before — a single day of spend against another, which is
 * noise, not a signal. This module states the rule once.
 *
 * **C4 (converse-frontends#447) deleted `spendDelta` with `admin-overview-usage.ts`.**
 * `previousWindow` is still standing, and deliberately so: `use-overview-screen.ts` and
 * `use-usage-overview-screen.ts` are its two remaining callers, and both are hand-written screens
 * C12 migrates onto this engine. Deleting it here would have meant rewriting two screens outside
 * this story's scope; it goes when its last caller does.
 *
 * The rule, in the owner's words ("vs previous per reset period and at least a week"):
 *
 *  - The comparison window is the **previous window of the SAME length** as the current one, ending
 *    exactly where the current one begins. Never overlapping, so a figure is never compared partly
 *    with itself.
 *  - The current window is first **snapped to the actor's reset cadence** when one is known:
 *    `weekly` → whole 7-day spans, `monthly` → the same span shifted back one calendar month (so
 *    "month to date" compares against the same days of the previous month, not against a rolling
 *    30 days), `daily` → widened, because…
 *  - …**the minimum comparison span is one week.** A one-day window compared with the day before
 *    tells an operator nothing about a trend; a daily-resetting actor's comparison widens to the
 *    trailing 7 days on both sides.
 *
 * Estate-wide pages have no single actor and therefore no cadence to read — they pass `undefined`
 * and get the monthly rule, which matches the console's `mtd` default range and the budget
 * domain's own calendar-month `Period`.
 *
 * Pure and clock-free: every function takes the window it is told about. No React, no DOM.
 */

export interface UsageWindow {
  start: Date;
  end: Date;
}

/** The reset cadences a `budget_reset_schedules` row can carry (decision D-C). `undefined` at a
 *  call site means "no schedule resolved" — see `DEFAULT_COMPARISON_CADENCE`. */
export type ResetCadence = 'daily' | 'weekly' | 'monthly';

/** What an estate-wide page (or an actor with no schedule) compares on. The budget domain's own
 *  period is a calendar month, and `mtd` is the console's default range, so month is the honest
 *  fallback rather than an arbitrary rolling span. */
export const DEFAULT_COMPARISON_CADENCE: ResetCadence = 'monthly';

const DAY_MS = 86_400_000;

/** The owner's floor: "at least a week". A shorter current window is widened before comparing. */
export const MIN_COMPARISON_SPAN_MS = 7 * DAY_MS;

export interface ComparisonWindows {
  /** The current window, after cadence snapping and the one-week floor. May be WIDER than the
   *  window passed in — the caller must query this one, not the original, or the two sides are
   *  not the same length. */
  current: UsageWindow;
  /** The immediately preceding window of the same length. */
  previous: UsageWindow;
  /** Which cadence the snap was performed against — drives the delta's wording. */
  cadence: ResetCadence;
  /** `true` when the current window was widened to meet the one-week floor, so a caller can say
   *  so rather than silently reporting a different window than the picker shows. */
  widened: boolean;
}

/**
 * The comparison pair for `window` under `cadence`.
 *
 * `monthly` is the one cadence whose previous window is not a fixed millisecond shift: months are
 * 28–31 days long, so "the same days of the previous month" is computed on the calendar, and the
 * previous window is therefore not always exactly as long as the current one. That is the honest
 * reading of "vs previous month" and the one the budget period itself uses — a 30-day shift would
 * compare 1–15 March against 30 January–13 February.
 */
export function comparisonWindow(
  window: UsageWindow,
  cadence: ResetCadence = DEFAULT_COMPARISON_CADENCE
): ComparisonWindows {
  const current = snapToCadence(window, cadence);
  const widened = current.end.getTime() - current.start.getTime() > spanOf(window);

  if (cadence === 'monthly') {
    return {
      current,
      previous: { start: shiftMonths(current.start, -1), end: shiftMonths(current.end, -1) },
      cadence,
      widened,
    };
  }

  const span = spanOf(current);
  return {
    current,
    previous: { start: new Date(current.start.getTime() - span), end: new Date(current.start) },
    cadence,
    widened,
  };
}

/**
 * The current window as the comparison will actually read it — always ending where the picker's
 * window ends (an operator's "now" is not negotiable), only the START moves.
 *
 *  - `daily` — never compares one day with the day before: widened to the trailing 7 days.
 *  - `weekly` — rounded UP to a whole number of 7-day spans, so "the last full week vs the week
 *    before" is a real week-on-week reading rather than a 9-day span against another 9-day span.
 *  - `monthly` — left as it is. `mtd` is deliberately a PARTIAL month, and the previous window is
 *    the same partial span of the previous month (`comparisonWindow`'s calendar shift), which is
 *    exactly the "same-day-of-previous-month" comparison D-F asks for.
 *
 * The one-week floor applies under every cadence: a hand-typed `?from=&to=` span of two days is
 * still two days whatever the actor resets on, and the floor is about the comparison being
 * meaningful, not about the cadence.
 */
export function snapToCadence(window: UsageWindow, cadence: ResetCadence): UsageWindow {
  const span = spanOf(window);
  const floored = Math.max(span, MIN_COMPARISON_SPAN_MS);
  // `daily` and `monthly` differ only in how the PREVIOUS window is derived (a fixed shift vs a
  // calendar-month shift, in `comparisonWindow`); neither changes the current window's length
  // beyond the floor. Only `weekly` rounds, and only ever upward — never truncating a 30-day
  // selection down to a week.
  const snapped =
    cadence === 'weekly'
      ? Math.ceil(floored / MIN_COMPARISON_SPAN_MS) * MIN_COMPARISON_SPAN_MS
      : floored;

  if (snapped === span) return { start: new Date(window.start), end: new Date(window.end) };
  return { start: new Date(window.end.getTime() - snapped), end: new Date(window.end) };
}

/** The wording a `StatCard` delta carries, stating the window explicitly rather than the vague
 *  "vs prev period" the old per-container helpers used — the AC's "+12% vs previous week". */
export function comparisonLabel(cadence: ResetCadence): string {
  switch (cadence) {
    case 'daily':
    case 'weekly':
      return 'vs previous week';
    case 'monthly':
      return 'vs previous month';
  }
}

function spanOf(window: UsageWindow): number {
  return Math.max(window.end.getTime() - window.start.getTime(), 0);
}

/**
 * Calendar-month shift in UTC, clamping the day of month so 31 March − 1 month is 28/29 February
 * rather than JavaScript's own silent roll-forward into March.
 */
function shiftMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(day, lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}
