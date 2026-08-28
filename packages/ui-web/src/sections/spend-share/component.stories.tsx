import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SpendShareSection } from './component';
import {
  formatOverviewSpendShareCentre,
  formatOverviewSpendShareValue,
  overviewSpendShareSlices,
} from './fixtures';

const meta: Meta<typeof SpendShareSection> = {
  title: 'Sections/SpendShareSection',
  component: SpendShareSection,
  parameters: { layout: 'padded' },
  args: {
    slices: overviewSpendShareSlices,
    size: 200,
    centreMetric: formatOverviewSpendShareCentre(),
    centreLabel: 'TOTAL',
    formatTooltipValue: formatOverviewSpendShareValue,
    formatLegendValue: formatOverviewSpendShareValue,
  },
  decorators: [
    (Story) => (
      <div className="bg-muted p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SpendShareSection>;

/** Recreates the Overview screen's SPEND — SHARE BY PROJECT dashboard, four projects from the
 * same series data `SpendDashboard`'s time series plots. Fully interactive. */
export const Populated: Story = {};

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/** A project pre-selected, as the Overview page would drive it from `selectedSeriesKey`. */
export const Selected: Story = {
  args: { selectedKey: overviewSpendShareSlices[1].key },
};

/** One project has breached its budget ceiling -- its wedge renders in the accent. */
export const Breached: Story = {
  args: {
    slices: overviewSpendShareSlices.map((slice, index) =>
      index === 0 ? { ...slice, breached: true } : slice
    ),
  },
};

export const BreachedLight: Story = {
  name: 'Breached — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: Breached.args,
};

// README §6: axes/structure stay rendered, a muted caption carries the "nothing yet" copy, same
// ring-skeleton geometry the loading state uses.
export const Empty: Story = {
  args: { slices: [], centreMetric: undefined, centreLabel: undefined },
};

export const EmptyLight: Story = {
  name: 'Empty — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: { slices: [], centreMetric: undefined, centreLabel: undefined },
};

// #272 — no usage-backend query client exists yet; distinct wording from `Empty` above.
export const Unwired: Story = {
  args: { slices: [], centreMetric: undefined, centreLabel: undefined, status: 'unwired' },
};

export const UnwiredLight: Story = {
  name: 'Unwired — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: Unwired.args,
};

// README §6 loading rules: `raised` skeleton blocks matching final geometry, no spinner/shimmer.
export const Loading: Story = {
  args: { status: 'loading' },
};

// README §6 error rules: section-level ErrorLine + Retry.
export const ErrorState: Story = {
  name: 'Error',
  args: { status: 'error', errorMessage: 'Failed to load spend share.' },
};
