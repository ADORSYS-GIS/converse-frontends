import { describe, expect, it } from 'vitest';

import { scenarioFormPopulated } from './fixtures';
import { toScenarioJson, validateScenario } from './scenario-validation';

describe('validateScenario', () => {
  it('returns undefined for a clean value', () => {
    expect(validateScenario(scenarioFormPopulated)).toBeUndefined();
  });

  it('does not require an amount for an unavailable spend field', () => {
    const errors = validateScenario({
      ...scenarioFormPopulated,
      spendLastPeriodKnown: false,
      spendLastPeriod: '',
    });
    expect(errors).toBeUndefined();
  });

  it('requires a valid amount once a spend field is marked known', () => {
    const errors = validateScenario({
      ...scenarioFormPopulated,
      spendLastPeriodKnown: true,
      spendLastPeriod: '',
    });
    expect(errors?.spendLastPeriod).toBe('Enter a non-negative amount, or mark spend unavailable.');
  });

  it('flags a non-integer grant count', () => {
    const errors = validateScenario({ ...scenarioFormPopulated, selfServiceGrantCount: '1.5' });
    expect(errors?.selfServiceGrantCount).toBe('Enter a whole number, 0 or greater.');
  });
});

describe('toScenarioJson', () => {
  it('serializes a known/unavailable pair to the exact Facts wire shape', () => {
    const parsed = JSON.parse(toScenarioJson(scenarioFormPopulated));
    expect(parsed).toEqual({
      effective_balance_micros: 42_000_000,
      self_service_grant_count: 1,
      spend_this_period: { status: 'known', amount_micros: 10_000_000 },
      spend_last_period: { status: 'unavailable' },
    });
  });
});
