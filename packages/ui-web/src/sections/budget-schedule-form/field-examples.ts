// Every "e.g. …" line the budget-schedule form shows (converse-frontends#451, story C8's own
// acceptance criterion: "every field carries a muted example line in the C2 style").
//
// Same closed-union-plus-Record shape `rule-set-form/field-examples.ts` established (issue #445),
// and for the same reason: an example typed inline beside its `<Field>` is invisible to the
// compiler, so the next field added to this form would simply have none and nobody would notice.
// Adding a member to `BudgetScheduleFieldName` without adding its entry here is a type error, and
// `field-examples.test.ts` asserts every entry is either a real example or an omission WITH a
// stated reason.

/** Every authorable slot on the budget-schedule create/edit surface. */
export type BudgetScheduleFieldName =
  | 'name'
  | 'scopeKind'
  | 'scopeId'
  | 'cadence'
  | 'anchor'
  | 'runAtUtc'
  | 'amount'
  | 'mode'
  | 'enabled';

/** Either the line a field shows, or a stated reason it deliberately shows none. There is no third
 *  case — a field cannot be silently example-less. */
export type FieldExample = { readonly example: string } | { readonly omitted: string };

/**
 * The anchor field is the one slot whose example depends on the cadence beside it — a weekday for
 * `weekly`, a day of month for `monthly`, and the field is not rendered at all for `daily`. A
 * single static line would be wrong two thirds of the time, so `anchorFieldExample(cadence)` below
 * supplies it and this table records why the static entry is empty.
 */
const ANCHOR_DEPENDS_ON_CADENCE =
  'Cadence-dependent — see anchorFieldExample(); a weekday for weekly, a day of month for monthly, and the field is hidden for daily.';

/**
 * `enabled` is a `Toggle`, and `Toggle` has no `example` slot (it is a two-state control whose two
 * states are its own label — there is no "value shape" to illustrate). What it needs instead is the
 * consequence stated in prose, which the form renders as its own line: see `ENABLED_EXPLANATION`.
 */
const ENABLED_IS_A_TOGGLE =
  'A two-state switch has no value shape to illustrate; ENABLED_EXPLANATION states the consequence instead.';

export const BUDGET_SCHEDULE_FIELD_EXAMPLES: Readonly<
  Record<BudgetScheduleFieldName, FieldExample>
> = {
  name: { example: 'e.g. free-plan-daily-reset' },
  scopeKind: { example: 'e.g. Every account on one billing plan' },
  scopeId: {
    example: 'e.g. acct_c9k2m4x8p1q6r3t7v0w5y2 — the budget account id, exactly as stored',
  },
  cadence: { example: 'e.g. Every day' },
  anchor: { omitted: ANCHOR_DEPENDS_ON_CADENCE },
  runAtUtc: { example: 'e.g. 00:00 — always UTC, never the operator’s local time' },
  amount: { example: 'e.g. 2 — plain USD, converted to micro-USD on save' },
  mode: { example: 'e.g. Reset remaining to the amount' },
  enabled: { omitted: ENABLED_IS_A_TOGGLE },
};

/** The line to hand a `Field`/`SelectField`'s `example` prop — `undefined` for a slot whose
 *  omission the table states a reason for. */
export function budgetScheduleFieldExample(name: BudgetScheduleFieldName): string | undefined {
  const entry = BUDGET_SCHEDULE_FIELD_EXAMPLES[name];
  return 'example' in entry ? entry.example : undefined;
}

/** The anchor field's cadence-dependent example. `undefined` for `daily`, where the field is not
 *  rendered at all. */
export function anchorFieldExample(cadence: string): string | undefined {
  if (cadence === 'weekly') return 'e.g. Monday — the schedule fires once a week, on this weekday';
  if (cadence === 'monthly') {
    return 'e.g. 1 — capped at 28 so the schedule never skips February';
  }
  return undefined;
}

/**
 * The two mode explanations, rendered together under the mode picker so an operator reads what
 * BOTH modes would do before choosing (converse-frontends#451: "mode with the two explanations").
 *
 * The `reset` wording is the owner's binding Q3 ruling stated in full — a reset lowers an
 * over-funded account as well as raising an under-funded one. That is the single most surprising
 * thing about this feature and the one an operator must not learn from a balance going down.
 */
export const MODE_EXPLANATIONS: Readonly<Record<'reset' | 'top_up', string>> = {
  reset:
    'Reset sets each matching account’s remaining budget to exactly this amount. It raises an ' +
    'account that is below the amount and lowers one that is above it — the excess is booked as a ' +
    'refund-type correction on the ledger, never deleted.',
  top_up:
    'Top up adds this amount to each matching account’s remaining budget, whatever it already is. ' +
    'It never lowers a balance, so a heavy month compounds rather than being levelled off.',
};

/** The create route's standing notice: the backend gives `createBudgetResetSchedule` no `enabled`
 *  field at all, so a new schedule cannot fire until someone enables it from the list. */
export const CREATED_DISABLED_NOTICE =
  'Saved disabled. A new schedule never fires until you enable it from the list — preview it ' +
  'first, then switch it on.';

/** The prose under the enabled toggle on the edit route. */
export const ENABLED_EXPLANATION =
  'While this is off the scheduler skips this rule entirely; no window is queued and nothing is ' +
  'written to the ledger.';
