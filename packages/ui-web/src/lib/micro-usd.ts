// Micro-USD ↔ typed-USD conversion, in INTEGER MINOR UNITS ONLY (converse-frontends#451, story
// C8's own non-functional acceptance criterion, verbatim: "Given amounts are `amount_micros` on
// the wire, when the form presents currency, then conversion happens once in a tested helper using
// integer minor units — never floating-point arithmetic").
//
// ---------------------------------------------------------------------------------------------
// WHY THIS EXISTS BESIDE `parse-amount.ts`
// ---------------------------------------------------------------------------------------------
// `parse-amount.ts`'s `dollarsToMicros` does `Math.round(Number(input) * 1_000_000)` and returns a
// `number`. That is fine for the refill-policy form it was written for — every amount there is a
// small threshold that round-trips exactly through a double — but it is the wrong tool for a
// budget reset schedule for two independent reasons:
//
//  1. **The wire type is a string, not a number.** `BudgetResetSchedule.amountMicros` is a
//     `String`-carried i64 (`packages/authz-rpc/schema/authz.cstack`, and every other micro-USD
//     amount in that schema), precisely because an i64 does not fit a JS `number`. Parsing one
//     through a double and formatting it back is exactly the round trip the string carriage
//     exists to avoid.
//  2. **`x * 1_000_000` is not exact for every decimal a person can type.** `8.09 * 1e6` is
//     `8089999.999999999` in IEEE-754; `Math.round` saves that particular case, but the class of
//     bug — a typed amount that is not the amount that gets stored — is one a standing rule that
//     rewrites the whole estate's balances has no business carrying. This module never multiplies:
//     it splits the typed string on its decimal point and pads the fraction to six digits, which
//     is a STRING operation, then hands the result to `BigInt`.
//
// Both helpers therefore stay: `parse-amount.ts` owns the rule-data/facts JSON (number-shaped on
// the wire), this file owns `amountMicros` (string-shaped on the wire). Neither is a fork of the
// other — they convert to different wire types.
//
// ---------------------------------------------------------------------------------------------
// THE ONE FLOATING-POINT DIVISION IN THIS FILE, AND WHY IT IS SAFE
// ---------------------------------------------------------------------------------------------
// `microsToUsdNumber` divides by 1e6 in a double, and it is the ONLY function here that touches a
// float. It is a DISPLAY path — its result is fed to `formatUsd`, which takes a `number` because
// the console's whole money ladder does. Nothing round-trips back through it: the authoring path
// is `usdToMicros(typed) -> string`, and the prefill path is `microsToUsdInput(micros) -> string`,
// both integer-only. The division is lossless for any amount under ~$9 000 000 000 (2^53 micros)
// and the ladder's own display floor names anything it cannot state, so a figure past that renders
// as an approximation rather than a lie. If a real balance ever reaches that magnitude the fix is
// a `formatUsdMicros` on the ladder itself, not a second conversion here.

/** Micro-USD per USD. The backend's unit (`lightbridge-authz-budget`), not a display choice. */
export const MICROS_PER_USD = 1_000_000n;

/** Decimal places a micro-USD amount carries. `MICROS_PER_USD` is `10 ** MICRO_USD_DECIMALS`. */
export const MICRO_USD_DECIMALS = 6;

/** A typed USD amount: an optional sign, digits, an optional fraction of at most six digits. Six
 *  because that is the resolution the ledger stores — a seventh digit is not "rounded down", it is
 *  rejected, so nobody types an amount that silently becomes a different amount. */
const TYPED_USD = /^(-?)(\d*)(?:\.(\d{0,6}))?$/;

/**
 * `'2'` → `'2000000'`, `'0.5'` → `'500000'`, `'8.09'` → `'8090000'`, `'-1.25'` → `'-1250000'`.
 *
 * `null` — never a coerced `0` — for anything that is not a USD amount this codebase can carry
 * exactly: an empty string, letters, a thousands separator, more than six decimals, `Infinity`,
 * scientific notation. The caller renders that as a field-level validation error.
 *
 * Integer-only by construction: the fraction is PADDED to six digits as text and concatenated onto
 * the integer part, so the value never passes through a `number` at all.
 */
export function usdToMicros(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '.') return null;

  const match = TYPED_USD.exec(trimmed);
  if (!match) return null;

  const [, sign, wholePart = '', fractionPart = ''] = match;
  // `'.5'` is a legal amount (empty whole part), `'5.'` is a legal amount (empty fraction), but
  // `'.'` alone is not — already rejected above.
  const whole = wholePart === '' ? '0' : wholePart;
  const fraction = fractionPart.padEnd(MICRO_USD_DECIMALS, '0');

  const micros = BigInt(whole) * MICROS_PER_USD + BigInt(fraction);
  return `${sign}${micros.toString()}`;
}

/**
 * `'2000000'` → `'2'`, `'8090000'` → `'8.09'`, `'500000'` → `'0.5'` — the inverse, for prefilling
 * a form from a stored schedule. Trailing zeros in the fraction are trimmed (an operator editing
 * `$2.00` should see `2`, not `2.000000`), and a whole amount carries no decimal point at all.
 *
 * The empty string for an unparseable input, so a broken value renders as an empty field the
 * operator must fill rather than a fabricated `0` they might save back.
 */
export function microsToUsdInput(micros: string): string {
  const trimmed = micros.trim();
  // `BigInt('')` is `0n`, not a throw — an empty amount would otherwise prefill the form with a
  // fabricated `$0.00` the operator could save back over a real schedule.
  if (trimmed === '') return '';

  let value: bigint;
  try {
    value = BigInt(trimmed);
  } catch {
    return '';
  }

  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const whole = magnitude / MICROS_PER_USD;
  const fraction = (magnitude % MICROS_PER_USD).toString().padStart(MICRO_USD_DECIMALS, '0');
  const significantFraction = fraction.replace(/0+$/, '');

  const sign = negative ? '-' : '';
  return significantFraction === '' ? `${sign}${whole}` : `${sign}${whole}.${significantFraction}`;
}

/**
 * The DISPLAY-only bridge onto the console's money ladder (`money.ts`'s `formatUsd`, which takes a
 * `number` because every currency figure in this console does). `0` for an unparseable input —
 * unlike `microsToUsdInput`, this feeds a formatter, not a field an operator saves back, and a
 * chart cell reading `$0.00` beside a stated error is better than one reading `NaN`.
 *
 * See the module header for why this division is the one float in the file and why it is safe.
 */
export function microsToUsdNumber(micros: string | null | undefined): number {
  if (!micros) return 0;
  const parsed = Number(micros);
  return Number.isFinite(parsed) ? parsed / 1_000_000 : 0;
}
