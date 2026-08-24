import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Sparkline } from './component';

const meta: Meta<typeof Sparkline> = {
  title: 'Data display/Sparkline',
  component: Sparkline,
};

export default meta;
type Story = StoryObj<typeof Sparkline>;

const trendingUp = [12, 14, 13, 16, 18, 17, 21, 24, 23, 27];
const trendingDown = [41, 38, 39, 35, 33, 34, 30, 28, 29, 25];
const flat = [10, 10, 11, 10, 9, 10, 10, 11, 10, 10];

export const TrendingUp: Story = { args: { data: trendingUp } };
export const TrendingDown: Story = { args: { data: trendingDown } };
export const Flat: Story = { args: { data: flat } };

export const RowOfFour: Story = {
  render: () => (
    <div className="flex items-center gap-8 rounded-[2px] bg-surface p-4">
      <Sparkline data={trendingUp} />
      <Sparkline data={flat} />
      <Sparkline data={trendingUp} />
      <Sparkline data={trendingDown} />
    </div>
  ),
};
