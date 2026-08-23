import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';

import { CHART_ACCENT, GREY_RAMP } from '../chart-core/colors';
import { ChartTooltip } from './component';

const meta: Meta<typeof ChartTooltip> = {
  title: 'UI/ChartTooltip',
  component: ChartTooltip,
  decorators: [
    (Story) => (
      <View
        style={{
          backgroundColor: '#000',
          padding: 24,
          width: 320,
          height: 200,
          position: 'relative',
        }}>
        <Story />
      </View>
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
    rows: [{ key: 'spend', label: 'Spend', value: '$482.10', color: GREY_RAMP[0] }],
  },
};

export const MultiSeries: Story = {
  args: {
    visible: true,
    x: 160,
    y: 120,
    title: 'Aug 21',
    rows: [
      { key: 'project-a', label: 'project-a', value: '$212.40', color: GREY_RAMP[0] },
      { key: 'project-b', label: 'project-b (over budget)', value: '$612.90', color: CHART_ACCENT },
      { key: 'project-c', label: 'project-c', value: '$88.00', color: GREY_RAMP[2] },
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
    rows: [{ key: 'spend', label: 'Spend', value: '$12.00', color: GREY_RAMP[0] }],
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
