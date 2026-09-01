// Converts between what a human types into a `Field` and the integer wire shapes the budget RPC
// surface actually carries — the shared conversion `rule-set-form` and `refill-scenario-form`
// both need so a rule's threshold value and a scenario's facts agree on the same arithmetic
// `apps/console`'s own `dollarsToMicros` (`containers/use-refill-options-screen.ts`) already uses
// for `simulateBudgetPolicy`'s `requestedAmountMicros`. One definition, not two drifting copies.
//
// Every money field in the rule-data/`Facts` JSON (`packages/authz-rpc/schema/authz.cstack`'s
// `SimulateBudgetPolicyInput`, and `lightbridge-authz-budget`'s `rule_data.rs`/`facts.rs`) is an
// integer micro-USD amount; `self_service_grant_count` alone is a plain count, never micros —
// `parseNonNegativeInt` is that field's own conversion.

const MICROS_PER_DOLLAR = 1_000_000;

/** `'25.50'` -> `25500000`. `null` for anything that is not a non-negative finite number — the
 *  caller renders that as a field-level validation error rather than silently coercing it. */
export function dollarsToMicros(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * MICROS_PER_DOLLAR);
}

/** `25500000` -> `'25.5'` — the inverse, for pre-filling a form from a previously authored value. */
export function microsToDollars(micros: number): string {
  return (micros / MICROS_PER_DOLLAR).toString();
}

/** `'2'` -> `2`. `null` for anything that is not a non-negative integer — used for
 *  `self_service_grant_count`, the one threshold field that is a plain count, not an amount. */
export function parseNonNegativeInt(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '' || !/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
