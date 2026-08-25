import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChartAxisBottom, ChartAxisLeft } from './component';

const meta: Meta<typeof ChartAxisBottom> = {
  title: 'Charts/ChartAxis',
  decorators: [
    (Story) => (
      <div className="bg-muted" style={{ padding: 24, width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChartAxisBottom>;

export const BottomAxis: Story = {
  render: () => (
    <svg width={360} height={60}>
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
    </svg>
  ),
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `BottomAxis` -- baseline/tick colour
// come from `--color-border`/`--color-subtle` via `chart-tokens.ts`, so this only needs the theme
// global, not a separate render.
export const BottomAxisLight: Story = {
  name: 'Bottom Axis — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => (
    <svg width={360} height={60}>
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
    </svg>
  ),
};

export const LeftAxis: Story = {
  render: () => (
    <svg width={80} height={220}>
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
    </svg>
  ),
};

/** Both axes together with gridlines, the way a real chart nests them. */
export const WithGridlines: Story = {
  render: () => (
    <svg width={360} height={220}>
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
    </svg>
  ),
};

/** An axis with no ticks renders nothing rather than a dangling baseline -- an empty-state chart. */
export const NoTicks: Story = {
  render: () => (
    <svg width={360} height={60}>
      <ChartAxisBottom y={20} ticks={[]} />
    </svg>
  ),
};
