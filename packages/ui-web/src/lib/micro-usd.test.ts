import { describe, expect, it } from 'vitest';

import { microsToUsdInput, microsToUsdNumber, usdToMicros } from './micro-usd';

describe('usdToMicros', () => {
  it.each([
    ['2', '2000000'],
    ['2.00', '2000000'],
    ['0.5', '500000'],
    ['.5', '500000'],
    ['5.', '5000000'],
    ['15', '15000000'],
    ['0', '0'],
    ['0.000001', '1'],
    ['1234.56', '1234560000'],
    ['  7.25  ', '7250000'],
  ])('%s → %s', (input, expected) => {
    expect(usdToMicros(input)).toBe(expected);
  });

  // The exact case that motivates integer parsing: `8.09 * 1e6` is 8089999.999999999 as a double.
  it('is exact for a decimal a double cannot represent', () => {
    expect(usdToMicros('8.09')).toBe('8090000');
    expect(usdToMicros('0.07')).toBe('70000');
    expect(usdToMicros('1.005')).toBe('1005000');
  });

  // An i64 amount far past `Number.MAX_SAFE_INTEGER` micros still round-trips exactly, which is
  // the whole reason `amountMicros` is carried as a string on the wire.
  it('carries an amount larger than Number.MAX_SAFE_INTEGER micros exactly', () => {
    expect(usdToMicros('90071992547.409929')).toBe('90071992547409929');
    expect(microsToUsdInput('90071992547409929')).toBe('90071992547.409929');
  });

  it('keeps a negative amount signed', () => {
    expect(usdToMicros('-1.25')).toBe('-1250000');
  });

  it.each([
    ['', 'empty'],
    ['   ', 'blank'],
    ['.', 'a bare decimal point'],
    ['-', 'a bare sign'],
    ['abc', 'letters'],
    ['1,000', 'a thousands separator'],
    ['1e6', 'scientific notation'],
    ['Infinity', 'Infinity'],
    ['NaN', 'NaN'],
    ['$2', 'a currency symbol'],
    ['2.0000001', 'more than six decimals'],
    ['1.2.3', 'two decimal points'],
  ])('rejects %s (%s) rather than coercing it to 0', (input) => {
    expect(usdToMicros(input)).toBeNull();
  });
});

describe('microsToUsdInput', () => {
  it.each([
    ['2000000', '2'],
    ['8090000', '8.09'],
    ['500000', '0.5'],
    ['0', '0'],
    ['1', '0.000001'],
    ['-1250000', '-1.25'],
  ])('%s → %s', (input, expected) => {
    expect(microsToUsdInput(input)).toBe(expected);
  });

  it('returns an empty field for an unparseable amount, never a fabricated 0', () => {
    expect(microsToUsdInput('not-a-number')).toBe('');
    expect(microsToUsdInput('')).toBe('');
  });

  it('round-trips every amount a form can produce', () => {
    for (const typed of ['0', '2', '0.5', '8.09', '15.75', '1234.56', '0.000001']) {
      const micros = usdToMicros(typed);
      expect(micros).not.toBeNull();
      expect(usdToMicros(microsToUsdInput(micros as string))).toBe(micros);
    }
  });
});

describe('microsToUsdNumber', () => {
  it('divides for display', () => {
    expect(microsToUsdNumber('2000000')).toBe(2);
    expect(microsToUsdNumber('-1250000')).toBe(-1.25);
  });

  it('reads a missing or broken amount as 0 rather than NaN', () => {
    expect(microsToUsdNumber(null)).toBe(0);
    expect(microsToUsdNumber(undefined)).toBe(0);
    expect(microsToUsdNumber('nope')).toBe(0);
  });
});
