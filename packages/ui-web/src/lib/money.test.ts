import { describe, expect, it } from 'vitest';

import {
  USD_DISPLAY_FLOOR,
  formatUsd,
  formatUsdAxis,
  formatUsdOf,
  getMoneyLocale,
  setMoneyLocale,
  type MoneyLocale,
} from './money';

const THIN_SPACE = ' ';
const NON_BREAKING_SPACE = ' ';

// The exact production figures that forced the adaptive ladder (see `money.ts`'s header): an
// account whose real spend is $0.006338 against a $12.00 ceiling. Under the previous fixed-2dp
// formatter this rendered as `$0.01`, and anything a hair smaller as `$0.00` — a spend report
// that reports nothing.
const PRODUCTION_SPEND = 0.006338;
const PRODUCTION_CEILING = 12.0;

describe('formatUsd — the two-decimal floor', () => {
  it('writes cents for any amount at or above $1', () => {
    expect(formatUsd(5)).toBe('$5.00');
    expect(formatUsd(5.1)).toBe('$5.10');
    expect(formatUsd(5.126)).toBe('$5.13');
    expect(formatUsd(1)).toBe('$1.00');
  });

  it('never retreats behind two decimals, even when the extension would allow it', () => {
    // `0.1` reaches two significant digits at the 2nd decimal already; it must not print `$0.1`.
    expect(formatUsd(0.1)).toBe('$0.10');
    expect(formatUsd(0.5)).toBe('$0.50');
    expect(formatUsd(0.09999)).toBe('$0.10');
  });

  it('formats an exact zero as exact, with no extension', () => {
    expect(formatUsd(0)).toBe('$0.00');
  });
});

describe('formatUsd — the extension past two decimals', () => {
  it('renders the production sub-cent spend at four decimals, not $0.01', () => {
    expect(formatUsd(PRODUCTION_SPEND)).toBe('$0.0063');
    expect(formatUsd(PRODUCTION_SPEND)).not.toBe('$0.01');
    expect(formatUsd(PRODUCTION_SPEND)).not.toBe('$0.00');
  });

  it('renders the production ceiling at plain cents, unpadded', () => {
    expect(formatUsd(PRODUCTION_CEILING)).toBe('$12.00');
  });

  it('stops at the second significant digit, band by band', () => {
    expect(formatUsd(0.034567)).toBe('$0.035');
    expect(formatUsd(0.006338)).toBe('$0.0063');
    expect(formatUsd(0.00012345)).toBe('$0.00012');
    expect(formatUsd(0.000012345)).toBe('$0.000012');
  });

  it('trims the pad zeros the extension introduces', () => {
    // The ladder extends `0.03` to three decimals (`0.030`) to look for a second significant
    // digit; finding a zero there, it trims back rather than shipping `$0.030`.
    expect(formatUsd(0.03)).toBe('$0.03');
    expect(formatUsd(0.006)).toBe('$0.006');
    expect(formatUsd(0.001)).toBe('$0.001');
  });

  it('never pads a large amount with meaningless decimals', () => {
    expect(formatUsd(12.4)).toBe('$12.40');
    expect(formatUsd(12.4)).not.toBe('$12.4000');
    expect(formatUsd(2_250_000)).toBe(`$2${THIN_SPACE}250${THIN_SPACE}000.00`);
  });
});

describe('formatUsd — the display floor', () => {
  it('names an amount too small to state rather than rounding it to $0.00', () => {
    expect(formatUsd(0.0000004)).toBe('<$0.000001');
    expect(formatUsd(1e-12)).toBe('<$0.000001');
    expect(formatUsd(0.0000004)).not.toBe('$0.00');
    expect(formatUsd(0.0000004)).not.toBe('$0.000000');
  });

  it('states the floor itself, which is inside the ladder', () => {
    expect(formatUsd(USD_DISPLAY_FLOOR)).toBe('$0.000001');
  });

  it('writes the negative floor as an inequality, not as a minus-prefixed less-than', () => {
    expect(formatUsd(-0.0000004)).toBe('>-$0.000001');
  });
});

describe('formatUsd — grouping and sign', () => {
  it('groups thousands with a thin space, not a comma', () => {
    expect(formatUsd(1131.8)).toBe(`$1${THIN_SPACE}131.80`);
    expect(formatUsd(1131.8)).not.toContain(',');
  });

  it('leaves amounts under 1000 ungrouped', () => {
    expect(formatUsd(142.55)).toBe('$142.55');
  });

  it('puts the minus before the currency sign', () => {
    expect(formatUsd(-42.5)).toBe('-$42.50');
    expect(formatUsd(-0.006338)).toBe('-$0.0063');
  });
});

describe('formatUsdOf', () => {
  it('renders the production pair legibly at both ends', () => {
    expect(formatUsdOf(PRODUCTION_SPEND, PRODUCTION_CEILING)).toBe('$0.0063 of $12.00');
  });

  it('ladders each side on its own magnitude rather than padding the ceiling to match', () => {
    expect(formatUsdOf(PRODUCTION_SPEND, PRODUCTION_CEILING)).not.toContain('$12.0000');
  });

  it('joins the pair with "of"', () => {
    expect(formatUsdOf(142.55, 500)).toBe('$142.55 of $500.00');
  });
});

