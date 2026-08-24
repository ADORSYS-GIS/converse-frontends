import { describe, expect, it } from 'vitest';

import { formatMoney, formatMoneyOf } from './money';

const THIN_SPACE = ' ';

describe('formatMoney', () => {
  it('always writes two decimals', () => {
    expect(formatMoney(5)).toBe('$5.00');
    expect(formatMoney(5.1)).toBe('$5.10');
    expect(formatMoney(5.126)).toBe('$5.13');
  });

  it('groups thousands with a thin space, not a comma', () => {
    expect(formatMoney(1131.8)).toBe(`$1${THIN_SPACE}131.80`);
    expect(formatMoney(1131.8)).not.toContain(',');
  });

  it('groups millions with repeated thin spaces', () => {
    expect(formatMoney(2250000)).toBe(`$2${THIN_SPACE}250${THIN_SPACE}000.00`);
  });

  it('leaves amounts under 1000 ungrouped', () => {
    expect(formatMoney(142.55)).toBe('$142.55');
  });

  it('formats negative amounts with a leading minus before the sign', () => {
    expect(formatMoney(-42.5)).toBe('-$42.50');
  });

  it('formats zero', () => {
    expect(formatMoney(0)).toBe('$0.00');
  });
});

describe('formatMoneyOf', () => {
  it('joins the pair with "of"', () => {
    expect(formatMoneyOf(142.55, 500)).toBe('$142.55 of $500.00');
  });
});
