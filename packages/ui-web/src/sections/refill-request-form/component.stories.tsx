import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RefillRequestForm } from './component';
import {
  refillFormEmpty,
  refillFormError,
  refillFormLoading,
  refillFormReady,
  refillFormSubmitError,
  refillFormSubmitting,
  refillFormUnavailable,
} from './fixtures';

const meta: Meta<typeof RefillRequestForm> = {
  title: 'Sections/Admin/RefillRequestForm',
  component: RefillRequestForm,
  parameters: { layout: 'fullscreen' },
  args: { state: refillFormReady },
  decorators: [
    (Story) => (
      <div className="max-w-[360px] p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RefillRequestForm>;

export const Ready: Story = {};

export const ReadyLight: Story = {
  name: 'Ready — wireframe (light)',
  globals: { theme: 'wireframe' },
};

export const Submitting: Story = { args: { state: refillFormSubmitting } };

export const SubmitError: Story = { args: { state: refillFormSubmitError } };

export const Empty: Story = { args: { state: refillFormEmpty } };

// Phase 2d account-scoping audit: a scoped account that is not the caller's home account.
export const Unavailable: Story = { args: { state: refillFormUnavailable } };

export const Loading: Story = { args: { state: refillFormLoading } };

export const ErrorState: Story = { args: { state: refillFormError } };
