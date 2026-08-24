import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SPEC_ACCENT, SPEC_GREY_RAMP } from '../../chart-tokens';
import { ChartTooltip } from './component';

const meta: Meta<typeof ChartTooltip> = {
  title: 'Charts/ChartTooltip',
  component: ChartTooltip,
  decorators: [
    (Story) => (
      <div style={{ background: '#000', padding: 24, width: 320, height: 200, position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChartTooltip>;

export const SingleRow: Story = {
  args: {
    visible: true,
    x: 160,
    y: 120,
    title: 'Aug 21',
    rows: [{ key: 'spend', label: 'Spend', value: '$482.10', color: SPEC_GREY_RAMP[0] }],
  },
};

export const MultiSeries: Story = {
  args: {
    visible: true,
    x: 160,
    y: 120,
    title: 'Aug 21',
    rows: [
      { key: 'project-a', label: 'project-a', value: '$212.40', color: SPEC_GREY_RAMP[0] },
      { key: 'project-b', label: 'project-b (over budget)', value: '$612.90', color: SPEC_ACCENT },
      { key: 'project-c', label: 'project-c', value: '$88.00', color: SPEC_GREY_RAMP[2] },
    ],
  },
};

/** Clamped near the chart's left edge so it never overflows the container. */
export const ClampedAtEdge: Story = {
  args: {
    visible: true,
    x: 8,
    y: 60,
    containerWidth: 272,
    rows: [{ key: 'spend', label: 'Spend', value: '$12.00', color: SPEC_GREY_RAMP[0] }],
  },
};

export const Hidden: Story = {
  args: {
    visible: false,
    x: 160,
    y: 120,
    rows: [{ key: 'spend', label: 'Spend', value: '$482.10' }],
  },
};
