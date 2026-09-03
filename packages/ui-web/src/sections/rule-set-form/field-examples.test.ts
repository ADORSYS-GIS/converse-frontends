import { describe, expect, it } from 'vitest';

import { RULE_SET_FIELD_EXAMPLES, ruleSetFieldExample } from './field-examples';
import type { RuleSetFieldName } from './field-examples';

// The union is closed and the table is a `Record` over it, so "a field with no entry" is a compile
// error rather than something a test could catch. What a test CAN catch is an entry that exists but
// says nothing — an empty example, or an omission with no stated reason (issue #445).
const NAMES = Object.keys(RULE_SET_FIELD_EXAMPLES) as RuleSetFieldName[];

describe('RULE_SET_FIELD_EXAMPLES', () => {
  it('declares an example or an explicit, reasoned omission for every field', () => {
    for (const name of NAMES) {
      const entry = RULE_SET_FIELD_EXAMPLES[name];
      if ('example' in entry) {
        expect(entry.example.trim(), `${name} has an empty example`).not.toBe('');
        expect(entry.example, `${name} does not read as an example`).toMatch(/^e\.g\. /);
      } else {
        expect(entry.omitted.trim(), `${name} omits an example without saying why`).not.toBe('');
      }
    }
  });

  it('covers every field the form and the create route actually render', () => {
    expect(new Set(NAMES)).toEqual(
      new Set<RuleSetFieldName>([
        'policySetId',
        'policyRevision',
        'allowedAmounts',
        'startingAmount',
        'failClosedFloorAmount',
        'defaultEffect',
        'defaultReasonCode',
        'ruleId',
        'ruleEffect',
        'ruleCapAmount',
        'ruleReasonCode',
        'ruleCondition',
        'thresholdField',
        'thresholdOperator',
        'thresholdValue',
      ])
    );
  });

  it('matches the agreed sample strings the story names verbatim', () => {
    expect(ruleSetFieldExample('policySetId')).toBe('e.g. budget-refill-2026-09');
    expect(ruleSetFieldExample('allowedAmounts')).toBe('e.g. 2, 5, 10, 25');
    expect(ruleSetFieldExample('ruleCondition')).toBe(
      'e.g. self_service_grant_count ≥ 3 → manual_review'
    );
  });

  it('returns undefined for a slot whose omission is stated, never an empty string', () => {
    expect(ruleSetFieldExample('thresholdField')).toBeUndefined();
    expect(ruleSetFieldExample('thresholdOperator')).toBeUndefined();
    expect(ruleSetFieldExample('thresholdValue')).toBeUndefined();
  });
});
