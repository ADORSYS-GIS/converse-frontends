import { describe, expect, it } from 'vitest';

import { formatMs, formatMsAxis } from './duration';

describe('formatMs — the sub-millisecond floor', () => {
  it('names anything under 1ms rather than fabricating a fractional or zero millisecond', () => {
    expect(formatMs(0.4)).toBe('<1 ms');
    expect(formatMs(0)).toBe('<1 ms');
    expect(formatMs(0.999)).toBe('<1 ms');
  });
});

describe('formatMs — one decimal below 10ms', () => {
  it('keeps a decimal where a single-digit-ms difference is real signal', () => {
    expect(formatMs(1)).toBe('1.0 ms');
    expect(formatMs(4.2)).toBe('4.2 ms');
    expect(formatMs(9.9)).toBe('9.9 ms');
  });
});

describe('formatMs — integer ms from 10ms to 1000ms', () => {
  it('drops the decimal once sub-ms precision would be noise, not signal', () => {
    expect(formatMs(10)).toBe('10 ms');
    expect(formatMs(412)).toBe('412 ms');
    expect(formatMs(999)).toBe('999 ms');
  });

  it('rounds rather than truncates', () => {
    expect(formatMs(412.6)).toBe('413 ms');
  });
});

describe('formatMs — seconds from 1000ms, adaptive precision', () => {
  it('uses two decimals under 10 seconds', () => {
    expect(formatMs(1000)).toBe('1.00 s');
    expect(formatMs(1240)).toBe('1.24 s');
  });

  it('uses one decimal from 10 seconds up to a minute', () => {
    expect(formatMs(12_400)).toBe('12.4 s');
    expect(formatMs(59_900)).toBe('59.9 s');
  });

  it('rounding at the 10-second boundary can round up into it -- still a two-decimal value at that instant', () => {
    // 9999ms is 9.999s, which is still in the "< 10 s" band by the raw value even though the
    // rounded DISPLAY happens to read 10.00 -- an honest artifact of rounding at a boundary, the
    // same class of edge `money.ts`'s own header documents for its own ladder.
    expect(formatMs(9999)).toBe('10.00 s');
  });
});

describe('formatMs — minutes:seconds at or above 60 seconds', () => {
  it('switches to `m s` exactly at the 60-second boundary rather than printing "60.0 s"', () => {
    expect(formatMs(60_000)).toBe('1 m 00 s');
  });

  it('zero-pads the seconds component', () => {
    expect(formatMs(63_000)).toBe('1 m 03 s');
  });

  it('keeps counting minutes past the first one', () => {
    expect(formatMs(125_000)).toBe('2 m 05 s');
  });

  it('groups a minute count large enough to need it, same thin-space convention as money.ts', () => {
    const THIN_SPACE = ' ';
    // 1000 minutes and 5 seconds.
    expect(formatMs(1000 * 60_000 + 5000)).toBe(`1${THIN_SPACE}000 m 05 s`);
  });
});

describe('formatMs — invalid input', () => {
  it('renders an em dash for non-finite input rather than a fabricated number', () => {
    expect(formatMs(Number.NaN)).toBe('—');
    expect(formatMs(Number.POSITIVE_INFINITY)).toBe('—');
    expect(formatMs(Number.NEGATIVE_INFINITY)).toBe('—');
  });

  it('renders an em dash for negative input -- a broken clock, never "a fast request"', () => {
    expect(formatMs(-5)).toBe('—');
    expect(formatMs(-0.001)).toBe('—');
  });
});

describe('formatMsAxis', () => {
  it('labels an exact-zero gridline plainly', () => {
    expect(formatMsAxis(0)).toBe('0');
  });

  it('writes sub-second ticks as bare integer milliseconds, no space before the unit', () => {
    expect(formatMsAxis(250)).toBe('250ms');
    expect(formatMsAxis(999)).toBe('999ms');
  });

  it('abbreviates to seconds at the same 1000ms threshold formatMs converts at', () => {
    expect(formatMsAxis(1000)).toBe('1s');
    expect(formatMsAxis(1500)).toBe('1.5s');
    expect(formatMsAxis(30_000)).toBe('30s');
  });

  it('trims a trailing .0 rather than printing it', () => {
    expect(formatMsAxis(2000)).toBe('2s');
    expect(formatMsAxis(2000)).not.toBe('2.0s');
  });

  it('never crashes on non-finite input from a degenerate scale domain', () => {
    expect(formatMsAxis(Number.NaN)).toBe('0');
    expect(formatMsAxis(Number.POSITIVE_INFINITY)).toBe('0');
  });
});
