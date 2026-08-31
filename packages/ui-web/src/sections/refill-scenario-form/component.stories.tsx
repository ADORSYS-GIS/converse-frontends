import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScenarioForm } from './component';
import { scenarioFormEmpty, scenarioFormErrors, scenarioFormPopulated, scenarioFormWithErrors } from './fixtures';
import type { ScenarioErrors, ScenarioValue } from './types';

function Controlled({ initial, errors }: { initial: ScenarioValue; errors?: ScenarioErrors }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="max-w-[480px] p-6">
      <ScenarioForm value={value} onChange={setValue} errors={errors} />
    </div>
  );
}

const meta: Meta<typeof Controlled> = {
  title: 'Sections/ScenarioForm',
  component: Controlled,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Controlled>;

export const Populated: Story = { args: { initial: scenarioFormPopulated } };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  args: { initial: scenarioFormPopulated },
  globals: { theme: 'wireframe' },
};

export const Empty: Story = { args: { initial: scenarioFormEmpty } };

export const ValidationErrors: Story = {
  args: { initial: scenarioFormWithErrors, errors: scenarioFormErrors },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'base390' } },
  args: { initial: scenarioFormPopulated },
};
