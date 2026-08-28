import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SectionSheetTrigger } from '../../components/section-sheet-trigger';
import { SpendDashboard } from './component';
import {
  formatOverviewSpendLegendValue,
  formatOverviewSpendTooltipValue,
  formatOverviewSpendXTick,
  formatOverviewSpendYTick,
  overviewSpendSeries,
} from './fixtures';

const meta: Meta<typeof SpendDashboard> = {
  title: 'Sections/SpendDashboard',
  component: SpendDashboard,
  parameters: { layout: 'fullscreen' },
  args: {
    series: overviewSpendSeries,
    fallbackWidth: 872,
    height: 176,
    formatXTick: formatOverviewSpendXTick,
    formatYTick: formatOverviewSpendYTick,
    formatTooltipValue: formatOverviewSpendTooltipValue,
    formatLegendValue: formatOverviewSpendLegendValue,
  },
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SpendDashboard>;

export const Populated: Story = {};

// §6 — the axes and heading stay; the chart simply has nothing to draw (a query ran and found
// zero rows — different from `Unwired` below, where no query has ever run).
export const Empty: Story = { args: { series: [] } };

// #272 — the real state of Overview's SPEND zone today: no usage-backend query client exists yet.
// Axes stay rendered; the inline status line names the real reason, distinct from `Empty`'s
// "No usage in this range." (which would falsely imply a query ran).
export const Unwired: Story = { args: { series: [], status: 'unwired' } };

export const Loading: Story = { args: { status: 'loading' } };

export const ErrorState: Story = {
  args: { status: 'error', errorMessage: 'Failed to load spend data.', onRetry: () => {} },
};

// Compact tier: the VIEW/FILTERS triggers appear on the heading row, since the rail is gone.
export const MdTierWithTriggers: Story = {
  globals: { viewport: { value: 'md900' } },
  args: {
    actions: (
      <>
        <SectionSheetTrigger icon="view" triggerLabel="Open view options" label="VIEW">
          <p className="text-ink font-mono text-xs">Range · Bucket · Group by</p>
        </SectionSheetTrigger>
        <SectionSheetTrigger icon="filter" triggerLabel="Open filters" label="FILTERS">
          <p className="text-ink font-mono text-xs">Account · Project · Model</p>
        </SectionSheetTrigger>
      </>
    ),
  },
};

export const MobileBaseTier: Story = { globals: { viewport: { value: 'base390' } } };
