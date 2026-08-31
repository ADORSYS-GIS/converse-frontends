import { describe, expect, it } from 'vitest';

import { ruleSetFormPopulated } from './fixtures';
import {
  createBlankRule,
  createBlankThreshold,
  toRuleDataJson,
  validateRuleSet,
} from './rule-set-validation';
import type { RuleSetValue } from './types';

describe('validateRuleSet', () => {
  it('returns undefined for a clean value', () => {
    expect(validateRuleSet(ruleSetFormPopulated)).toBeUndefined();
  });

  it('flags an empty policy revision', () => {
    const errors = validateRuleSet({ ...ruleSetFormPopulated, policyRevision: '  ' });
    expect(errors?.policyRevision).toBe('Policy revision must not be empty.');
  });

  it('flags an empty refill ladder', () => {
    const errors = validateRuleSet({ ...ruleSetFormPopulated, allowedAmounts: [] });
    expect(errors?.allowedAmountsSummary).toBe('Add at least one refill step.');
  });

  it('flags a non-ascending ladder', () => {
    const errors = validateRuleSet({ ...ruleSetFormPopulated, allowedAmounts: ['15', '6', '30'] });
    expect(errors?.allowedAmountsSummary).toBe('Refill steps must be strictly ascending.');
  });

  it('flags a duplicate ladder entry', () => {
    const errors = validateRuleSet({ ...ruleSetFormPopulated, allowedAmounts: ['6', '6', '30'] });
    expect(errors?.allowedAmountsSummary).toBe('Refill steps must be unique.');
  });

  it('flags a non-positive ladder amount per row', () => {
    const errors = validateRuleSet({ ...ruleSetFormPopulated, allowedAmounts: ['0', '15', '30'] });
    expect(errors?.allowedAmounts?.[0]).toBe('Enter a positive amount.');
  });

  it('flags a fail-closed floor above the starting amount — the cross-field invariant that matters most', () => {
    const errors = validateRuleSet({
      ...ruleSetFormPopulated,
      startingAmount: '6',
      failClosedFloorAmount: '15',
    });
    expect(errors?.failClosedFloorAmount).toMatch(/must not exceed the starting amount/);
  });

  it('allows the fail-closed floor to equal the starting amount', () => {
    const errors = validateRuleSet({
      ...ruleSetFormPopulated,
      startingAmount: '6',
      failClosedFloorAmount: '6',
    });
    expect(errors?.failClosedFloorAmount).toBeUndefined();
  });

  it('flags duplicate rule ids', () => {
    const value: RuleSetValue = {
      ...ruleSetFormPopulated,
      rules: [
        { ...createBlankRule(), key: 'a', id: 'dup', reasonCode: 'r' },
        { ...createBlankRule(), key: 'b', id: 'dup', reasonCode: 'r' },
      ],
    };
    const errors = validateRuleSet(value);
    expect(errors?.rules?.[1]?.id).toBe('Rule id must be unique.');
  });

  it('flags a threshold whose value does not parse for its field kind', () => {
    const value: RuleSetValue = {
      ...ruleSetFormPopulated,
      rules: [
        {
          ...createBlankRule(),
          id: 'r1',
          reasonCode: 'r',
          condition: {
            combinator: 'all',
            thresholds: [{ ...createBlankThreshold(), field: 'effective_balance_micros', value: 'nope' }],
          },
        },
      ],
    };
    const errors = validateRuleSet(value);
    expect(errors?.rules?.[0]?.thresholds?.[0]?.value).toBe('Enter a non-negative amount.');
  });

  it('flags a missing cap amount only when the effect is auto_approve_capped', () => {
    const value: RuleSetValue = {
      ...ruleSetFormPopulated,
      rules: [{ ...createBlankRule(), id: 'r1', reasonCode: 'r', effect: 'auto_approve_capped', capAmount: '' }],
    };
    const errors = validateRuleSet(value);
    expect(errors?.rules?.[0]?.capAmount).toBe('Enter a non-negative cap amount.');
  });
});

describe('toRuleDataJson', () => {
  it('serializes the shipped default policy to the exact wire shape rule_data.rs parses', () => {
    const parsed = JSON.parse(toRuleDataJson(ruleSetFormPopulated));
    expect(parsed).toEqual({
      policy_revision: 'budget-policy-v1',
      rules: [
        {
          id: 'within-unaided-allowance',
          condition: { type: 'threshold', field: 'self_service_grant_count', operator: 'lt', value: 2 },
          effect: 'auto_approve',
          reason_code: 'within_unaided_allowance',
        },
      ],
      default_effect: 'manual_review',
      default_reason_code: 'unaided_allowance_exhausted',
      allowed_amounts_micros: [6_000_000, 15_000_000, 30_000_000],
      starting_amount_micros: 15_000_000,
      fail_closed_floor_micros: 6_000_000,
    });
  });

  it('wraps two or more thresholds in the chosen combinator, never a bare Threshold', () => {
    const value: RuleSetValue = {
      ...ruleSetFormPopulated,
      rules: [
        {
          ...createBlankRule(),
          id: 'r1',
          reasonCode: 'r',
          condition: {
            combinator: 'any',
            thresholds: [
              { field: 'effective_balance_micros', operator: 'lt', value: '5' },
              { field: 'spend_last_period_micros', operator: 'lt', value: '1' },
            ],
          },
        },
      ],
    };
    const parsed = JSON.parse(toRuleDataJson(value));
    expect(parsed.rules[0].condition).toEqual({
      type: 'any',
      conditions: [
        { type: 'threshold', field: 'effective_balance_micros', operator: 'lt', value: 5_000_000 },
        { type: 'threshold', field: 'spend_last_period_micros', operator: 'lt', value: 1_000_000 },
      ],
    });
  });

  it('omits cap_micros entirely unless the effect is auto_approve_capped', () => {
    const value: RuleSetValue = {
      ...ruleSetFormPopulated,
      rules: [{ ...createBlankRule(), id: 'r1', reasonCode: 'r', effect: 'deny', capAmount: '10' }],
    };
    const parsed = JSON.parse(toRuleDataJson(value));
    expect(parsed.rules[0]).not.toHaveProperty('cap_micros');
  });

  it('includes cap_micros in micros when the effect is auto_approve_capped', () => {
    const value: RuleSetValue = {
      ...ruleSetFormPopulated,
      rules: [
        {
          ...createBlankRule(),
          id: 'r1',
          reasonCode: 'r',
          effect: 'auto_approve_capped',
          capAmount: '2',
        },
      ],
    };
    const parsed = JSON.parse(toRuleDataJson(value));
    expect(parsed.rules[0].cap_micros).toBe(2_000_000);
  });
});
