import { describe, expect, it } from 'vitest';

import {
  datetimeLocalUtcToIso,
  DAY_OF_MONTH_OPTIONS,
  formatUtcInstant,
  isoToDatetimeLocalUtc,
  isOnResetScheduleGrid,
  MAX_DAY_OF_MONTH,
  relativeWhen,
  resetScheduleNextRunCell,
  resetScheduleCadenceSentence,
  resetScheduleModePhrase,
  resetScheduleModeWord,
  resetScheduleNextRunLabel,
  resetScheduleScopeSentence,
  WEEKDAY_OPTIONS,
  type ResetScheduleFacts,
} from './reset-schedule';

const TWO_USD = '2000000';
const FIFTEEN_USD = '15000000';

function facts(overrides: Partial<ResetScheduleFacts> = {}): ResetScheduleFacts {
  return {
    cadence: 'daily',
    anchor: null,
    runAtUtc: '00:00',
    amountMicros: TWO_USD,
    mode: 'reset',
    ...overrides,
  };
}

// The acceptance criterion is stated as a sentence, so it is asserted as a sentence: every
// mode × cadence × anchor combination the backend can store.
describe('resetScheduleCadenceSentence', () => {
  it("renders the story's own example verbatim", () => {
    expect(resetScheduleCadenceSentence(facts())).toBe(
      'Reset remaining to $2.00 every day at 00:00 UTC'
    );
  });

  it.each([
    [
      'reset, weekly',
      facts({ cadence: 'weekly', anchor: 1, runAtUtc: '06:00' }),
      'Reset remaining to $2.00 every Monday at 06:00 UTC',
    ],
    [
      'top up, weekly',
      facts({
        cadence: 'weekly',
        anchor: 1,
        runAtUtc: '06:00',
        mode: 'top_up',
        amountMicros: FIFTEEN_USD,
      }),
      'Add $15.00 every Monday at 06:00 UTC',
    ],
    [
      'reset, monthly',
      facts({ cadence: 'monthly', anchor: 1 }),
      'Reset remaining to $2.00 on day 1 of each month at 00:00 UTC',
    ],
    [
      'top up, monthly, day 28',
      facts({ cadence: 'monthly', anchor: 28, mode: 'top_up', amountMicros: FIFTEEN_USD }),
      'Add $15.00 on day 28 of each month at 00:00 UTC',
    ],
    [
      'top up, daily',
      facts({ mode: 'top_up', amountMicros: FIFTEEN_USD }),
      'Add $15.00 every day at 00:00 UTC',
    ],
    [
      'reset, Sunday',
      facts({ cadence: 'weekly', anchor: 7 }),
      'Reset remaining to $2.00 every Sunday at 00:00 UTC',
    ],
  ])('%s', (_name, value, expected) => {
    expect(resetScheduleCadenceSentence(value)).toBe(expected);
  });

  // "the two modes are never visually ambiguous" — asserted structurally, not by eye: the two
  // sentences for the same schedule share no leading word.
  it('gives reset and top_up different opening words', () => {
    const reset = resetScheduleCadenceSentence(facts({ mode: 'reset' }));
    const topUp = resetScheduleCadenceSentence(facts({ mode: 'top_up' }));
    expect(reset.split(' ')[0]).not.toBe(topUp.split(' ')[0]);
  });

  it('names an unrecognised cadence rather than silently reading it as daily', () => {
    const sentence = resetScheduleCadenceSentence(facts({ cadence: 'hourly' }));
    expect(sentence).toContain('unrecognised cadence "hourly"');
    expect(sentence).not.toContain('every day');
  });

  it('names an unrecognised mode rather than guessing at a verb', () => {
    expect(resetScheduleModePhrase('drain', TWO_USD)).toContain('unrecognised mode "drain"');
  });

  it('states a missing anchor rather than defaulting to Monday or day 1', () => {
    expect(resetScheduleCadenceSentence(facts({ cadence: 'weekly', anchor: null }))).toContain(
      'weekday not set'
    );
    expect(resetScheduleCadenceSentence(facts({ cadence: 'monthly', anchor: null }))).toContain(
      'day not set'
    );
  });

  it('carries the money ladder through, sub-cent amounts included', () => {
    expect(resetScheduleCadenceSentence(facts({ amountMicros: '6338' }))).toBe(
      'Reset remaining to $0.0063 every day at 00:00 UTC'
    );
  });
});

