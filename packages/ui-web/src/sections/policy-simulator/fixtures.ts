import type { PolicySimulatorProps } from './types';

const noop = () => undefined;

export const policySimulatorBase: PolicySimulatorProps = {
  ruleDataJson: '{"rules":[]}',
  onRuleDataJsonChange: noop,
  scenarioJson: '{}',
  onScenarioJsonChange: noop,
  requestedAmount: '25.00',
  onRequestedAmountChange: noop,
  submitting: false,
  canSubmit: true,
  onSubmit: noop,
};

export const policySimulatorResult: PolicySimulatorProps = {
  ...policySimulatorBase,
  result: {
    effect: 'allow',
    approvedAmount: 25,
    maximumAmount: 50,
    reasonCodes: ['within_limit'],
    matchedRuleIds: ['rule_1'],
    policyRevision: 'rev_3',
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
  error: 'Rule data is not valid JSON.',
};
