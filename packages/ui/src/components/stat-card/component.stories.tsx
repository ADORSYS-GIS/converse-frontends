import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Stack } from '../stack';
import { StatCard } from './component';

const meta: Meta<typeof StatCard> = {
  title: 'UI/StatCard',
  component: StatCard,
  args: {
    label: 'Total requests',
    value: '11,207',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 220 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {};

export const WithTrendUp: Story = {
  args: {
    label: 'Daily average',
    value: '2,802',
    trend: { direction: 'up', label: '+12% vs last week' },
  },
};

export const WithTrendDown: Story = {
  args: {
    label: 'Error rate',
    value: '0.4%',
    trend: { direction: 'down', label: '-0.2pt vs last week' },
  },
};

export const WithDescription: Story = {
  args: {
    label: 'Peak day',
    value: '7,080',
    description: 'Jun 4, 2026',
  },
};

/** Three stat cards in a row, the layout this primitive is designed for. */
export const Row: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 700 }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Stack direction="row" gap="md">
      <div style={{ flex: 1, minWidth: 0 }}>
        <StatCard label="Total usage" value="11,207" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <StatCard label="Daily avg" value="2,802" trend={{ direction: 'up', label: '+12%' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <StatCard label="Peak day" value="7,080" description="Jun 4, 2026" />
      </div>
    </Stack>
  ),
};