describe('resetScheduleScopeSentence', () => {
  it('reads global as a sentence, not an enum', () => {
    expect(resetScheduleScopeSentence({ scopeKind: 'global', scopeId: null })).toBe('All accounts');
  });

  it('prefers a resolved label over the raw id', () => {
    expect(
      resetScheduleScopeSentence({ scopeKind: 'billing_plan', scopeId: 'plan_1' }, 'free')
    ).toBe('Plan free');
    expect(
      resetScheduleScopeSentence({ scopeKind: 'account', scopeId: 'acct_1' }, 'northwind-ai')
    ).toBe('Account northwind-ai');
  });

  // A blank scope cell would read as "global" — the single most dangerous thing this column could
  // get wrong, since a global schedule rewrites the whole estate.
  it('falls back to the id rather than a blank cell', () => {
    expect(resetScheduleScopeSentence({ scopeKind: 'account', scopeId: 'acct_zz' })).toBe(
      'Account acct_zz'
    );
  });

  it('names an unrecognised scope kind', () => {
    expect(resetScheduleScopeSentence({ scopeKind: 'tenant', scopeId: 't1' })).toContain(
      'Unrecognised scope "tenant"'
    );
  });
});

describe('relativeWhen', () => {
  const now = Date.parse('2026-09-02T12:00:00Z');

  it.each([
    ['2026-09-02T12:00:20Z', 'now'],
    ['2026-09-02T12:45:00Z', 'in 45 min'],
    ['2026-09-02T18:00:00Z', 'in 6 h'],
    ['2026-09-03T12:00:00Z', 'in 1 day'],
    ['2026-09-05T12:00:00Z', 'in 3 days'],
    ['2026-09-02T11:00:00Z', 'overdue'],
  ])('%s → %s', (iso, expected) => {
    expect(relativeWhen(iso, now)).toBe(expected);
  });

  it('says unknown rather than NaN for an unparseable timestamp', () => {
    expect(relativeWhen('not-a-date', now)).toBe('unknown');
  });
});

describe('resetScheduleNextRunLabel', () => {
  const now = Date.parse('2026-09-02T12:00:00Z');

  it('states when, how much, and which mode', () => {
    expect(
      resetScheduleNextRunLabel(
        { nextRunAt: '2026-09-05T12:00:00Z', amountMicros: TWO_USD, mode: 'reset' },
        now
      )
    ).toBe('Next reset in 3 days → $2.00 (reset)');
  });

  it('names a top-up as a top up even though the line opens with "Next reset"', () => {
    expect(
      resetScheduleNextRunLabel(
        { nextRunAt: '2026-09-03T12:00:00Z', amountMicros: FIFTEEN_USD, mode: 'top_up' },
        now
      )
    ).toBe('Next reset in 1 day → $15.00 (top up)');
  });
});

describe('anchor option catalogues', () => {
  it('offers seven ISO-numbered weekdays, Monday first', () => {
    expect(WEEKDAY_OPTIONS).toHaveLength(7);
    expect(WEEKDAY_OPTIONS[0]).toEqual({ value: '1', label: 'Monday' });
    expect(WEEKDAY_OPTIONS[6]).toEqual({ value: '7', label: 'Sunday' });
  });

  // 1..28, matching the backend constraint — never 29/30/31, which would silently skip February.
  it('caps day-of-month at 28, the backend constraint', () => {
    expect(MAX_DAY_OF_MONTH).toBe(28);
    expect(DAY_OF_MONTH_OPTIONS).toHaveLength(28);
    expect(DAY_OF_MONTH_OPTIONS[DAY_OF_MONTH_OPTIONS.length - 1]).toEqual({
      value: '28',
      label: '28',
    });
    expect(DAY_OF_MONTH_OPTIONS.map((o) => o.value)).not.toContain('29');
  });
});

describe('resetScheduleModeWord', () => {
  it('maps the wire enum onto prose', () => {
    expect(resetScheduleModeWord('reset')).toBe('reset');
    expect(resetScheduleModeWord('top_up')).toBe('top up');
  });
});

// ── the forced next execution (backend ADR-0032's 2026-09-03 amendment) ──────────────────────

