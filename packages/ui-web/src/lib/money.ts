// Money formatting — console-ui skill §2.2 / docs/design/console-redesign/README.md §2.2:
// "Numeric columns are right-aligned; the mono family makes the digits line up as a ledger.
// Thousands use a thin space ($1 131.80)."
//
// The unit is USD, everywhere, always. No cents, no micro-USD, no per-screen unit switching —
// a reader comparing a project's spend against its ceiling must never do a mental conversion
// between the two halves of the same sentence. What varies is the number of DECIMALS, not the
// unit.
//
// ---------------------------------------------------------------------------------------------
// THE PRECISION LADDER, AND WHY
// ---------------------------------------------------------------------------------------------
// Production reality that forced this: an account whose real spend is $0.006338 against a $12.00
// ceiling. The previous fixed-2dp rule rendered that as `$0.01` — and a hair below it, as
// `$0.00`. A spend report that prints `$0.00 of $12.00` for an account that genuinely spent money
// is not "imprecise", it reports nothing. Sub-cent amounts are a normal, correct state here (the
// gateway meters per-token cost in micro-USD), not an error to be clamped away.
//
// The rule, in one sentence:
//
//     Always show at least two decimals; extend past two only until the first TWO SIGNIFICANT
//     DIGITS are visible; never go past six decimals; trim the padding zeros the extension
//     introduced.
//
// Worked through the magnitudes that actually occur:
//
//     1131.8      -> $1 131.80    two decimals already carry six significant digits
//        12.4     -> $12.40       "
//         1.0     -> $1.00        "
//         0.5     -> $0.50        two decimals already carry two significant digits
//         0.03    -> $0.03        extension to 3dp gives `0.030`; the pad zero is trimmed back
//         0.034567-> $0.035       3dp is where the second significant digit lands — no more
//         0.006338-> $0.0063      4dp. THE production value. Legible beside `$12.00`.
//         0.001   -> $0.001       4dp `0.0010`, pad trimmed
//         0.00012345 -> $0.00012  5dp
//         0.0000004  -> <$0.000001  below the six-decimal display floor: named, not rounded to $0
//         0        -> $0.00       exact zero is exact; it needs no extension
//
// Why two significant digits and not three: three would print the production value as
// `$0.006338 of $12.00` — the small side then carries four more digits than the ceiling it is
// being compared against, and the pair stops reading as a comparison and starts reading as two
// unrelated facts. Two digits is the least that answers "how much of the ceiling is this?" —
// `$0.0063` vs `$0.0064` is a distinction nobody consuming a spend dashboard acts on, while
// `$0.0063` vs `$0.06` very much is.
//
// Why a floor of two decimals rather than trimming everything: `$12.4` and `$0.5` read as
// truncated, not as money. Cents are the convention the reader arrives with; the ladder extends
// past it, never retreats behind it.
//
// Why trim the extension's pad zeros: `$12.4000` is exactly as bad as `$0.00`. One hides a
// digit, the other invents four. The trim only ever removes zeros the extension itself added —
// it can never take a value below two decimals.
//
// Why per-value and not harmonised across a pair: `formatUsdOf(0.006338, 12)` deliberately
// prints `$0.0063 of $12.00`, with different decimal counts on either side, rather than forcing
// the ceiling to `$12.0000`. Padding the ceiling to match adds four digits that carry no
// information about the ceiling, which is the trailing-zero noise this ladder exists to avoid.
//
// The cost, stated plainly: adaptive decimals mean a column of amounts spanning magnitudes no
// longer decimal-aligns. That is unavoidable for any adaptive scheme, and it is the trade this
// codebase chose — a legible sub-cent figure beats a tidy column of `$0.00`.
//
// Locale: this file stays hand-rolled rather than reaching for `Intl.NumberFormat`, because the
// console's typographic contract is a THIN SPACE thousands separator (§2.2 above), which no
// `en-US` locale produces — `Intl` gives `$1,234.00`. There is exactly one currency convention in
// this codebase and it lives here; do not introduce a second.

const THIN_SPACE = ' ';

/** Cents — the convention the reader arrives with. The ladder extends past it, never behind it. */
const MIN_DECIMALS = 2;

/** Six decimals is micro-USD, the resolution the usage backend meters at. Below it we cannot
 *  claim a figure at all, so `USD_DISPLAY_FLOOR` names the state instead of rounding it to $0. */
const MAX_DECIMALS = 6;

/** How many significant digits a small amount must show before the ladder stops extending. */
const SIGNIFICANT_DIGITS = 2;

/** The smallest amount this formatter can state. Anything non-zero below it renders as
 *  `<$0.000001` — an honest "smaller than we can say", never a fabricated `$0.00`. */
export const USD_DISPLAY_FLOOR = 10 ** -MAX_DECIMALS;

const BELOW_FLOOR = `<$${USD_DISPLAY_FLOOR.toFixed(MAX_DECIMALS)}`;
/** The negative counterpart. `-<$0.000001` would read as a typo; `>-$0.000001` is the same claim
 *  stated the way an inequality is normally written. */
