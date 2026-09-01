import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SpendShareSection } from './component';
import { formatOverviewSpendShareTotal, overviewSpendShareSegments } from './fixtures';

const meta: Meta<typeof SpendShareSection> = {
  title: 'Sections/SpendShareSection',
  component: SpendShareSection,
  parameters: { layout: 'padded' },
  args: {
    segments: overviewSpendShareSegments,
    total: formatOverviewSpendShareTotal(),
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

/** Recreates the Overview screen's "Spend — share by project" zone, built from the same series
 * data `SpendDashboard`'s time series plots. Fully interactive. */
export const Populated: Story = {};

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
};

/** A project pre-selected, as the Overview page would drive it from `selectedSeriesKey`. */
export const Selected: Story = {
  args: { selectedKey: overviewSpendShareSegments[1].key },
};

/** One project has breached its budget ceiling -- its segment renders in the accent. */
export const Breached: Story = {
  args: {
    segments: overviewSpendShareSegments.map((segment, index) =>
      index === 0 ? { ...segment, breached: true } : segment,
    ),
  },
};

export const BreachedLight: Story = {
  name: 'Breached — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: Breached.args,
};

/**
 * The case that killed the donut: one series is essentially the whole total. As arcs, the two
 * minor projects were sub-pixel slivers indistinguishable from the ring; as bar segments they
 * hold `ShareBar`'s `MIN_VISIBLE_PERCENT` floor and stay readable, with `<1%` spelled out in the
 * list rather than rounded to a bare `0%`.
 */
export const LongTail: Story = {
  args: {
    segments: [
      { key: 'unassigned', label: 'unassigned', value: 1.35, formattedValue: '$1.35' },
      { key: 'wwl1', label: 'wwl1mftbqy2x7jqqek5s9s', value: 0.0001, formattedValue: '$0.0001' },
      { key: 'wcd6', label: 'wcd6epjstskvhdrmofmbu4r7', value: 0.015, formattedValue: '$0.015' },
    ],
    total: '$1.36',
  },
};

// README §6: structure stays rendered, a muted caption carries the "nothing yet" copy.
export const Empty: Story = {
  args: { segments: [], total: undefined },
};

export const EmptyLight: Story = {
  name: 'Empty — wireframe (light)',
  globals: { theme: 'wireframe' },
  args: { segments: [], total: undefined },
};

// #272 — no usage-backend query client exists yet; distinct wording from `Empty` above.
export const Unwired: Story = {
  args: { segments: [], total: undefined, status: 'unwired' },
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

// 2026-08-31 owner-round parity fix #3 — a single-segment breakdown states itself rather than
// drawing a flat, misleadingly-singular bar. Moved here from the account overview's own time-
// series chart (`SpendDashboard`'s equivalent `SpendDegenerate` story) — a single-series TIME
// SERIES stays a meaningful reading; a single-segment SHARE breakdown is the one that asserts a
// distribution the data doesn't have.
export const Degenerate: Story = {
  name: 'Spend by project — a single segment states itself, not a flat bar',
  args: {
    segments: overviewSpendShareSegments.slice(0, 1),
    degenerateMessage: `Only one project in this window (${overviewSpendShareSegments[0].label}).`,
  },
};
