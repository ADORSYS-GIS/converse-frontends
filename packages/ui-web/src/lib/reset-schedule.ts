// The plain-English rendering of a budget reset schedule (converse-frontends#451, story C8;
// backend ADR-0032, lightbridge-authz#653).
//
// A schedule is six fields — `mode`, `amountMicros`, `cadence`, `anchor`, `runAtUtc`, `scopeKind`/
// `scopeId` — and a reader has to hold all six at once to know what it will do to the estate's
// balances. Six columns of raw enum values is a table nobody can read; one SENTENCE is
// ("Reset remaining to $2.00 every day at 00:00 UTC"). Story C8's acceptance criterion says so
// explicitly, and adds the reason: "the two modes are never visually ambiguous". `reset` and
// `top_up` differ by one word in an enum column and by their entire verb in a sentence.
//
// It lives in `lib/` rather than inside a section because FOUR surfaces render the same facts and
// must never phrase them differently: the `/admin/budget-schedules` ledger, the schedule form's
// own mode explanation, the account Budget card's "next reset" line, and `/admin/overview`'s
// budget-pressure rows. One builder, one wording.
//
// EVERY WIRE FIELD IS A PLAIN STRING. `scopeKind`/`cadence`/`mode` carry the exact strings their
// Rust enums render (`authz.cstack`'s own note on `BudgetResetSchedule`), so nothing here trusts
// them to be one of the known values: an unrecognised cadence renders a sentence that NAMES the
// raw value rather than silently picking a branch. A console that quietly reads an unknown
// cadence as "daily" would be describing a schedule that does something else.

import { formatUsd } from './money';
import { microsToUsdNumber } from './micro-usd';

/** The three cadences the backend's `Cadence` enum renders. */
export const RESET_SCHEDULE_CADENCES = ['daily', 'weekly', 'monthly'] as const;
export type ResetScheduleCadence = (typeof RESET_SCHEDULE_CADENCES)[number];

/** The two modes the backend's `ResetMode` enum renders. */
export const RESET_SCHEDULE_MODES = ['reset', 'top_up'] as const;
export type ResetScheduleMode = (typeof RESET_SCHEDULE_MODES)[number];

/** The three scopes the backend's `ScheduleScopeKind` enum renders. */
export const RESET_SCHEDULE_SCOPE_KINDS = ['global', 'billing_plan', 'account'] as const;
export type ResetScheduleScopeKind = (typeof RESET_SCHEDULE_SCOPE_KINDS)[number];

/** The lowest day-of-month a monthly schedule may anchor on. */
export const MIN_DAY_OF_MONTH = 1;

/**
 * The highest day-of-month a monthly schedule may anchor on — 28, the backend's own constraint
 * (`authz.cstack`: "the day of month (1..28) for a monthly one"). February is why: a schedule
 * anchored on the 30th would simply not fire in a 28-day month, which is a standing rule that
 * silently skips a period rather than a rule that says what it does.
 */
export const MAX_DAY_OF_MONTH = 28;

/** ISO weekday numbering (1 = Monday … 7 = Sunday), matching the backend's `anchor` for a weekly
 *  cadence. Index 0 is unused so `WEEKDAY_NAMES[anchor]` reads directly. */
const WEEKDAY_NAMES = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** The weekday options a weekly schedule's anchor picker offers, ISO-numbered. */
export const WEEKDAY_OPTIONS: readonly { value: string; label: string }[] = WEEKDAY_NAMES.slice(
  1
).map((label, index) => ({ value: String(index + 1), label }));

/** The day-of-month options a monthly schedule's anchor picker offers — 1..28, never 29..31. */
export const DAY_OF_MONTH_OPTIONS: readonly { value: string; label: string }[] = Array.from(
  { length: MAX_DAY_OF_MONTH },
  (_, index) => ({ value: String(index + 1), label: String(index + 1) })
);

export function isResetScheduleCadence(value: string): value is ResetScheduleCadence {
  return (RESET_SCHEDULE_CADENCES as readonly string[]).includes(value);
}

export function isResetScheduleMode(value: string): value is ResetScheduleMode {
  return (RESET_SCHEDULE_MODES as readonly string[]).includes(value);
}

export function isResetScheduleScopeKind(value: string): value is ResetScheduleScopeKind {
  return (RESET_SCHEDULE_SCOPE_KINDS as readonly string[]).includes(value);
}

