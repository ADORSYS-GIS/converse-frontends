// The ONE sample policy behind "Start from example policy" on `/admin/refill-policies/create`
// (issue #445) — and behind `example-policy.test.ts`, which asserts `validateRuleSet` accepts it
// unchanged. Both read this file, so the button can never offer a draft the form itself rejects:
// if the schema or the validator moves under it, the test goes red rather than an admin
// discovering it at submit time.
//
// It is deliberately a FACTORY, not a frozen constant. `RuleValue.key` is a client-side React key
// (`generateRowKey()`, a fresh UUID) that must be unique within one mounted form; handing every
// caller the same three keys would make two forms on one page collide and would let a caller
// mutate the shared object.

import { generateRowKey } from './rule-set-validation';
import type { RuleSetValue } from './types';

/** The policy set id the example fills in — the same string `RULE_SET_FIELD_EXAMPLES.policySetId`
 *  shows as that field's example, so the button delivers exactly what the form advertises. */
export const EXAMPLE_POLICY_SET_ID = 'budget-refill-2026-09';

/**
 * A realistic, complete and VALID refill policy an admin can edit rather than author from an empty
 * form:
 *
 *  - Ladder `2 · 5 · 10 · 25` USD, a new account starting at `2`, fail-closed floor `1` (below the
 *    starting amount, as `validate` requires — an outage must never grant more than a signup).
 *  - Rule 1 auto-approves a caller's first two self-service refills of the period.
 *  - Rule 2 auto-approves but CAPS at $10 for a caller who barely spent anything last period.
 *  - Rule 3 sends everything else to a human.
 *
 * Rules are evaluated in order and the first match wins, so 1 → 2 → 3 reads top to bottom as
 * "free, then capped, then a human".
 */
export function createExampleRuleSet(): RuleSetValue {
  return {
    policyRevision: 'budget-refill-2026-09-r1',
    allowedAmounts: ['2', '5', '10', '25'],
    startingAmount: '2',
    failClosedFloorAmount: '1',
    defaultEffect: 'manual_review',
    defaultReasonCode: 'unaided_allowance_exhausted',
    rules: [
      {
        key: generateRowKey(),
        id: 'first-two-self-service-refills',
        reasonCode: 'within_unaided_allowance',
        effect: 'auto_approve',
        capAmount: '',
        condition: {
          combinator: 'all',
          thresholds: [{ field: 'self_service_grant_count', operator: 'lt', value: '2' }],
        },
      },
      {
        key: generateRowKey(),
        id: 'capped-when-prior-spend-was-low',
        reasonCode: 'capped_low_prior_spend',
        effect: 'auto_approve_capped',
        capAmount: '10',
        condition: {
          combinator: 'all',
          thresholds: [{ field: 'spend_last_period_micros', operator: 'lt', value: '5' }],
        },
      },
      {
        key: generateRowKey(),
        id: 'review-everything-else',
        reasonCode: 'unaided_allowance_exhausted',
        effect: 'manual_review',
        capAmount: '',
        condition: {
          combinator: 'all',
          thresholds: [{ field: 'self_service_grant_count', operator: 'gte', value: '2' }],
        },
      },
    ],
  };
}
