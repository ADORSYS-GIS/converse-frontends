import { describe, expect, it } from 'vitest';

import {
  comparisonLabel,
  comparisonWindow,
  DEFAULT_COMPARISON_CADENCE,
  MIN_COMPARISON_SPAN_MS,
  snapToCadence,
} from './comparison-window';

const DAY = 86_400_000;
const at = (iso: string) => new Date(iso);

describe('snapToCadence', () => {
  it('leaves a window that already meets the one-week floor alone', () => {
    const window = { start: at('2026-08-01T00:00:00Z'), end: at('2026-08-31T00:00:00Z') };
    const snapped = snapToCadence(window, 'monthly');
    expect(snapped.start.toISOString()).toBe(window.start.toISOString());
    expect(snapped.end.toISOString()).toBe(window.end.toISOString());
  });

  /** The owner's "at least a week": a daily-resetting actor compared day-on-day is noise. */
  it.each(['daily', 'weekly', 'monthly'] as const)(
    'widens a one-day window to the trailing week under %s',
    (cadence) => {
      const window = { start: at('2026-09-01T00:00:00Z'), end: at('2026-09-02T00:00:00Z') };
      const snapped = snapToCadence(window, cadence);
      expect(snapped.end.toISOString()).toBe('2026-09-02T00:00:00.000Z');
      expect(snapped.end.getTime() - snapped.start.getTime()).toBe(MIN_COMPARISON_SPAN_MS);
    }
  );

  it('rounds a weekly window UP to whole weeks, never truncating a longer selection', () => {
    const nineDays = { start: at('2026-08-23T00:00:00Z'), end: at('2026-09-01T00:00:00Z') };
    expect(
      snapToCadence(nineDays, 'weekly').end.getTime() -
        snapToCadence(nineDays, 'weekly').start.getTime()
    ).toBe(14 * DAY);

    const thirtyDays = { start: at('2026-08-02T00:00:00Z'), end: at('2026-09-01T00:00:00Z') };
    const snapped = snapToCadence(thirtyDays, 'weekly');
    expect(snapped.end.getTime() - snapped.start.getTime()).toBe(35 * DAY);
  });

  it('leaves a monthly window partial — `mtd` compares like-for-like against the same days', () => {
    const mtd = { start: at('2026-09-01T00:00:00Z'), end: at('2026-09-15T12:00:00Z') };
    const snapped = snapToCadence(mtd, 'monthly');
    expect(snapped.start.toISOString()).toBe(mtd.start.toISOString());
  });
});

describe('comparisonWindow', () => {
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

  it('reports when the current window was widened, so a caller can say so', () => {
    const oneDay = { start: at('2026-09-01T00:00:00Z'), end: at('2026-09-02T00:00:00Z') };
    expect(comparisonWindow(oneDay, 'daily').widened).toBe(true);

    const oneMonth = { start: at('2026-08-01T00:00:00Z'), end: at('2026-09-01T00:00:00Z') };
    expect(comparisonWindow(oneMonth, 'monthly').widened).toBe(false);
  });

  it('defaults to the monthly rule for an estate page with no actor cadence', () => {
    const window = { start: at('2026-03-01T00:00:00Z'), end: at('2026-03-15T00:00:00Z') };
    expect(comparisonWindow(window).cadence).toBe(DEFAULT_COMPARISON_CADENCE);
    expect(comparisonWindow(window).previous.start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });
});

describe('comparisonLabel', () => {
  it('names the window explicitly instead of a vague "prev period"', () => {
    expect(comparisonLabel('daily')).toBe('vs previous week');
    expect(comparisonLabel('weekly')).toBe('vs previous week');
    expect(comparisonLabel('monthly')).toBe('vs previous month');
  });
});
