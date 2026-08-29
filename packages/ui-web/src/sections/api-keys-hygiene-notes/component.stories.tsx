import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ApiKeysHygieneNotes } from './component';
import { apiKeysCleanHygiene, apiKeysHygiene } from './fixtures';

const meta: Meta<typeof ApiKeysHygieneNotes> = {
  title: 'Sections/ApiKeysHygieneNotes',
  component: ApiKeysHygieneNotes,
  parameters: { layout: 'padded' },
  args: { hygiene: apiKeysHygiene },
  // On the floor, not in a panel — this is an inline status block above the ledger now, not the
  // rail card it used to be (owner review 2026-08-29).
  decorators: [
    (Story) => (
      <div className="bg-muted p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ApiKeysHygieneNotes>;

export const Populated: Story = {};

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
};

// Nothing to report — the section renders nothing rather than an "all clear" placard.
export const Clean: Story = { args: { hygiene: apiKeysCleanHygiene } };

/** Only the actionable line — the single case that earns the accent. */
export const ExpiringOnly: Story = {
  args: {
    hygiene: { expiringCount: 1, expiringInDays: 30, neverUsedCount: 0, revokedRetainedCount: 0 },
  },
};
