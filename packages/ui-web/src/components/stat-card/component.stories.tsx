import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Sparkline } from '../sparkline';
import { StatCard } from './component';

const meta: Meta<typeof StatCard> = {
  title: 'Primitives/Data/StatCard',
  component: StatCard,
};

export default meta;
type Story = StoryObj<typeof StatCard>;

const spendIcon = (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1">
    <path d="M0 12 V0 H12" />
  </svg>
);

export const Default: Story = {
  args: {
    icon: spendIcon,
    label: 'Spend this month',
    metric: '$142.55',
    delta: { direction: 'up', label: '18% vs prev 30d' },
    sparkline: <Sparkline data={[12, 14, 13, 16, 18, 17, 21, 24, 23, 27]} />,
  },
};

export const FlatDelta: Story = {
  args: {
    label: 'Active projects',
    metric: '6',
    delta: { direction: 'flat', label: 'no change' },
    sparkline: <Sparkline data={[6, 6, 6, 6, 6, 6, 6, 6, 6, 6]} />,
  },
};

export const DownDelta: Story = {
  args: {
    label: 'Requests today',
    metric: '41,208',
    delta: { direction: 'down', label: '8% vs yesterday' },
    sparkline: <Sparkline data={[41, 38, 39, 35, 33, 34, 30, 28, 29, 25]} />,
  },
};

export const NoSparklineOrDelta: Story = {
  args: {
    label: 'Active API keys',
    metric: '23',
  },
};

// overview.svg §5.1: the stat-card row is 4 × 209×104, 12px gutters.
export const RowOfFour: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-3" style={{ width: 872 }}>
      <StatCard
        icon={spendIcon}
        label="Spend this month"
        metric="$142.55"
        delta={{ direction: 'up', label: '18% vs prev 30d' }}
        sparkline={<Sparkline data={[12, 14, 13, 16, 18, 17, 21, 24, 23, 27]} />}
      />
      <StatCard
        label="Active projects"
        metric="6"
        delta={{ direction: 'flat', label: 'no change' }}
        sparkline={<Sparkline data={[6, 6, 6, 6, 6, 6, 6, 6, 6, 6]} />}
      />
      <StatCard
        label="Active API keys"
        metric="23"
        delta={{ direction: 'up', label: '2 this week' }}
        sparkline={<Sparkline data={[19, 20, 20, 21, 21, 22, 22, 23, 23, 23]} />}
      />
      <StatCard
        label="Requests today"
        metric="41,208"
        delta={{ direction: 'down', label: '8% vs yesterday' }}
        sparkline={<Sparkline data={[41, 38, 39, 35, 33, 34, 30, 28, 29, 25]} />}
      />
    </div>
  ),
};
