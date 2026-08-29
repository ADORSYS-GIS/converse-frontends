import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { LatencyDashboard } from './component';
import { formatOverviewLatencyXTick, overviewLatencySeries } from './fixtures';

const meta: Meta<typeof LatencyDashboard> = {
  title: 'Sections/LatencyDashboard',
  component: LatencyDashboard,
  parameters: { layout: 'fullscreen' },
  args: {
    series: overviewLatencySeries,
    fallbackWidth: 528,
    height: 310,
    formatXTick: formatOverviewLatencyXTick,
  },
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LatencyDashboard>;

export const Populated: Story = {};

export const Empty: Story = { args: { series: [] } };

// #272 — no usage-backend query client exists yet; distinct wording from `Empty` above.
export const Unwired: Story = { args: { series: [], status: 'unwired' } };

export const Loading: Story = { args: { status: 'loading' } };

export const ErrorState: Story = {
  args: { status: 'error', errorMessage: 'Failed to load latency data.', onRetry: () => {} },
};

export const MobileBaseTier: Story = { globals: { viewport: { value: 'base390' } } };
