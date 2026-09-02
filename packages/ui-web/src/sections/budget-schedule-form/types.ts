import type {
  ResetScheduleCadence,
  ResetScheduleMode,
  ResetScheduleScopeKind,
} from '../../lib/reset-schedule';

/**
 * The authoring shape of a budget reset schedule (converse-frontends#451, story C8; backend
 * ADR-0032).
 *
 * EVERY FIELD IS A STRING (or a boolean) — the shape a form actually holds, not the shape the wire
 * carries. `anchor` is a `string` even though the wire field is an `Int?`, and `amount` is typed
 * USD even though the wire field is a string-carried i64 of micro-USD. `schedule-validation.ts`'s
 * `toBudgetScheduleWire` is the single crossing point, so a half-typed `anchor` of `''` can never
 * reach a `parseInt` in a component, and a typed amount never reaches the wire without going
 * through the integer-minor-unit conversion (`lib/micro-usd.ts`).
 *
 * `enabled` is here and NOT in `toBudgetScheduleWire`'s create output, deliberately: the backend's
 * `CreateBudgetResetScheduleInput` has no `enabled` field at all (a schedule is always created
 * disabled, because a misconfigured `global` one would rewrite every account's balance on its first
 * window), so on the create route the form renders a notice saying so instead of a toggle. Only
 * `updateBudgetResetSchedule` can flip it — which is what `BudgetScheduleFormProps.formMode`
 * switches on.
 */
export interface BudgetScheduleFormValue {
  name: string;
  scopeKind: ResetScheduleScopeKind;
  /** Empty for `global` — the form hides the field entirely there, and the wire builder sends
   *  `null` rather than an empty string. */
  scopeId: string;
  cadence: ResetScheduleCadence;
  /** ISO weekday `'1'`..`'7'` for weekly, day-of-month `'1'`..`'28'` for monthly, `''` for daily. */
  anchor: string;
  /** `HH:MM`, UTC. */
  runAtUtc: string;
  /** Typed USD, e.g. `'2'` / `'15.50'` — never micro-USD, never a number. */
  amount: string;
  mode: ResetScheduleMode;
  /** Edit-only; ignored on the create route (see the interface doc comment). */
  enabled: boolean;
}

/** Field-level errors, keyed by the value field they belong under. Same contract `RuleSetErrors`
 *  carries: a key present means that field renders its message; the object being empty means the
 *  form is submittable. */
export interface BudgetScheduleFormErrors {
  name?: string;
  scopeId?: string;
  anchor?: string;
  runAtUtc?: string;
  amount?: string;
}

/** One selectable billing plan, from `listBillingPlans`. */
export interface BillingPlanChoice {
  id: string;
  label: string;
}

export interface BudgetScheduleFormProps {
  value: BudgetScheduleFormValue;
  onChange: (value: BudgetScheduleFormValue) => void;
  errors?: BudgetScheduleFormErrors;
  /**
   * `create` renders the "saved disabled" notice in place of the enabled toggle — the backend
   * gives the create procedure no `enabled` field at all. `edit` renders the toggle.
   */
  formMode: 'create' | 'edit';
  /**
   * The `listBillingPlans` catalogue, for the `billing_plan` scope. Empty while it loads — the
   * picker then renders disabled rather than offering an empty menu, the same contract
   * `CreateApiKeyDialog`/`CreateProjectDialog` already use for the same catalogue.
   */
  billingPlans?: BillingPlanChoice[];
  className?: string;
}