/**
 * The subset of `BudgetResetSchedule` a sentence is built from. Structural on purpose: `ui-web`
 * never imports `@lightbridge/authz-rpc` (the generated client is an `apps/*` dependency), and a
 * Storybook fixture is not a wire response.
 */
export interface ResetScheduleFacts {
  cadence: string;
  anchor?: number | null;
  /** `HH:MM`, always UTC. */
  runAtUtc: string;
  /** Micro-USD, string-carried (an i64 does not fit a JS number). */
  amountMicros: string;
  mode: string;
}

/** The scope half of a schedule, for `resetScheduleScopeSentence`. */
export interface ResetScheduleScope {
  scopeKind: string;
  scopeId?: string | null;
}

/**
 * "Reset remaining to $2.00" / "Add $15.00" — the verb, and why the two are worded this far apart.
 *
 * `reset` is not "grant $2.00": under the owner's binding ruling (2026-09-02, Q3) it CLAMPS BOTH
 * WAYS — an account already above the amount is booked a negative, `correction`-source row so its
 * remaining lands exactly on the target. "Reset remaining TO" is the only phrasing that says that;
 * "Grant $2.00" would describe the opposite of what a reset does to an over-funded account.
 *
 * `top_up` reads "Add" rather than "Top up $15.00" so the two verbs share no prefix — a reader
 * scanning a column of sentences separates them on the first word.
 */
export function resetScheduleModePhrase(mode: string, amountMicros: string): string {
  const amount = formatUsd(microsToUsdNumber(amountMicros));
  if (mode === 'reset') return `Reset remaining to ${amount}`;
  if (mode === 'top_up') return `Add ${amount}`;
  // An unknown mode names itself rather than guessing at a verb.
  return `Apply ${amount} (unrecognised mode "${mode}")`;
}

/** "reset" / "top up" — the parenthetical a "next reset" line carries. */
export function resetScheduleModeWord(mode: string): string {
  if (mode === 'reset') return 'reset';
  if (mode === 'top_up') return 'top up';
  return mode;
}

/** "every day at 00:00 UTC" / "every Monday at 06:00 UTC" / "on day 1 of each month at 00:00 UTC". */
function cadencePhrase(
  cadence: string,
  anchor: number | null | undefined,
  runAtUtc: string
): string {
  const at = `at ${runAtUtc} UTC`;
  if (cadence === 'daily') return `every day ${at}`;
  if (cadence === 'weekly') {
    const name = anchor != null ? WEEKDAY_NAMES[anchor] : undefined;
    // A weekly schedule with no (or an out-of-range) anchor is a backend state this console cannot
    // describe. Say so instead of picking Monday.
    return name ? `every ${name} ${at}` : `every week ${at} (weekday not set)`;
  }
  if (cadence === 'monthly') {
    return anchor != null
      ? `on day ${anchor} of each month ${at}`
      : `each month ${at} (day not set)`;
  }
  return `on an unrecognised cadence "${cadence}" ${at}`;
}

/**
 * The whole schedule as one sentence — the ledger's cadence cell:
 *
 *     Reset remaining to $2.00 every day at 00:00 UTC
 *     Add $15.00 every Monday at 06:00 UTC
 *     Reset remaining to $2.00 on day 1 of each month at 00:00 UTC
 */
export function resetScheduleCadenceSentence(schedule: ResetScheduleFacts): string {
  const verb = resetScheduleModePhrase(schedule.mode, schedule.amountMicros);
  return `${verb} ${cadencePhrase(schedule.cadence, schedule.anchor, schedule.runAtUtc)}`;
}

/**
 * "All accounts" / "Plan free" / "Account northwind-ai" — the scope cell.
 *
 * `label` is the caller's resolved human name for `scopeId` (a billing plan's name from
 * `listBillingPlans`, an account's from `resolveActorLabels`). When it is absent the id itself is
 * shown: an unresolvable id is a real state, and a blank cell would read as "global", which is the
 * single most dangerous thing this column could get wrong.
 */
export function resetScheduleScopeSentence(scope: ResetScheduleScope, label?: string): string {
  const id = scope.scopeId ?? '';
  if (scope.scopeKind === 'global') return 'All accounts';
  if (scope.scopeKind === 'billing_plan') return `Plan ${label ?? id ?? ''}`.trimEnd();
  if (scope.scopeKind === 'account') return `Account ${label ?? id ?? ''}`.trimEnd();
  return `Unrecognised scope "${scope.scopeKind}"`;
}

