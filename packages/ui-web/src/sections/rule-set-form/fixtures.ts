import type { RuleSetErrors, RuleSetValue } from './types';

const noop = () => undefined;

/** Mirrors `default_rule_set_json()` (`rule_data.rs`) — ADR-0008's actual shipped policy, typed. */
export const ruleSetFormPopulated: RuleSetValue = {
  policyRevision: 'budget-policy-v1',
  rules: [
    {
      key: 'rule_1',
      id: 'within-unaided-allowance',
      reasonCode: 'within_unaided_allowance',
      effect: 'auto_approve',
      capAmount: '',
      condition: {
        combinator: 'all',
        thresholds: [{ field: 'self_service_grant_count', operator: 'lt', value: '2' }],
      },
    },
  ],
  defaultEffect: 'manual_review',
  defaultReasonCode: 'unaided_allowance_exhausted',
  allowedAmounts: ['6', '15', '30'],
  startingAmount: '15',
  failClosedFloorAmount: '6',
};

/** A blank first-run draft — one empty ladder step, no rules yet. */
export const ruleSetFormEmpty: RuleSetValue = {
  policyRevision: '',
  rules: [],
  defaultEffect: 'manual_review',
  defaultReasonCode: '',
  allowedAmounts: [''],
  startingAmount: '',
  failClosedFloorAmount: '',
};

/** A rule with two ANY-combined conditions, and a capped-effect rule needing its own cap amount —
 *  exercises the combinator select and the conditional cap field. */
export const ruleSetFormWithGroupedRule: RuleSetValue = {
  ...ruleSetFormPopulated,
  rules: [
    ...ruleSetFormPopulated.rules,
    {
      key: 'rule_2',
      id: 'low-balance-or-low-spend',
      reasonCode: 'capped_review',
      effect: 'auto_approve_capped',
      capAmount: '10',
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

/** Every field-level error this form can produce at once — the validation-error story. */
export const ruleSetFormErrors: RuleSetErrors = {
  policyRevision: 'Policy revision must not be empty.',
  defaultReasonCode: 'Default reason code must not be empty.',
  allowedAmounts: [undefined, 'Enter a positive amount.'],
  allowedAmountsSummary: 'Refill steps must be strictly ascending.',
  startingAmount: 'Enter a positive starting amount.',
  failClosedFloorAmount:
    'The fail-closed floor must not exceed the starting amount — an outage must never grant more than a new signup would get.',
  rules: [
    {
      id: 'Rule id must not be empty.',
      thresholds: [{ value: 'Enter a whole number, 0 or greater.' }],
    },
  ],
};

export const ruleSetFormWithErrors: RuleSetValue = {
  policyRevision: '',
  rules: [
    {
      key: 'rule_1',
      id: '',
      reasonCode: 'default',
      effect: 'auto_approve',
      capAmount: '',
      condition: {
        combinator: 'all',
        thresholds: [{ field: 'self_service_grant_count', operator: 'lt', value: 'nope' }],
      },
    },
  ],
  defaultEffect: 'manual_review',
  defaultReasonCode: '',
  allowedAmounts: ['15', '-5'],
  startingAmount: '',
  failClosedFloorAmount: '30',
};

export const ruleSetFormFixtureCallbacks = { onChange: noop };
