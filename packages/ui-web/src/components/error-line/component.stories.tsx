import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ErrorLine } from './component';

const meta: Meta<typeof ErrorLine> = {
  title: 'States/ErrorLine',
  component: ErrorLine,
};

export default meta;
type Story = StoryObj<typeof ErrorLine>;

export const Retryable: Story = {
  args: { message: 'Failed to load usage for this range.', onRetry: () => {} },
};

export const NonRetryable: Story = {
  args: { message: "That's not a valid sign-in provider response." },
};

export const InPlaceOfAStatCardMetric: Story = {
  render: () => (
    <div className="flex w-[209px] flex-col gap-2 rounded-[2px] bg-surface p-4">
      <span className="font-mono text-[10px] uppercase tracking-[.09em] text-subtle">
        SPEND THIS MONTH
      </span>
      <ErrorLine message="Failed to load" onRetry={() => {}} />
    </div>
  ),
};