/**
 * "in 3 days" / "in 6 h" / "in 45 min" / "now" / "overdue" — the forward-looking twin of
 * `apps/console`'s own `relativeAge` (`containers/refill-rows.ts`), which only ever phrases the
 * past. Whole units, no date library.
 *
 * `overdue` is a real, reportable state, not an error: a schedule whose `nextRunAt` has passed is
 * one the scheduler has not reached yet (a deferred account, a restarted process), and saying
 * "in -2 h" or silently clamping to "now" would both hide that.
 */
export function relativeWhen(iso: string, now: number): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return 'unknown';

  const seconds = Math.round((timestamp - now) / 1000);
  if (seconds < -60) return 'overdue';
  if (seconds <= 60) return 'now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.floor(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

/** What `resetScheduleNextRunLabel` needs: when it fires, and what it will do when it does. */
export interface ResetScheduleNextRun {
  nextRunAt: string;
  amountMicros: string;
  mode: string;
}

/**
 * "Next reset in 3 days → $2.00 (reset)" — the line every surface showing a budget also shows.
 *
 * The mode is stated in the parenthetical even though the label opens with the word "reset",
 * because the two are different claims: "next reset" names the EVENT (the schedule's next window),
 * the parenthetical names what that event does to the balance. A `top_up` schedule reads
 * "Next reset in 3 days → $15.00 (top up)", which is deliberately a little awkward — it is the
 * wording the story's acceptance criterion fixes ("next reset: <date> → $X"), and the
 * parenthetical is what stops it being wrong.
 */
export function resetScheduleNextRunLabel(next: ResetScheduleNextRun, now: number): string {
  const amount = formatUsd(microsToUsdNumber(next.amountMicros));
  return `Next reset ${relativeWhen(next.nextRunAt, now)} → ${amount} (${resetScheduleModeWord(next.mode)})`;
}

/** Shown wherever a budget is displayed and NO enabled schedule covers the account — an explicit
 *  line, never blank space (story C8's own negative acceptance criterion). */
export const NO_RESET_SCHEDULED_LINE = 'No reset scheduled';

/**
 * The honesty caption `/admin/budget-schedules` carries, verbatim from the story's non-functional
 * acceptance criterion. It is not decoration: `docs/governance-model-and-enforcement.md:540-551`
 * records that the ledger is not wired to per-request enforcement at all — live 429s come from
 * Envoy plan buckets — so an operator who reads "reset" as "lifts my rate limit" is wrong until
 * lightbridge-authz Phase 6a lands, and nothing on this screen would otherwise tell them.
 */
export const RESET_SCHEDULE_ENFORCEMENT_CAPTION =
  'Schedules change the ledger balance and the minted budget tier; gateway rate limits still ' +
  'follow the plan buckets until lightbridge-authz Phase 6a lands.';

// ── Forcing the next execution onto a date (backend ADR-0032's 2026-09-03 amendment) ──────────
//
// `nextRunAt` is now an optional input on `createBudgetResetSchedule`/`updateBudgetResetSchedule`.
// Set it and the backend stores that instant VERBATIM instead of computing one from the cadence,
// which means a stored `nextRunAt` can legitimately sit OFF the cadence grid. That is the whole
// reason these three helpers exist: a console that rendered a forced 2026-09-15T09:30Z window
// beside the sentence "every day at 00:00 UTC" would be stating two facts that contradict each
// other, and the reader has no way to tell which one the scheduler will honour.
//
// A forced window is also a ONE-OFF — once it fires the schedule returns to its own grid at its own
// `runAtUtc` — so "forced" is a marker on THIS row's next run, never a property of the schedule.

