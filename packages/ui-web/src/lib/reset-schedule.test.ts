import { describe, expect, it } from 'vitest';

import {
  DAY_OF_MONTH_OPTIONS,
  MAX_DAY_OF_MONTH,
  relativeWhen,
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
