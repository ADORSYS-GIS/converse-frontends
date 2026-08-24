// Money formatting helper — console-ui skill §2.2 / docs/design/console-redesign/README.md §2.2:
// "Numeric columns are right-aligned; the mono family makes the digits line up as a ledger.
// Thousands use a thin space ($1 131.80), currency is always written out with two decimals."
//
// Used by Meter and BudgetHero to render the "$X of $Y" line, and available to any consumer
// that needs the same ledger-formatted currency string.

const THIN_SPACE = ' ';

/** Formats a numeric amount as a console-style currency string: `$1 131.80`. */
export function formatMoney(amount: number): string {
  const isNegative = amount < 0;
  const [integerPart, decimalPart] = Math.abs(amount).toFixed(2).split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);

  return `${isNegative ? '-' : ''}$${grouped}.${decimalPart}`;
}

/** Formats a consumption pair as `$X of $Y`, the paired caption every Meter carries. */
export function formatMoneyOf(value: number, ceiling: number): string {
  return `${formatMoney(value)} of ${formatMoney(ceiling)}`;
}
