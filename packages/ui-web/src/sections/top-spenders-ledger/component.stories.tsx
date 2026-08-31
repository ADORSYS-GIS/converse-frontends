import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { TopSpendersLedger } from './component';
import { topSpendersEmpty, topSpendersFixture } from './fixtures';

const meta: Meta<typeof TopSpendersLedger> = {
  title: 'Sections/TopSpendersLedger',
  component: TopSpendersLedger,
  parameters: { layout: 'fullscreen' },
  args: {
    rows: topSpendersFixture,
  },
  // On the floor, uncontained — the section never panels itself (console-ui skill).
  decorators: [
    (Story) => (
      <div className="bg-muted p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TopSpendersLedger>;

export const Populated: Story = {};

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/** Queried and genuinely empty — an inline status line, with the table headers still rendered. */
export const Empty: Story = { args: { rows: topSpendersEmpty } };

export const Loading: Story = { args: { loading: true } };

export const Errored: Story = {
  args: {
    rows: [],
    error: 'The usage backend is unreachable right now.',
    onRetry: () => {},
  },
};

/** Base tier (<600) — the ledger scrolls horizontally inside its own box; the page never does. */
export const Mobile: Story = {
  globals: { viewport: { value: 'base390' } },
};

export const MobileLight: Story = {
  name: 'Mobile — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};
