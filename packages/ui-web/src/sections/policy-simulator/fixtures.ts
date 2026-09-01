import { ruleSetFormPopulated } from '../rule-set-form/fixtures';
import { scenarioFormPopulated } from '../refill-scenario-form/fixtures';
import type { PolicySimulatorProps } from './types';

const noop = () => undefined;

export const policySimulatorBase: PolicySimulatorProps = {
  ruleSet: ruleSetFormPopulated,
  onRuleSetChange: noop,
  scenario: scenarioFormPopulated,
  onScenarioChange: noop,
  requestedAmount: '25.00',
  onRequestedAmountChange: noop,
  submitting: false,
  canSubmit: true,
  onSubmit: noop,
};

export const policySimulatorResult: PolicySimulatorProps = {
  ...policySimulatorBase,
  result: {
    effect: 'auto_approve',
    approvedAmount: 25,
    maximumAmount: 50,
    reasonCodes: ['within_unaided_allowance'],
    matchedRuleIds: ['within-unaided-allowance'],
    policyRevision: 'budget-policy-v1',
    requiredApproverRole: null,
  },
};

export const policySimulatorSubmitting: PolicySimulatorProps = {
  ...policySimulatorBase,
  submitting: true,
  canSubmit: false,
};

export const policySimulatorError: PolicySimulatorProps = {
  ...policySimulatorBase,
  error: 'The simulation call failed — try again.',
};
