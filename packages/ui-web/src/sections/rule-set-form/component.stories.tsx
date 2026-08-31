import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RuleSetForm } from './component';
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
  name: 'Empty — first-run draft',
  args: { initial: ruleSetFormEmpty },
};

export const ValidationErrors: Story = {
  name: 'Every field-level error at once',
  args: { initial: ruleSetFormWithErrors, errors: ruleSetFormErrors },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'base390' } },
  args: { initial: ruleSetFormPopulated },
};
