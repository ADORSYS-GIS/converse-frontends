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
    <div className="bg-surface flex w-[209px] flex-col gap-2 rounded-[2px] p-4">
      <span className="bg-raised h-3 w-24 rounded-[2px]" />
      <SkeletonMetric width={72} className="mt-3" />
      <span className="bg-raised mt-2 h-3 w-32 rounded-[2px]" />
    </div>
  ),
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `InStatCardShape`.
export const InStatCardShapeLight: Story = {
  name: 'In Stat Card Shape — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => (
    <div className="bg-surface flex w-[209px] flex-col gap-2 rounded-[2px] p-4">
      <span className="bg-raised h-3 w-24 rounded-[2px]" />
      <SkeletonMetric width={72} className="mt-3" />
      <span className="bg-raised mt-2 h-3 w-32 rounded-[2px]" />
    </div>
  ),
};
