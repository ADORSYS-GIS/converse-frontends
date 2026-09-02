import { describe, expect, it } from 'vitest';

import {
  budgetScheduleFormDailyGlobal,
  budgetScheduleFormInvalid,
  budgetScheduleFormInvalidErrors,
  budgetScheduleFormMonthlyAccount,
  budgetScheduleFormWeeklyTopUp,
} from './fixtures';
import {
  anchorRange,
  budgetScheduleUnknownFields,
  cadenceUsesAnchor,
  createBlankBudgetSchedule,
  fromStoredBudgetSchedule,
  scopeKindUsesScopeId,
  toBudgetScheduleWire,
  validateBudgetSchedule,
} from './schedule-validation';
import type { BudgetScheduleFormValue } from './types';

function draft(overrides: Partial<BudgetScheduleFormValue> = {}): BudgetScheduleFormValue {
  return { ...budgetScheduleFormDailyGlobal, ...overrides };
}

describe('validateBudgetSchedule', () => {
  it('accepts every fixture the stories present as valid', () => {
    expect(validateBudgetSchedule(budgetScheduleFormDailyGlobal)).toBeUndefined();
    expect(validateBudgetSchedule(budgetScheduleFormWeeklyTopUp)).toBeUndefined();
    expect(validateBudgetSchedule(budgetScheduleFormMonthlyAccount)).toBeUndefined();
  });

  // The invalid story renders the errors this fixture asserts — so a story can never display a
  // message the validator would not actually produce.
  it('produces exactly the errors the invalid fixture claims', () => {
    expect(validateBudgetSchedule(budgetScheduleFormInvalid)).toEqual(
      budgetScheduleFormInvalidErrors
    );
  });

  it('reports every field at once rather than first-error-wins', () => {
    const errors = validateBudgetSchedule(budgetScheduleFormInvalid);
    expect(Object.keys(errors ?? {}).sort()).toEqual([
      'amount',
      'anchor',
      'name',
      'runAtUtc',
      'scopeId',
    ]);
  });

  describe('name', () => {
    it('refuses a blank name', () => {
      expect(validateBudgetSchedule(draft({ name: '  ' }))?.name).toBeDefined();
    });
  });

  describe('scope', () => {
    it('needs no scope id for a global schedule', () => {
      expect(validateBudgetSchedule(draft({ scopeKind: 'global', scopeId: '' }))).toBeUndefined();
    });

    it.each(['billing_plan', 'account'] as const)('requires a scope id for %s', (scopeKind) => {
      expect(validateBudgetSchedule(draft({ scopeKind, scopeId: '' }))?.scopeId).toBeDefined();
      expect(validateBudgetSchedule(draft({ scopeKind, scopeId: 'x' }))?.scopeId).toBeUndefined();
    });
  });

  describe('anchor', () => {
    it('ignores the anchor entirely for a daily cadence', () => {
      expect(validateBudgetSchedule(draft({ cadence: 'daily', anchor: '' }))).toBeUndefined();
      // Even a nonsense leftover anchor is fine — daily never sends it.
      expect(validateBudgetSchedule(draft({ cadence: 'daily', anchor: '99' }))).toBeUndefined();
    });

    it.each([
      ['1', undefined],
      ['7', undefined],
      ['', 'error'],
      ['0', 'error'],
      ['8', 'error'],
    ])('weekly anchor %s', (anchor, outcome) => {
      const errors = validateBudgetSchedule(draft({ cadence: 'weekly', anchor }));
      expect(errors?.anchor === undefined ? undefined : 'error').toBe(outcome);
    });

    // The backend constraint the story names explicitly: 1..28, never 29..31.
    it.each([
      ['1', undefined],
      ['28', undefined],
      ['29', 'error'],
      ['31', 'error'],
      ['0', 'error'],
      ['', 'error'],
    ])('monthly anchor %s', (anchor, outcome) => {
      const errors = validateBudgetSchedule(draft({ cadence: 'monthly', anchor }));
      expect(errors?.anchor === undefined ? undefined : 'error').toBe(outcome);
    });

    it('explains WHY a monthly anchor is capped at 28', () => {
      expect(validateBudgetSchedule(draft({ cadence: 'monthly', anchor: '31' }))?.anchor).toContain(
        'February'
      );
    });
  });

  describe('runAtUtc', () => {
    it.each(['00:00', '06:00', '23:59', '09:05'])('accepts %s', (runAtUtc) => {
      expect(validateBudgetSchedule(draft({ runAtUtc }))?.runAtUtc).toBeUndefined();
    });

    it.each(['', '7:30', '24:00', '23:60', '0600', '06:00:00', 'noon'])(
      'refuses %s',
      (runAtUtc) => {
        expect(validateBudgetSchedule(draft({ runAtUtc }))?.runAtUtc).toBeDefined();
      }
    );
  });

  describe('amount', () => {
    it.each(['2', '15.50', '0.000001', '1234.56'])('accepts %s', (amount) => {
      expect(validateBudgetSchedule(draft({ amount }))?.amount).toBeUndefined();
    });

    // A zero amount would zero every matching account under `reset`, and write no-op rows forever
    // under `top_up`. The backend refuses it; so does the form.
    it.each(['0', '0.00', '-1', '', 'abc', '1e6', '2.0000001'])('refuses %s', (amount) => {
      expect(validateBudgetSchedule(draft({ amount }))?.amount).toBeDefined();
    });
  });
});

