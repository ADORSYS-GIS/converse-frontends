import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { OverviewStatRow } from './component';
import { overviewEmptyStatCards, overviewStatCards, overviewUnwiredStatCards } from './fixtures';

const meta: Meta<typeof OverviewStatRow> = {
  title: 'Sections/OverviewStatRow',
  component: OverviewStatRow,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OverviewStatRow>;

export const Populated: Story = { args: { cards: overviewStatCards } };

// §6 — the cards stay, carrying zeroes; nothing is hidden and no placard replaces them.
export const Empty: Story = { args: { cards: overviewEmptyStatCards } };

// #273 — Overview's real state today: PROJECTS/API KEYS counts are live, but no trend data
// exists yet, so no sparkline slot renders (rather than an empty/flat decorative one).
export const Unwired: Story = { args: { cards: overviewUnwiredStatCards } };

export const Loading: Story = { args: { cards: overviewStatCards, loading: true } };

// Base tier (<600): the row stacks to a single column.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  args: { cards: overviewStatCards },
};
