import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RefillPolicyStatusStrip } from './component';
import {
  refillPolicyStatusError,
  refillPolicyStatusLoading,
  refillPolicyStatusReady,
  refillPolicyStatusUnavailable,
} from './fixtures';

const meta: Meta<typeof RefillPolicyStatusStrip> = {
  title: 'Sections/RefillPolicyStatusStrip',
  component: RefillPolicyStatusStrip,
  parameters: { layout: 'fullscreen' },
  args: refillPolicyStatusReady,
  decorators: [
    (Story) => (
      <div className="max-w-[640px] p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RefillPolicyStatusStrip>;

export const Ready: Story = {};

export const ReadyLight: Story = {
  name: 'Ready — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Loading: Story = { args: refillPolicyStatusLoading };

export const ErrorState: Story = { args: refillPolicyStatusError };

export const Unavailable: Story = { args: refillPolicyStatusUnavailable };
