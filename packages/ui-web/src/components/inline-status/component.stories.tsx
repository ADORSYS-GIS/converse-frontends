import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../button';
import { StatusText } from '../status-text';
import { InlineStatus } from './component';

const meta: Meta<typeof InlineStatus> = {
  title: 'States/InlineStatus',
  component: InlineStatus,
};

export default meta;
type Story = StoryObj<typeof InlineStatus>;

// api-keys.svg populated status line.
export const Populated: Story = {
  render: () => (
    <InlineStatus>
      <StatusText tone="active">23 active</StatusText>
      <span className="text-subtle"> · 4 revoked · </span>
      <StatusText tone="attention">1 expires in 6 days</StatusText>
    </InlineStatus>
  ),
};

export const EmptyList: Story = {
  render: () => <InlineStatus>No keys in this project yet. Create one from the right.</InlineStatus>,
};

export const NoPendingReviews: Story = {
  render: () => (
    <InlineStatus>Nothing awaiting a decision. 26 decided this month.</InlineStatus>
  ),
};

export const FilterReturnsNothing: Story = {
  render: () => (
    <InlineStatus action={<Button variant="ghost" size="sm">Reset filters</Button>}>
      No keys match the current filters.
    </InlineStatus>
  ),
};

export const ChartNoDataInRange: Story = {
  render: () => <InlineStatus>No usage in this range.</InlineStatus>,
};
