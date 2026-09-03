import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { RefineOverviewScreen } from './refine-overview-screen';
import { withRefineMock } from './refine-decorator';

// `useCustom({ url: 'overview' })` against the mock provider's aggregation endpoint — console-ui
// skill "Refine-driven mock screens": "useCustom or useList aggregations from fixtures".
const meta: Meta<typeof RefineOverviewScreen> = {
  title: 'Refine/Overview',
  component: RefineOverviewScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof RefineOverviewScreen>;

// `useCustom` starts loading (stat-card / chart skeletons), then resolves the aggregated overview
// snapshot from the mock provider — the live loading→populated transition named in the task.
export const Populated: Story = {
  decorators: [withRefineMock({ latencyMs: [300, 600] })],
  render: () => (
    <div className="w-full">
      <RefineOverviewScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // "$142.55" alone is ambiguous once loaded — BudgetHero echoes the same figure the SPEND THIS
    // MONTH stat card shows (docs/design/console-redesign/overview.svg's own mock numbers), so key
    // off the stat card's label instead.
    await waitFor(() => expect(canvas.getByText('Spend this month')).toBeInTheDocument(), {
      timeout: 3000,
    });
    await waitFor(() => expect(canvas.getAllByText('$142.55').length).toBeGreaterThan(0));
  },
};

// The `overview` custom endpoint rejects — the SPEND and SPEND BY MODEL zones render their
// section-level error line + Retry in place of the chart/ranked list.
export const ErrorMode: Story = {
  decorators: [
    withRefineMock({
      latencyMs: [10, 20],
      errorResources: { overview: 'Failed to load overview data.' },
    }),
  ],
  render: () => (
    <div className="w-full">
      <RefineOverviewScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () => expect(canvas.getAllByText('Failed to load overview data.').length).toBeGreaterThan(0),
      {
        timeout: 3000,
      }
    );
  },
};
