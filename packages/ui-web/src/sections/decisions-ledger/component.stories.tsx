import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { DecisionsLedger } from './component';
import { recentDecisionsFixture } from './fixtures';

const meta: Meta<typeof DecisionsLedger> = {
  title: 'Sections/DecisionsLedger',
  component: DecisionsLedger,
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
type Story = StoryObj<typeof DecisionsLedger>;

export const Populated: Story = {
  args: {
    decisions: recentDecisionsFixture,
    pagination: { shown: 6, total: 26, hasPrev: false, hasNext: true },
  },
};

// §6 — the header row stays rendered; nothing replaces the table.
export const Empty: Story = { args: { decisions: [] } };

export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  args: { decisions: recentDecisionsFixture },
};
