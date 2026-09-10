import { describe, expect, it } from 'vitest';

import { comparisonLabel, comparisonWindow, DEFAULT_COMPARISON_CADENCE } from './comparison-window';

const at = (iso: string) => new Date(iso);

describe('comparisonWindow', () => {
  /**
   * The 2026-09-03 money incident (converse-frontends#448), pinned as a rule rather than as one
   * fixture: this helper used to hand back a WIDENED current window under the 7-day floor, and
   * `resolve-dashboard.ts` queried it for every panel on the page.
   */
  it.each(['daily', 'weekly', 'monthly'] as const)(
    'never moves the current window under %s, not even a sub-week one',
    (cadence) => {
      const threeDays = { start: at('2026-09-01T00:00:00Z'), end: at('2026-09-03T23:59:59.999Z') };
      const { current } = comparisonWindow(threeDays, cadence);
      expect(current.start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
      expect(current.end.toISOString()).toBe('2026-09-03T23:59:59.999Z');
    }
  );

  it('never moves a nine-day weekly window up to whole weeks either', () => {
    const nineDays = { start: at('2026-08-23T00:00:00Z'), end: at('2026-09-01T00:00:00Z') };
    const { current } = comparisonWindow(nineDays, 'weekly');
    expect(current.start.toISOString()).toBe('2026-08-23T00:00:00.000Z');
    expect(current.end.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('copies the window rather than aliasing the caller’s Dates', () => {
    const window = { start: at('2026-08-01T00:00:00Z'), end: at('2026-08-31T00:00:00Z') };
    const { current } = comparisonWindow(window, 'weekly');
    expect(current.start).not.toBe(window.start);
    expect(current.end).not.toBe(window.end);
  });

  it('never overlaps the current window', () => {
    const window = { start: at('2026-08-01T00:00:00Z'), end: at('2026-08-31T00:00:00Z') };
    const { current, previous } = comparisonWindow(window, 'weekly');
    expect(previous.end.getTime()).toBeLessThanOrEqual(current.start.getTime());
  });

  it('takes the immediately preceding window of equal length for weekly and daily', () => {
    const window = { start: at('2026-08-25T00:00:00Z'), end: at('2026-09-01T00:00:00Z') };
    for (const cadence of ['daily', 'weekly'] as const) {
      const { current, previous } = comparisonWindow(window, cadence);
      expect(previous.end.toISOString()).toBe(current.start.toISOString());
      expect(previous.end.getTime() - previous.start.getTime()).toBe(
        current.end.getTime() - current.start.getTime()
      );
    }
  });

  /** A three-day window compares against the three days before it — not against a widened week,
   *  which would make the percentage a ratio of unequal spans. */
  it('compares a sub-week window against an equally short one', () => {
    const threeDays = { start: at('2026-09-01T00:00:00Z'), end: at('2026-09-03T23:59:59.999Z') };
    const { current, previous } = comparisonWindow(threeDays, 'daily');
    expect(previous.end.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(previous.end.getTime() - previous.start.getTime()).toBe(
      current.end.getTime() - current.start.getTime()
    );
  });

  /** The whole reason `monthly` is not a millisecond shift: a 30-day shift would compare 1–15
   *  March against 30 January–13 February. */
  it('shifts a monthly window by a CALENDAR month, not by 30 days', () => {
    const mtd = { start: at('2026-03-01T00:00:00Z'), end: at('2026-03-15T00:00:00Z') };
    const { previous } = comparisonWindow(mtd, 'monthly');
    expect(previous.start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(previous.end.toISOString()).toBe('2026-02-15T00:00:00.000Z');
  });

  it('clamps a day-of-month that the previous month does not have', () => {
    const window = { start: at('2026-03-31T00:00:00Z'), end: at('2026-04-10T00:00:00Z') };
    const { previous } = comparisonWindow(window, 'monthly');
    // February 2026 has 28 days — never a silent roll-forward into March.
    expect(previous.start.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('defaults to the monthly rule for an estate page with no actor cadence', () => {
    const window = { start: at('2026-03-01T00:00:00Z'), end: at('2026-03-15T00:00:00Z') };
    expect(comparisonWindow(window).cadence).toBe(DEFAULT_COMPARISON_CADENCE);
    expect(comparisonWindow(window).previous.start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });
});

describe('comparisonLabel', () => {
  it('names the comparison window by date, not by cadence', () => {
    expect(
      comparisonLabel({ start: at('2026-08-25T00:00:00Z'), end: at('2026-09-01T00:00:00Z') })
    ).toBe('vs Aug 25 – Aug 31');
  });

  /** A window ending at midnight ends where the next day BEGINS; printing that day would claim a
   *  day the comparison never covered. */
  it('states the end inclusively', () => {
    expect(
      comparisonLabel({ start: at('2026-02-01T00:00:00Z'), end: at('2026-03-01T00:00:00Z') })
    ).toBe('vs Feb 1 – Feb 28');
  });

  it('prints a partial day’s own date when the end is not a midnight boundary', () => {
    expect(
      comparisonLabel({ start: at('2026-08-01T00:00:00Z'), end: at('2026-08-15T12:00:00Z') })
    ).toBe('vs Aug 1 – Aug 15');
  });

  it('collapses a single-day window to one date', () => {
    expect(
      comparisonLabel({ start: at('2026-08-31T00:00:00Z'), end: at('2026-09-01T00:00:00Z') })
    ).toBe('vs Aug 31');
  });
});