/** `HH:MM`, UTC, from an instant. */
function utcHourMinute(when: Date): string {
  const hours = String(when.getUTCHours()).padStart(2, '0');
  const minutes = String(when.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** ISO weekday, 1 = Monday … 7 = Sunday — the numbering the backend's weekly `anchor` uses. */
function isoWeekday(when: Date): number {
  return ((when.getUTCDay() + 6) % 7) + 1;
}

/** The cadence half of a schedule — what decides where its windows land. */
export interface ResetScheduleGrid {
  cadence: string;
  anchor?: number | null;
  /** `HH:MM`, always UTC. */
  runAtUtc: string;
}

/**
 * Whether `nextRunAt` is a window the schedule's OWN cadence would have produced.
 *
 * `false` means an operator forced this one window onto a date of their choosing. The console says
 * so rather than letting the reader infer a cadence that does not exist.
 *
 * Every ambiguous case answers `true` — an unparseable instant, a cadence this console does not
 * know, a weekly/monthly schedule with no anchor. Claiming "forced" is a claim about what an
 * operator did, and this function only makes it when it can actually tell.
 */
export function isOnResetScheduleGrid(grid: ResetScheduleGrid, nextRunAt: string): boolean {
  const when = new Date(nextRunAt);
  if (Number.isNaN(when.getTime())) return true;
  if (!isResetScheduleCadence(grid.cadence)) return true;
  // A grid window is minute-granular: the backend's `run_at_utc` is a `TIME` the console renders
  // as `HH:MM`, and every window it computes lands exactly on it.
  if (when.getUTCSeconds() !== 0 || when.getUTCMilliseconds() !== 0) return false;
  if (utcHourMinute(when) !== grid.runAtUtc.trim().slice(0, 5)) return false;
  if (grid.cadence === 'daily') return true;
  if (grid.anchor == null) return true;
  return grid.cadence === 'weekly'
    ? isoWeekday(when) === grid.anchor
    : when.getUTCDate() === grid.anchor;
}

/** The one word a next-run cell adds when its window is not on the cadence grid. */
export const FORCED_WINDOW_MARKER = 'forced';

/**
 * The next-run cell for one schedule: `"in 6 h"`, `"in 12 days · forced"`, or `"paused"`.
 *
 * A DISABLED schedule has a stored `nextRunAt` the scheduler will never reach, so it reads
 * "paused" — rendering "in 6 h" would promise a run that is not going to happen, forced or not.
 */
export function resetScheduleNextRunCell(
  schedule: ResetScheduleGrid & { nextRunAt: string; enabled: boolean },
  now: number
): string {
  if (!schedule.enabled) return 'paused';
  const when = relativeWhen(schedule.nextRunAt, now);
  return isOnResetScheduleGrid(schedule, schedule.nextRunAt)
    ? when
    : `${when} · ${FORCED_WINDOW_MARKER}`;
}

/**
 * `2026-09-15T09:30:00Z` → `"2026-09-15 09:30 UTC"` — the absolute instant, spelled out.
 *
 * Used where a reader needs the DATE rather than a distance from now: the form's "currently …"
 * line, and the preview sheet's timing row. A table cell keeps `relativeWhen`, because a column of
 * absolute UTC timestamps is a subtraction the reader has to do for every row.
 */
export function formatUtcInstant(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return iso;
  const date = when.toISOString().slice(0, 10);
  return `${date} ${utcHourMinute(when)} UTC`;
}

/**
 * `2026-09-15T09:30:00Z` → `"2026-09-15T09:30"`, the value shape an `<input type="datetime-local">`
 * holds.
 *
 * The control has no time zone of its own — its value is a NAIVE local date-time string, and the
 * browser renders it in the viewer's zone. This console reads and writes it as UTC and labels the
 * field so, which is the only honest option here: the backend stores UTC, `runAtUtc` beside it is
 * UTC, and a form mixing the operator's local zone into one of two adjacent time fields would be
 * the worst of both.
 */
export function isoToDatetimeLocalUtc(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '';
  return `${when.toISOString().slice(0, 10)}T${utcHourMinute(when)}`;
}

/** The value shape `<input type="datetime-local">` holds — seconds optional. */
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/**
 * The inverse: `"2026-09-15T09:30"` (read as UTC) → `"2026-09-15T09:30:00.000Z"`.
 *
 * `null` for an empty or unparseable value — empty is the ordinary case ("let the cadence decide"),
 * and the caller sends `null` on the wire rather than a string the backend would have to guess at.
 */
export function datetimeLocalUtcToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!DATETIME_LOCAL.test(trimmed)) return null;
  // The control omits seconds unless its `step` asks for them; append them rather than letting
  // `Date` guess, so the only thing appended to the string is the `Z` that pins it to UTC.
  const parsed = new Date(`${trimmed.length === 16 ? `${trimmed}:00` : trimmed}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