const ABOVE_NEGATIVE_FLOOR = `>-$${USD_DISPLAY_FLOOR.toFixed(MAX_DECIMALS)}`;

function belowFloorMarker(amount: number): string {
  return amount < 0 ? ABOVE_NEGATIVE_FLOOR : BELOW_FLOOR;
}

/**
 * Decimals needed to expose `SIGNIFICANT_DIGITS` of `magnitude`, clamped to the ladder's bounds.
 *
 * `Math.floor(Math.log10(x))` is the exponent of the first significant digit: `0.006338` -> `-3`,
 * so the second significant digit lands at the 4th decimal. `log10` is float-approximate at exact
 * powers of ten (`log10(0.001)` can come back as `-2.9999999999999996`), which can overshoot by
 * one decimal — harmless, because the trailing-zero trim in `format` removes exactly that
 * overshoot.
 */
function decimalsFor(magnitude: number): number {
  if (magnitude >= 1 || magnitude <= 0) return MIN_DECIMALS;
  const firstSignificantExponent = Math.floor(Math.log10(magnitude));
  const needed = -firstSignificantExponent + SIGNIFICANT_DIGITS - 1;
  return Math.min(Math.max(needed, MIN_DECIMALS), MAX_DECIMALS);
}

/** Removes the pad zeros the ladder's extension introduced. Never trims below `floor` digits, so
 *  it can never turn `$0.10` into `$0.1`. */
function trimPadZeros(fraction: string, floor: number): string {
  let end = fraction.length;
  while (end > floor && fraction[end - 1] === '0') end -= 1;
  return fraction.slice(0, end);
}

/** `1131.8` -> `1 131` — the console's thin-space grouping, never a comma. */
function groupThousands(integerPart: string): string {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
}

function format(amount: number, decimalFloor: number): string {
  const magnitude = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (magnitude > 0 && magnitude < USD_DISPLAY_FLOOR) return belowFloorMarker(amount);

  const fixed = magnitude.toFixed(decimalsFor(magnitude));
  const [integerPart, fractionPart = ''] = fixed.split('.');

  // Rounding at the cap can still land on all-zeros for an amount that is not zero (a value just
  // under the floor that `toFixed` rounds down). Name it rather than print `$0.000000`.
  if (magnitude > 0 && Number(fixed) === 0) return belowFloorMarker(amount);

  const fraction = trimPadZeros(fractionPart, decimalFloor);
  const grouped = groupThousands(integerPart);

  return fraction.length > 0 ? `${sign}$${grouped}.${fraction}` : `${sign}$${grouped}`;
}

/**
 * The stated amount — a hero numeral, a ledger cell, a caption. Adaptive decimals per the ladder
 * documented at the top of this file: `$1 131.80`, `$12.40`, `$0.0063`, `<$0.000001`.
 *
 * Use this everywhere a figure is being ASSERTED. The only exception is a chart's axis, where the
 * label marks a gridline rather than states a value — see `formatUsdAxis`.
 */
export function formatUsd(amount: number): string {
  return format(amount, MIN_DECIMALS);
}

/**
 * The paired consumption caption every `Meter` and `BudgetHero` carries: `$0.0063 of $12.00`.
 *
 * Each side is laddered on its own magnitude — see "Why per-value and not harmonised across a
 * pair" at the top of this file.
 */
export function formatUsdOf(value: number, ceiling: number): string {
  return `${formatUsd(value)} of ${formatUsd(ceiling)}`;
}

/**
 * A chart AXIS TICK, which is a different job from `formatUsd`: the label identifies a gridline
 * on a scale, it does not assert an account's spend. Two consequences —
 *
 * 1. No two-decimal floor. d3's `scale.ticks()` emits round numbers, and `$12` / `$0.006` mark
 *    their gridlines exactly; `$12.00` / `$0.0060` only spend axis width (the y-axis gutter is
 *    52px) on zeros that carry nothing.
 * 2. Thousands abbreviate (`$1.2k`, `$2.25M`) rather than grouping, for the same width reason.
 *    A ledger cell never abbreviates — the reader is reading the number there, not the scale.
 *
 * The ladder's significant-digit rule and its display floor still apply, so an axis over a
 * sub-cent domain is labelled honestly instead of collapsing every tick to `$0`. That collapse is
 * what the console shipped: `SpendSeriesChart`'s default tick formatter is
 * `String(Math.round(v))`, which labels an entire real spend axis `0`.
 */
export function formatUsdAxis(amount: number): string {
  const magnitude = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (magnitude === 0) return '$0';
  if (magnitude >= 1_000_000) return `${sign}$${abbreviate(magnitude / 1_000_000)}M`;
  if (magnitude >= 1_000) return `${sign}$${abbreviate(magnitude / 1_000)}k`;

  return format(amount, 0);
}

/** The mantissa of an abbreviated tick: at most two decimals, no pad zeros (`2.25`, `1.2`, `3`). */
function abbreviate(value: number): string {
  const [integerPart, fractionPart = ''] = value.toFixed(2).split('.');
  const fraction = trimPadZeros(fractionPart, 0);
  return fraction.length > 0 ? `${integerPart}.${fraction}` : integerPart;
}
