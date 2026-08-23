import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Svg } from 'react-native-svg';

import { ChartAxisBottom, ChartAxisLeft } from './component';

const meta: Meta<typeof ChartAxisBottom> = {
  title: 'UI/ChartAxis',
  decorators: [
    (Story) => (
      <div style={{ background: '#000', padding: 24, width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChartAxisBottom>;

export const BottomAxis: Story = {
  render: () => (
    <Svg width={360} height={60}>
      <ChartAxisBottom
        y={20}
        ticks={[
          { position: 20, label: 'Mon' },
          { position: 110, label: 'Tue' },
          { position: 200, label: 'Wed' },
          { position: 290, label: 'Thu' },
          { position: 340, label: 'Fri' },
        ]}
      />
    </Svg>
  ),
};

export const LeftAxis: Story = {
  render: () => (
    <Svg width={80} height={220}>
      <ChartAxisLeft
        x={60}
        ticks={[
          { position: 10, label: '$400' },
          { position: 60, label: '$300' },
          { position: 110, label: '$200' },
          { position: 160, label: '$100' },
          { position: 200, label: '$0' },
        ]}
      />
    </Svg>
  ),
};

/** Both axes together with gridlines, the way a real chart nests them. */
export const WithGridlines: Story = {
  render: () => (
    <Svg width={360} height={220}>
      <ChartAxisLeft
        x={44}
        gridWidth={300}
        ticks={[
          { position: 10, label: '400' },
          { position: 60, label: '300' },
          { position: 110, label: '200' },
          { position: 160, label: '100' },
          { position: 200, label: '0' },
        ]}
      />
      <ChartAxisBottom
        y={200}
        x1={44}
        x2={344}
        ticks={[
          { position: 64, label: 'Mon' },
          { position: 154, label: 'Tue' },
          { position: 244, label: 'Wed' },
          { position: 334, label: 'Thu' },
        ]}
      />
    </Svg>
  ),
};

/** An axis with no ticks renders nothing rather than a dangling baseline -- an empty-state chart. */
export const NoTicks: Story = {
  render: () => (
    <Svg width={360} height={60}>
      <ChartAxisBottom y={20} ticks={[]} />
    </Svg>
  ),
};
