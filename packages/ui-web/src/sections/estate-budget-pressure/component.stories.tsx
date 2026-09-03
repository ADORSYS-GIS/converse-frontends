import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { EstateBudgetPressure } from './component';
import { estateBudgetPressureAccounts, estateBudgetPressureEmpty } from './fixtures';

const meta: Meta<typeof EstateBudgetPressure> = {
  title: 'Sections/Budget/EstateBudgetPressure',
  component: EstateBudgetPressure,
  parameters: { layout: 'fullscreen' },
  args: {
    accounts: estateBudgetPressureAccounts,
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
type Story = StoryObj<typeof EstateBudgetPressure>;

/**
 * `acme-labs` outspends every other row in raw dollars yet ranks third — the section sorts by
 * consumption RATIO, not spend, so `northwind-ai` (91% of a $500 ceiling) and `stark-infer` (92%
 * of a $200 ceiling) rank above it.
 */
export const Populated: Story = {};

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/** Queried and genuinely empty — an inline status line, with the heading still rendered. */
export const Empty: Story = { args: { accounts: estateBudgetPressureEmpty } };

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
