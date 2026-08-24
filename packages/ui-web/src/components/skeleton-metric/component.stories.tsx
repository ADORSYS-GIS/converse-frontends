import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SkeletonMetric } from './component';

const meta: Meta<typeof SkeletonMetric> = {
  title: 'States/SkeletonMetric',
  component: SkeletonMetric,
};

export default meta;
type Story = StoryObj<typeof SkeletonMetric>;

export const Default: Story = {};

export const InStatCardShape: Story = {
  render: () => (
    <div className="flex w-[209px] flex-col gap-2 rounded-[2px] bg-surface p-4">
      <span className="h-3 w-24 rounded-[2px] bg-raised" />
      <SkeletonMetric width={72} className="mt-3" />
      <span className="mt-2 h-3 w-32 rounded-[2px] bg-raised" />
    </div>
  ),
};
