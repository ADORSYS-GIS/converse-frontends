import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { PolicySimulator } from './component';
import {
  policySimulatorBase,
  policySimulatorError,
  policySimulatorResult,
  policySimulatorSubmitting,
} from './fixtures';
import type { PolicySimulatorProps } from './types';

/** The real, controlled composition — `ruleSet`/`scenario` live in local state here exactly the
 *  way a future `apps/console` container would own them, so the two nested forms
 *  (`RuleSetForm`/`ScenarioForm`) are actually editable in Storybook rather than static props. */
function Controlled(initialProps: PolicySimulatorProps) {
  const [ruleSet, setRuleSet] = useState(initialProps.ruleSet);
  const [scenario, setScenario] = useState(initialProps.scenario);
  const [requestedAmount, setRequestedAmount] = useState(initialProps.requestedAmount);

  return (
    <div className="max-w-[640px] p-6">
      <PolicySimulator
        {...initialProps}
        ruleSet={ruleSet}
        onRuleSetChange={setRuleSet}
        scenario={scenario}
        onScenarioChange={setScenario}
        requestedAmount={requestedAmount}
        onRequestedAmountChange={setRequestedAmount}
      />
    </div>
  );
}

const meta: Meta<typeof Controlled> = {
  title: 'Sections/Admin/PolicySimulator',
  component: Controlled,
  parameters: { layout: 'fullscreen' },
  args: policySimulatorBase,
};

export default meta;
type Story = StoryObj<typeof Controlled>;

export const Blank: Story = {};

export const BlankLight: Story = {
  name: 'Blank — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const WithResult: Story = { args: policySimulatorResult };

export const Submitting: Story = { args: policySimulatorSubmitting };

export const SubmitError: Story = { args: policySimulatorError };

export const Mobile: Story = {
  globals: { viewport: { value: 'base390' } },
};
