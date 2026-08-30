import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { PolicySimulator } from './component';
import {
  policySimulatorBase,
  policySimulatorError,
  policySimulatorResult,
  policySimulatorSubmitting,
} from './fixtures';

const meta: Meta<typeof PolicySimulator> = {
  title: 'Sections/PolicySimulator',
  component: PolicySimulator,
  parameters: { layout: 'fullscreen' },
  args: policySimulatorBase,
  decorators: [
    (Story) => (
      <div className="max-w-[480px] p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PolicySimulator>;

export const Blank: Story = {};

export const BlankLight: Story = {
  name: 'Blank — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const WithResult: Story = { args: policySimulatorResult };

export const Submitting: Story = { args: policySimulatorSubmitting };

export const SubmitError: Story = { args: policySimulatorError };
