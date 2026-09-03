import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RuleSetForm } from './component';
import { createExampleRuleSet } from './example-policy';
import {
  ruleSetFormEmpty,
  ruleSetFormErrors,
  ruleSetFormPopulated,
  ruleSetFormWithErrors,
  ruleSetFormWithGroupedRule,
} from './fixtures';
import type { RuleSetErrors, RuleSetValue } from './types';

function Controlled({ initial, errors }: { initial: RuleSetValue; errors?: RuleSetErrors }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="max-w-[640px] p-6">
      <RuleSetForm value={value} onChange={setValue} errors={errors} />
    </div>
  );
}

const meta: Meta<typeof Controlled> = {
  title: 'Sections/RuleSetForm',
  component: Controlled,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Controlled>;

export const Populated: Story = { args: { initial: ruleSetFormPopulated } };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  args: { initial: ruleSetFormPopulated },
  globals: { theme: 'wireframe' },
};

export const GroupedConditions: Story = {
  name: 'A rule with ANY-combined conditions + a capped effect',
  args: { initial: ruleSetFormWithGroupedRule },
};

export const Empty: Story = {
  name: 'Empty — first-run draft, every field carrying its example',
  args: { initial: ruleSetFormEmpty },
};

export const EmptyLight: Story = {
  name: 'Empty — wireframe (light)',
  args: { initial: ruleSetFormEmpty },
  globals: { theme: 'wireframe' },
};

// The exact draft `/admin/refill-policies/create`'s "Start from example policy" fills in — the one
// `example-policy.test.ts` asserts `validateRuleSet` accepts unchanged (issue #445). Three rules:
// free, then capped, then a human.
export const ExamplePolicy: Story = {
  name: 'The example policy — free, then capped, then a human',
  args: { initial: createExampleRuleSet() },
};

export const ExamplePolicyLight: Story = {
  name: 'The example policy — wireframe (light)',
  args: { initial: createExampleRuleSet() },
  globals: { theme: 'wireframe' },
};

export const ValidationErrors: Story = {
  name: 'Every field-level error at once',
  args: { initial: ruleSetFormWithErrors, errors: ruleSetFormErrors },
};

// An example and an error under one label — the example stays put, the error is the signal-coloured
// line beneath the control.
export const ValidationErrorsLight: Story = {
  name: 'Every field-level error at once — wireframe (light)',
  args: { initial: ruleSetFormWithErrors, errors: ruleSetFormErrors },
  globals: { theme: 'wireframe' },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'base390' } },
  args: { initial: ruleSetFormPopulated },
};
