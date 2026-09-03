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

/** The 390px tier — the cards stack to one column, and the three figure columns keep their grid
 *  inside a full-width card. The legibility check the owner's 2026-09-03 directive asks for is at
 *  BOTH ends: 1440 (four cards across, the tightest the figures ever get) and this. */
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};

/** Every row has zero latency-bearing samples — the whole zone renders one inline status line. */
export const Empty: Story = {
  args: { rows: latencyStatRowsEmpty },
};