describe('isOnResetScheduleGrid', () => {
  const daily = { cadence: 'daily', anchor: null, runAtUtc: '00:00' };
  // 2026-09-16 is a Wednesday (ISO 3); 2026-09-15 is a Tuesday.
  const weekly = { cadence: 'weekly', anchor: 3, runAtUtc: '06:00' };
  const monthly = { cadence: 'monthly', anchor: 1, runAtUtc: '00:00' };

  it('accepts a window the cadence itself would have produced', () => {
    expect(isOnResetScheduleGrid(daily, '2026-09-16T00:00:00Z')).toBe(true);
    expect(isOnResetScheduleGrid(weekly, '2026-09-16T06:00:00Z')).toBe(true);
    expect(isOnResetScheduleGrid(monthly, '2026-10-01T00:00:00Z')).toBe(true);
  });

  it('rejects a window at the wrong time of day', () => {
    expect(isOnResetScheduleGrid(daily, '2026-09-15T09:30:00Z')).toBe(false);
    expect(isOnResetScheduleGrid(weekly, '2026-09-16T00:00:00Z')).toBe(false);
  });

  it('rejects a weekly window on the wrong weekday and a monthly one on the wrong day', () => {
    // Tuesday, not the anchored Wednesday.
    expect(isOnResetScheduleGrid(weekly, '2026-09-15T06:00:00Z')).toBe(false);
    expect(isOnResetScheduleGrid(monthly, '2026-10-15T00:00:00Z')).toBe(false);
  });

  it('reads seconds as off-grid — a computed window is always minute-granular', () => {
    expect(isOnResetScheduleGrid(daily, '2026-09-16T00:00:30Z')).toBe(false);
  });

  // Claiming "forced" is a claim about what an operator did. Every case this function cannot
  // actually decide answers `true`, so the console never asserts it on a guess.
  it('answers true for everything it cannot decide', () => {
    expect(isOnResetScheduleGrid(daily, 'not a date')).toBe(true);
    expect(isOnResetScheduleGrid({ ...daily, cadence: 'hourly' }, '2026-09-16T00:00:00Z')).toBe(
      true
    );
    expect(isOnResetScheduleGrid({ ...weekly, anchor: null }, '2026-09-15T06:00:00Z')).toBe(true);
  });
});

describe('resetScheduleNextRunCell', () => {
  const now = Date.parse('2026-09-03T00:00:00Z');
  const daily = { cadence: 'daily', anchor: null, runAtUtc: '00:00', enabled: true };

  it('is the relative time for an on-grid window', () => {
    expect(resetScheduleNextRunCell({ ...daily, nextRunAt: '2026-09-04T00:00:00Z' }, now)).toBe(
      'in 1 day'
    );
  });

  it('marks an off-grid window as forced', () => {
    expect(resetScheduleNextRunCell({ ...daily, nextRunAt: '2026-09-15T09:30:00Z' }, now)).toBe(
      'in 12 days · forced'
    );
  });

  // A disabled schedule's stored window is one the scheduler will never reach, forced or not.
  it('says paused for a disabled schedule, forced or not', () => {
    expect(
      resetScheduleNextRunCell({ ...daily, enabled: false, nextRunAt: '2026-09-15T09:30:00Z' }, now)
    ).toBe('paused');
  });
});

describe('the UTC datetime helpers', () => {
  it('renders an absolute instant with its zone named', () => {
    expect(formatUtcInstant('2026-09-15T09:30:00Z')).toBe('2026-09-15 09:30 UTC');
  });

  it('returns the raw value rather than a fabricated date for an unparseable instant', () => {
    expect(formatUtcInstant('never')).toBe('never');
  });

  // The form's control holds a naive local-looking string; this console reads and writes it as UTC
  // and labels the field so. A round trip must not shift the instant by the viewer's offset.
  it('round-trips an instant through the datetime-local value shape, in UTC', () => {
    expect(isoToDatetimeLocalUtc('2026-09-15T09:30:00Z')).toBe('2026-09-15T09:30');
    expect(datetimeLocalUtcToIso('2026-09-15T09:30')).toBe('2026-09-15T09:30:00.000Z');
    expect(datetimeLocalUtcToIso(isoToDatetimeLocalUtc('2026-09-15T09:30:00Z'))).toBe(
      '2026-09-15T09:30:00.000Z'
    );
  });

  it('accepts the seconds-bearing form the control emits with a step', () => {
    expect(datetimeLocalUtcToIso('2026-09-15T09:30:15')).toBe('2026-09-15T09:30:15.000Z');
  });

  it('is null for blank and for a half-typed value — never a guessed date', () => {
    expect(datetimeLocalUtcToIso('')).toBeNull();
    expect(datetimeLocalUtcToIso('   ')).toBeNull();
    expect(datetimeLocalUtcToIso('2026-09-15')).toBeNull();
    expect(datetimeLocalUtcToIso('soon')).toBeNull();
  });
});