describe('formatUsdAxis', () => {
  it('drops the two-decimal floor a tick label does not need', () => {
    expect(formatUsdAxis(12)).toBe('$12');
    expect(formatUsdAxis(12.5)).toBe('$12.5');
    expect(formatUsdAxis(0)).toBe('$0');
  });

  it('labels a sub-cent axis honestly instead of collapsing every tick to $0', () => {
    // d3's `scale.ticks()` over the production domain emits exactly these.
    expect(formatUsdAxis(0.002)).toBe('$0.002');
    expect(formatUsdAxis(0.004)).toBe('$0.004');
    expect(formatUsdAxis(0.006)).toBe('$0.006');
    expect(formatUsdAxis(0.006)).not.toBe('$0');
  });

  it('survives the float noise d3 tick values carry', () => {
    expect(formatUsdAxis(0.0020000000000000005)).toBe('$0.002');
  });

  it('abbreviates thousands rather than spending axis width on grouping', () => {
    expect(formatUsdAxis(1000)).toBe('$1k');
    expect(formatUsdAxis(1500)).toBe('$1.5k');
    expect(formatUsdAxis(2_250_000)).toBe('$2.25M');
  });

  it('keeps the display floor', () => {
    expect(formatUsdAxis(0.0000004)).toBe('<$0.000001');
  });
});

/**
 * German notation (ADR 0017 — i18n). The LADDER is unchanged: the same decimal count is chosen for
 * both locales and only rendered differently, which is the whole of the claim `money.ts`'s own
 * header makes. What varies is the group separator (`.`), the decimal mark (`,`) and the symbol's
 * side — DIN 5008 — and the CURRENCY does not vary at all, by owner ruling: every figure is USD in
 * both languages, because a German-reading operator and an English-reading one are looking at the
 * same ledger and this console has no exchange rate to apply.
 */
describe('formatUsd — German notation', () => {
  it('groups with a dot, marks decimals with a comma, and trails the symbol', () => {
    expect(formatUsd(1131.8, 'de')).toBe(`1.131,80${NON_BREAKING_SPACE}$`);
    expect(formatUsd(12.4, 'de')).toBe(`12,40${NON_BREAKING_SPACE}$`);
    expect(formatUsd(0, 'de')).toBe(`0,00${NON_BREAKING_SPACE}$`);
  });

  it('applies the SAME adaptive ladder as English — only the rendering differs', () => {
    // The production sub-cent figure, at the same four decimals `formatUsd(x)` gives in English.
    expect(formatUsd(PRODUCTION_SPEND, 'de')).toBe(`0,0063${NON_BREAKING_SPACE}$`);
    expect(formatUsd(0.1, 'de')).toBe(`0,10${NON_BREAKING_SPACE}$`);
  });

  it('keeps the display floor honest, with the comparison operator outside the notation', () => {
    expect(formatUsd(USD_DISPLAY_FLOOR / 2, 'de')).toBe(`<0,000001${NON_BREAKING_SPACE}$`);
    expect(formatUsd(-USD_DISPLAY_FLOOR / 2, 'de')).toBe(`>-0,000001${NON_BREAKING_SPACE}$`);
  });

  it('renders an axis tick with the German decimal mark and a trailing symbol', () => {
    expect(formatUsdAxis(0, 'de')).toBe(`0${NON_BREAKING_SPACE}$`);
    expect(formatUsdAxis(1200, 'de')).toBe(`1,2k${NON_BREAKING_SPACE}$`);
    expect(formatUsdAxis(2_250_000, 'de')).toBe(`2,25M${NON_BREAKING_SPACE}$`);
  });

  it('takes the joining word as a parameter — this package owns no translations', () => {
    expect(formatUsdOf(PRODUCTION_SPEND, PRODUCTION_CEILING)).toBe('$0.0063 of $12.00');
    expect(formatUsdOf(PRODUCTION_SPEND, PRODUCTION_CEILING, { locale: 'de', ofWord: 'von' })).toBe(
      `0,0063${NON_BREAKING_SPACE}$ von 12,00${NON_BREAKING_SPACE}$`
    );
  });

  it('falls back to English for a locale it does not know, rather than throwing', () => {
    expect(formatUsd(12.4, 'fr' as MoneyLocale)).toBe('$12.40');
  });
});

describe('the ambient money locale', () => {
  it('is what an un-parameterised call renders in, and is restorable', () => {
    const previous = setMoneyLocale('de');
    try {
      expect(getMoneyLocale()).toBe('de');
      expect(formatUsd(1131.8)).toBe(`1.131,80${NON_BREAKING_SPACE}$`);
      // An EXPLICIT locale still wins over the ambient one — which is what lets the report
      // pipeline stay correct while serving concurrent requests.
      expect(formatUsd(1131.8, 'en')).toBe(`$1${THIN_SPACE}131.80`);
    } finally {
      setMoneyLocale(previous);
    }
    expect(getMoneyLocale()).toBe('en');
  });
});
