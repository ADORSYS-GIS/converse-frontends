// Pure logic for `BudgetScheduleForm` — validation and wire serialization — kept out of
// `component.tsx` so both are testable with no DOM (the same split `rule-set-validation.ts` uses
// one section over).
//
// The rules here MIRROR the backend's own (lightbridge-authz ADR-0032,
// `packages/authz-rpc/schema/authz.cstack`'s `BudgetResetSchedule`/`CreateBudgetResetScheduleInput`
// and their doc comments). Mirroring, not replacing: the server rejects the same states
// independently, and a form that only failed at submit time would make an operator author a whole
// standing rule before learning the anchor is out of range.
//
// The constraints, and where each comes from:
//   - `anchor` is the ISO weekday 1..7 for weekly, the day of month 1..28 for monthly, and null
//     for daily (`authz.cstack`, verbatim). 28 and not 31 so a monthly schedule never silently
//     skips February.
//   - `runAtUtc` is `HH:MM`, always UTC (`authz.cstack`).
//   - `scopeId` is null for `global` and required otherwise ("a `global` schedule must carry no
//     `scopeId` and a scoped one must" — `UpdateBudgetResetScheduleInput`'s own doc comment).
//   - `amountMicros` is a string-carried i64 — converted here, once, in integer minor units
//     (`lib/micro-usd.ts`), never by multiplying a double.

import { microsToUsdInput, usdToMicros } from '../../lib/micro-usd';
import {
  MAX_DAY_OF_MONTH,
  MIN_DAY_OF_MONTH,
  type ResetScheduleCadence,
} from '../../lib/reset-schedule';
import type { BudgetScheduleFormErrors, BudgetScheduleFormValue } from './types';

/** `HH:MM`, 24-hour, zero-padded. `24:00` and `7:30` are both rejected — the backend stores a
 *  `TIME`, and a half-formed one is a schedule that fires at a time nobody chose. */
const RUN_AT_UTC = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The default run time a blank form opens on — midnight UTC, the backend's own column default. */
export const DEFAULT_RUN_AT_UTC = '00:00';

/**
 * A fresh, empty schedule draft. `global`/`daily`/`reset` are the defaults because they are the
 * shape of the schedule this feature exists for ("everyone starts the month at $0 unless someone
 * writes a grant" — the story's own real intent), and because every one of them is a state the
 * form can then narrow: choosing a narrower scope or a longer cadence only ADDS fields, so the
 * form never starts by showing a control it then hides.
 *
 * `enabled: false` matches the backend, which creates every schedule disabled and offers no
 * `enabled` field on the create input at all.
 */
export function createBlankBudgetSchedule(): BudgetScheduleFormValue {
  return {
    name: '',
    scopeKind: 'global',
    scopeId: '',
    cadence: 'daily',
    anchor: '',
    runAtUtc: DEFAULT_RUN_AT_UTC,
    amount: '',
    mode: 'reset',
    enabled: false,
  };
}

/** Whether the anchor control renders at all — `daily` has nothing to anchor to. */
export function cadenceUsesAnchor(cadence: string): boolean {
  return cadence === 'weekly' || cadence === 'monthly';
}

/** Whether the scope-id control renders at all — `global` targets every account and carries none. */
export function scopeKindUsesScopeId(scopeKind: string): boolean {
  return scopeKind === 'billing_plan' || scopeKind === 'account';
}

/** The inclusive anchor range for a cadence, or `null` when that cadence has no anchor. */
export function anchorRange(cadence: string): { min: number; max: number } | null {
  if (cadence === 'weekly') return { min: 1, max: 7 };
  if (cadence === 'monthly') return { min: MIN_DAY_OF_MONTH, max: MAX_DAY_OF_MONTH };
  return null;
}

