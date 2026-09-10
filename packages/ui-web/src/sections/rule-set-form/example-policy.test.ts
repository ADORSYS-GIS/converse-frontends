import { describe, expect, it } from 'vitest';

import { createExampleRuleSet, EXAMPLE_POLICY_SET_ID } from './example-policy';
import { RULE_SET_FIELD_EXAMPLES } from './field-examples';
import { toRuleDataJson, validateRuleSet } from './rule-set-validation';

/**
 * THE guard the story exists for (issue #445): "Start from example policy" hands an admin a draft
 * they are meant to be able to submit unchanged, so the sample must pass the form's OWN validator.
 * If a future schema or validation change invalidates it, this test goes red — the example cannot
 * rot silently into a draft that fails at submit time.
 */
describe('createExampleRuleSet', () => {
  it('passes validateRuleSet unchanged — the example is submittable as-is', () => {
    expect(validateRuleSet(createExampleRuleSet())).toBeUndefined();
  });

  it('carries the ladder, starting amount and floor the story specifies', () => {
    const example = createExampleRuleSet();

    expect(example.allowedAmounts).toEqual(['2', '5', '10', '25']);
    expect(example.startingAmount).toBe('2');
    expect(example.failClosedFloorAmount).toBe('1');
  });

  it('carries the three rules: free, then capped, then a human', () => {
    const example = createExampleRuleSet();

    expect(example.rules).toHaveLength(3);

    const [free, capped, review] = example.rules;
    expect(free.effect).toBe('auto_approve');
    expect(free.condition.thresholds).toEqual([
      { field: 'self_service_grant_count', operator: 'lt', value: '2' },
    ]);

    expect(capped.effect).toBe('auto_approve_capped');
    expect(capped.capAmount).toBe('10');
    expect(capped.condition.thresholds).toEqual([
      { field: 'spend_last_period_micros', operator: 'lt', value: '5' },
    ]);

    expect(review.effect).toBe('manual_review');
  });

  it('serializes to the wire shape with money already in integer micro-USD', () => {
    const wire = JSON.parse(toRuleDataJson(createExampleRuleSet()));

    expect(wire.allowed_amounts_micros).toEqual([2_000_000, 5_000_000, 10_000_000, 25_000_000]);
    expect(wire.starting_amount_micros).toBe(2_000_000);
    expect(wire.fail_closed_floor_micros).toBe(1_000_000);
    // The count field stays a plain integer; only the four `_micros` fields are converted.
    expect(wire.rules[0].condition.value).toBe(2);
    expect(wire.rules[1].condition.value).toBe(5_000_000);
    expect(wire.rules[1].cap_micros).toBe(10_000_000);
  });

  it('hands every rule row its own fresh React key, so two mounted forms never collide', () => {
    const first = createExampleRuleSet();
    const second = createExampleRuleSet();

    const keys = first.rules.map((rule) => rule.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(second.rules.map((rule) => rule.key)).not.toEqual(keys);
  });

  it('delivers exactly the policy set id that field advertises as its example', () => {
    const entry = RULE_SET_FIELD_EXAMPLES.policySetId;
    expect(entry).toHaveProperty('example');
    expect('example' in entry ? entry.example : '').toContain(EXAMPLE_POLICY_SET_ID);
  });
});
