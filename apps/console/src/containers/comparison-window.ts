/**
 * The ONE "vs previous" window helper (converse-frontends#446, decision D-F; owner Q8 confirmed
 * verbatim on 2026-09-02, AMENDED after the 2026-09-03 money incident below).
 *
 * Before this there were two half-implementations and no shared rule:
 * `usage-overview-usage.ts`'s `previousWindow` (the immediately preceding window of equal length)
 * and `admin-overview-usage.ts`'s `spendDelta` (the wording of the delta, with no say in what
 * "previous" meant). Neither knew about a reset cadence, so "vs previous" on a daily-resetting
 * account compared yesterday to the day before — a single day of spend against another, which is
 * noise, not a signal. This module states the rule once.
 *
 * **Both halves are gone now.** C4 (converse-frontends#447) deleted `spendDelta` with
 * `admin-overview-usage.ts`; C12 (converse-frontends#455) deleted `previousWindow` with
 * `usage-overview-usage.ts`, once its last two callers — the hand-written account and estate
 * overview screens — became `dashboards.yaml` entries. This module is the only "vs previous" rule
 * in the console, and every comparison on every dashboard now runs through it.
 *
 * The rule:
 *
 *  - **The current window is EXACTLY the window the page was given.** It is what the range picker
 *    says, and nothing in this module may move it. A figure printed under "1–3 Sep" is a figure
 *    about 1–3 Sep or it is a wrong number.
 *  - The comparison window is the **previous window of the SAME length**, ending exactly where the
 *    current one begins. Never overlapping, so a figure is never compared partly with itself, and
 *    never a different length, so the percentage between the two is a real ratio.
 *  - `monthly` shifts by a **calendar month** instead, so "month to date" compares against the
 *    same days of the previous month rather than against a rolling 30 days.
 *
 * **Why the one-week floor is gone (converse-frontends#448, the 2026-09-03 incident).** D-F also
 * said "at least a week", and this module implemented it by WIDENING the current window to a
 * 7-day span (`snapToCadence`, plus a weekly round-up to whole 7-day spans) and handing that
 * widened window back as `current`. `resolve-dashboard.ts` then queried the widened window for
 * every panel on the page — not just the comparing ones. On
 * `/admin/usage/actors/<account>?type=account&from=2026-09-01&to=2026-09-03` that turned a
 * $3.59 three-day total into an $11.92 seven-day one (28 Aug $2.74 + 29 Aug $0.08 + 31 Aug $5.51
 * + 1 Sep $1.39 + 2 Sep $2.20), printed under a header that said 1–3 Sep, while the Budget zone —
 * which reads the billing period directly and never went through here — correctly said $3.59.
 *
 * The floor cannot be honoured on the comparison side alone either: a 3-day current against a
 * 7-day previous makes the delta percentage a comparison of unequal spans, and
 * `resolve-dashboard.ts`'s `compareShiftMs` overlay would plot a 7-day dashed line across a 3-day
 * chart, doubling the x-domain — the exact defect that shift exists to prevent. So the floor is
 * DELETED rather than moved: a short window compares against the equally short window before it,
 * and the delta's own label now names that window by date so nobody has to guess how long "vs
 * previous" was.
 *
 * Estate-wide pages have no single actor and therefore no cadence to read — they pass `undefined`
 * and get the monthly rule, which matches the console's `mtd` default range and the budget
 * domain's own calendar-month `Period`.
 *
 * Pure and clock-free: every function takes the window it is told about. No React, no DOM.
 */

const DAY_MS = 86_400_000;

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

export interface ComparisonWindows {
  /** The current window — ALWAYS the one passed in, byte for byte. Carried on the result (rather
   *  than left implicit) so a caller reads both sides of the comparison off one object and cannot
   *  accidentally pair a previous window with some other current one. */
  current: UsageWindow;
  /** The immediately preceding window of the same length (calendar-shifted under `monthly`). */
  previous: UsageWindow;
  /** Which cadence the previous window was derived under — `monthly` is a calendar shift, the
   *  other two a plain span shift. */
  cadence: ResetCadence;
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
  // Copied, never aliased: `resolve-dashboard.ts` reads `current` back out to build every query on
  // the page, and a caller mutating the Date it passed in must not be able to move them.
  const current = { start: new Date(window.start), end: new Date(window.end) };

  if (cadence === 'monthly') {
    return {
      current,
      previous: { start: shiftMonths(current.start, -1), end: shiftMonths(current.end, -1) },
      cadence,
    };
  }

  const span = spanOf(current);
  return {
    current,
    previous: { start: new Date(current.start.getTime() - span), end: new Date(current.start) },
    cadence,
  };
}

/** UTC, no year — the delta label sits inside a stat card and the year is already in the page's
 *  own range caption. */
const DAY_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/**
 * The wording a `StatCard` delta carries: the comparison window, BY DATE.
 *
 * It used to be a cadence phrase ("vs previous week" / "vs previous month"), which said nothing
 * about how long the window actually was — and while the current window could still be silently
 * widened (see the incident above) that phrase was sometimes not even true. Naming the dates makes
 * the delta checkable against the ledger without reading this file: "12% vs Aug 25 – Aug 31".
 *
 * The END is stated INCLUSIVELY — a window ending at `2026-09-01T00:00:00Z` covers up to and
 * including 31 August, and printing "Aug 25 – Sep 1" for it would claim a day that is not in it.
 * An end that is not on a midnight boundary (an `mtd` window ends at "now") is printed as its own
 * day, which is the day it partially covers.
 */
export function comparisonLabel(previous: UsageWindow): string {
  const start = previous.start;
  const end = previous.end;
  const endMs = end.getTime();
  const inclusiveEnd = new Date(
    endMs % DAY_MS === 0 && endMs > start.getTime() ? endMs - DAY_MS : endMs
  );
  const from = DAY_LABEL.format(start);
  const to = DAY_LABEL.format(inclusiveEnd);
  return from === to ? `vs ${from}` : `vs ${from} – ${to}`;
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
