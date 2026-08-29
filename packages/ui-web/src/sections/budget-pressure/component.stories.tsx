import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BudgetPressure } from './component';
import {
  ADMIN_BUDGET_PRESSURE_NOTE,
  ADMIN_CEILING,
  adminBudgetPressureEmpty,
  adminBudgetPressureProjects,
} from './fixtures';

const meta: Meta<typeof BudgetPressure> = {
  title: 'Sections/BudgetPressure',
  component: BudgetPressure,
  parameters: { layout: 'fullscreen' },
  args: {
    projects: adminBudgetPressureProjects,
    ceiling: ADMIN_CEILING,
    note: ADMIN_BUDGET_PRESSURE_NOTE,
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
type Story = StoryObj<typeof BudgetPressure>;

export const Populated: Story = {};

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/**
 * The top project is past the 0.9 breach threshold, so exactly one meter carries the accent — the
 * "orange at most once, only for the breached series" rule, applied to a list of meters.
 */
export const Breached: Story = {
  args: {
    projects: [
      { key: 'proj_gateway', name: 'gateway-prod', spend: 11.6 },
      { key: 'proj_ingest', name: 'ingest-batch', spend: 0.4 },
    ],
  },
};

/** Queried and genuinely empty — an inline status line, with the heading still rendered. */
export const Empty: Story = { args: { projects: adminBudgetPressureEmpty } };

/**
 * No ceiling could be read at all: the rows keep their real spend and drop their meters entirely,
 * rather than filling a track against a fabricated ceiling.
 */
export const NoCeiling: Story = {
  args: {
    ceiling: null,
    note: 'No account ceiling could be read, so these are bare spend figures — not a share of anything.',
  },
};

export const Loading: Story = { args: { status: 'loading' } };

export const Errored: Story = {
  args: {
    status: 'error',
    errorMessage: 'The usage backend is unreachable right now.',
    onRetry: () => {},
  },
};

/** Base tier (<600) — the designed phone target: nothing clips, nothing scrolls sideways. */
export const Mobile: Story = {
  globals: { viewport: { value: 'base390' } },
};

export const MobileLight: Story = {
  name: 'Mobile — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};