/** `'3'` -> `3`. `null` for anything that is not a whole number — never a coerced 0. */
function parseAnchor(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Every field-level error at once — never "first error wins", so an operator fixes the whole form
 * in one pass rather than discovering one problem per submit.
 *
 * `undefined` (not an empty object) means submittable, matching `validateRuleSet`'s contract so a
 * container can write `canSubmit = validate(value) === undefined` either way.
 */
export function validateBudgetSchedule(
  value: BudgetScheduleFormValue
): BudgetScheduleFormErrors | undefined {
  const errors: BudgetScheduleFormErrors = {};

  if (value.name.trim() === '') {
    errors.name = 'Give the schedule a name — it is how it is identified in the list.';
  }

  if (scopeKindUsesScopeId(value.scopeKind) && value.scopeId.trim() === '') {
    errors.scopeId =
      value.scopeKind === 'billing_plan'
        ? 'Choose the billing plan this schedule applies to.'
        : 'Enter the budget account id this schedule applies to.';
  }

  const range = anchorRange(value.cadence);
  if (range) {
    const anchor = parseAnchor(value.anchor);
    if (anchor === null || anchor < range.min || anchor > range.max) {
      errors.anchor =
        value.cadence === 'weekly'
          ? 'Choose the weekday this schedule fires on.'
          : `Choose a day of the month between ${range.min} and ${range.max} — later days are refused so the schedule never skips February.`;
    }
  }

  if (!RUN_AT_UTC.test(value.runAtUtc.trim())) {
    errors.runAtUtc = 'Enter a 24-hour UTC time as HH:MM, e.g. 00:00.';
  }

  const micros = usdToMicros(value.amount);
  if (micros === null) {
    errors.amount = 'Enter a USD amount, e.g. 2 or 15.50 — at most six decimal places.';
  } else if (BigInt(micros) <= 0n) {
    // A zero or negative amount is not a "reset to nothing" — for `reset` it would zero every
    // matching account, and for `top_up` it would write no-op rows forever. The backend refuses it;
    // so does this.
    errors.amount = 'Enter an amount greater than $0.00.';
  }

  return Object.keys(errors).length > 0 ? errors : undefined;
}

/**
 * The exact field set `createBudgetResetSchedule` takes, and the subset of
 * `updateBudgetResetSchedule`'s that this form authors (`enabled` is flipped from the list's own
 * toggle, and `id` is supplied by the caller — neither belongs to the form's value).
 *
 * Structural rather than importing `CreateBudgetResetScheduleInput`: `ui-web` does not depend on
 * `@lightbridge/authz-rpc`. `apps/console`'s own container passes this object straight through, so
 * a drift between the two shapes is a type error at that call site, where the generated type IS in
 * scope.
 *
 * Assumes `validateBudgetSchedule` has already passed — an unparseable amount serializes as `'0'`,
 * which the caller must never let happen for real.
 */
export interface BudgetScheduleWire {
  name: string;
  scopeKind: string;
  /** `null`, not `''`, for a global schedule — the backend distinguishes the two. */
  scopeId: string | null;
  cadence: string;
  /** `null` for daily. */
  anchor: number | null;
  runAtUtc: string;
  /** String-carried micro-USD, converted in integer minor units. */
  amountMicros: string;
  mode: string;
}

export function toBudgetScheduleWire(value: BudgetScheduleFormValue): BudgetScheduleWire {
  return {
    name: value.name.trim(),
    scopeKind: value.scopeKind,
    scopeId: scopeKindUsesScopeId(value.scopeKind) ? value.scopeId.trim() : null,
    cadence: value.cadence,
    anchor: cadenceUsesAnchor(value.cadence) ? parseAnchor(value.anchor) : null,
    runAtUtc: value.runAtUtc.trim(),
    amountMicros: usdToMicros(value.amount) ?? '0',
    mode: value.mode,
  };
}

/** The stored shape a form is prefilled from, on the edit route. Structural, same reason as
 *  `BudgetScheduleWire`. */
export interface StoredBudgetSchedule {
  name: string;
  scopeKind: string;
  scopeId?: string | null;
  cadence: string;
  anchor?: number | null;
  runAtUtc: string;
  amountMicros: string;
  mode: string;
  enabled: boolean;
}

/**
 * A stored schedule -> the form's own value shape, for `?edit=<id>`.
 *
 * Unlike the refill-policy edit route — which cannot prefill at all, there being no read API for
 * stored rule content (converse-frontends#368) — `listBudgetResetSchedules` returns every field, so
 * this is a REAL prefill and never a blank draft wearing an edit label.
 *
 * A wire value outside this form's own unions (a cadence the console does not know) falls back to
 * the blank draft's default for that one field rather than being carried into a control that
 * cannot render it. That is a lossy edit, so `budgetScheduleUnknownFields` names exactly which
 * fields were not understood and the container states it inline.
 */
export function fromStoredBudgetSchedule(stored: StoredBudgetSchedule): BudgetScheduleFormValue {
  const blank = createBlankBudgetSchedule();
  const cadence = isKnownCadence(stored.cadence) ? stored.cadence : blank.cadence;
  return {
    name: stored.name,
    scopeKind:
      stored.scopeKind === 'global' ||
      stored.scopeKind === 'billing_plan' ||
      stored.scopeKind === 'account'
        ? stored.scopeKind
        : blank.scopeKind,
    scopeId: stored.scopeId ?? '',
    cadence,
    anchor: stored.anchor != null ? String(stored.anchor) : '',
    runAtUtc: stored.runAtUtc,
    // The integer-only inverse of `usdToMicros` — see `lib/micro-usd.ts`.
    amount: microsToUsdInput(stored.amountMicros),
    mode: stored.mode === 'reset' || stored.mode === 'top_up' ? stored.mode : blank.mode,
    enabled: stored.enabled,
  };
}

/** Which stored fields this form could not represent — empty when the prefill was lossless. */
export function budgetScheduleUnknownFields(stored: StoredBudgetSchedule): string[] {
  const unknown: string[] = [];
  if (!isKnownCadence(stored.cadence)) unknown.push(`cadence "${stored.cadence}"`);
  if (stored.mode !== 'reset' && stored.mode !== 'top_up') unknown.push(`mode "${stored.mode}"`);
  if (
    stored.scopeKind !== 'global' &&
    stored.scopeKind !== 'billing_plan' &&
    stored.scopeKind !== 'account'
  ) {
    unknown.push(`scope "${stored.scopeKind}"`);
  }
  return unknown;
}

function isKnownCadence(cadence: string): cadence is ResetScheduleCadence {
  return cadence === 'daily' || cadence === 'weekly' || cadence === 'monthly';
}
