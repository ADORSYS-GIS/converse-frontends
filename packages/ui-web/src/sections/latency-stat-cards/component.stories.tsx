import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { LatencyStatCards } from './component';
import { latencyStatRows, latencyStatRowsEmpty } from './fixtures';

const meta: Meta<typeof LatencyStatCards> = {
  title: 'Sections/LatencyStatCards',
  component: LatencyStatCards,
  parameters: { layout: 'fullscreen' },
  args: { rows: latencyStatRows },
  decorators: [
    (Story) => (
      <div className="bg-muted p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LatencyStatCards>;

export const Populated: Story = {};

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/** Every row has zero latency-bearing samples — the whole zone renders one inline status line. */
export const Empty: Story = {
  args: { rows: latencyStatRowsEmpty },
};