describe('toBudgetScheduleWire', () => {
  it('converts a typed amount in integer minor units', () => {
    expect(toBudgetScheduleWire(draft({ amount: '8.09' })).amountMicros).toBe('8090000');
  });

  it('sends null, not an empty string, for a global schedule’s scope id', () => {
    const wire = toBudgetScheduleWire(draft({ scopeKind: 'global', scopeId: 'stale-leftover' }));
    expect(wire.scopeId).toBeNull();
  });

  it('sends null for a daily schedule’s anchor even when one is left over in the form', () => {
    expect(toBudgetScheduleWire(draft({ cadence: 'daily', anchor: '3' })).anchor).toBeNull();
  });

  it('sends the anchor as a number for weekly and monthly', () => {
    expect(toBudgetScheduleWire(draft({ cadence: 'weekly', anchor: '4' })).anchor).toBe(4);
    expect(toBudgetScheduleWire(draft({ cadence: 'monthly', anchor: '28' })).anchor).toBe(28);
  });

  it('trims the free-text fields', () => {
    const wire = toBudgetScheduleWire(
      draft({ name: '  padded  ', scopeKind: 'account', scopeId: ' acct_1 ', runAtUtc: ' 06:00 ' })
    );
    expect(wire).toMatchObject({ name: 'padded', scopeId: 'acct_1', runAtUtc: '06:00' });
  });

  it('carries no `enabled` field — the create procedure has none', () => {
    expect(toBudgetScheduleWire(draft({ enabled: true }))).not.toHaveProperty('enabled');
  });
});

describe('fromStoredBudgetSchedule', () => {
  const stored = {
    name: 'free-plan-monday-top-up',
    scopeKind: 'billing_plan',
    scopeId: 'free',
    cadence: 'weekly',
    anchor: 1,
    runAtUtc: '06:00',
    amountMicros: '15000000',
    mode: 'top_up',
    enabled: true,
  };

  // Unlike the refill-policy edit route (no read API for stored rule content), this one is a real
  // prefill — `listBudgetResetSchedules` returns every field.
  it('round-trips a stored schedule into the form and back onto the wire', () => {
    const value = fromStoredBudgetSchedule(stored);
    expect(value).toEqual(budgetScheduleFormWeeklyTopUp);
    expect(toBudgetScheduleWire(value)).toEqual({
      name: stored.name,
      scopeKind: stored.scopeKind,
      scopeId: stored.scopeId,
      cadence: stored.cadence,
      anchor: stored.anchor,
      runAtUtc: stored.runAtUtc,
      amountMicros: stored.amountMicros,
      mode: stored.mode,
    });
  });

  it('falls back to a known default for an unrepresentable wire value, and names it', () => {
    const odd = { ...stored, cadence: 'hourly', mode: 'drain', scopeKind: 'tenant' };
    const value = fromStoredBudgetSchedule(odd);
    expect(value.cadence).toBe('daily');
    expect(value.mode).toBe('reset');
    expect(value.scopeKind).toBe('global');
    expect(budgetScheduleUnknownFields(odd)).toEqual([
      'cadence "hourly"',
      'mode "drain"',
      'scope "tenant"',
    ]);
  });

  it('reports nothing unknown for a schedule the console fully understands', () => {
    expect(budgetScheduleUnknownFields(stored)).toEqual([]);
  });
});

describe('field visibility predicates', () => {
  it('hides the anchor for daily only', () => {
    expect(cadenceUsesAnchor('daily')).toBe(false);
    expect(cadenceUsesAnchor('weekly')).toBe(true);
    expect(cadenceUsesAnchor('monthly')).toBe(true);
  });

  it('hides the scope id for global only', () => {
    expect(scopeKindUsesScopeId('global')).toBe(false);
    expect(scopeKindUsesScopeId('billing_plan')).toBe(true);
    expect(scopeKindUsesScopeId('account')).toBe(true);
  });

  it('states the anchor range per cadence', () => {
    expect(anchorRange('daily')).toBeNull();
    expect(anchorRange('weekly')).toEqual({ min: 1, max: 7 });
    expect(anchorRange('monthly')).toEqual({ min: 1, max: 28 });
  });
});

describe('createBlankBudgetSchedule', () => {
  it('opens disabled — the backend creates every schedule disabled', () => {
    expect(createBlankBudgetSchedule().enabled).toBe(false);
  });

  // A blank draft is not submittable: the name and the amount both have to be typed. Asserting it
  // keeps a future "helpful" default amount from making an empty form saveable.
  it('is not submittable as-is', () => {
    expect(validateBudgetSchedule(createBlankBudgetSchedule())).toBeDefined();
  });
});
