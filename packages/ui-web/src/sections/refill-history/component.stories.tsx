import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RefillHistory } from './component';
import {
  refillHistoryEmpty,
  refillHistoryError,
  refillHistoryLoading,
  refillHistoryReady,
  refillHistoryUnavailable,
} from './fixtures';

const meta: Meta<typeof RefillHistory> = {
  title: 'Sections/RefillHistory',
  component: RefillHistory,
  parameters: { layout: 'fullscreen' },
  args: { state: refillHistoryReady },
  decorators: [
    (Story) => (
      <div className="max-w-[560px] p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RefillHistory>;

export const Populated: Story = {};

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Empty: Story = { args: { state: refillHistoryEmpty } };

export const Loading: Story = { args: { state: refillHistoryLoading } };

export const ErrorState: Story = { args: { state: refillHistoryError } };

export const Unavailable: Story = { args: { state: refillHistoryUnavailable } };
