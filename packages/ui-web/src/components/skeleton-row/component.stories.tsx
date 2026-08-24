import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SkeletonRow } from './component';

const meta: Meta<typeof SkeletonRow> = {
  title: 'States/SkeletonRow',
  component: SkeletonRow,
};

export default meta;
type Story = StoryObj<typeof SkeletonRow>;

export const Default: Story = { args: { columnCount: 6 } };
export const ReviewDensity: Story = { args: { columnCount: 6, density: 'review' } };

export const StandaloneList: Story = {
  render: () => (
    <div className="flex w-[600px] flex-col">
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonRow key={i} columnCount={4} />
      ))}
    </div>
  ),
};
