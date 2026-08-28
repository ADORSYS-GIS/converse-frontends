import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SectionSheetTrigger } from '../../components/section-sheet-trigger';
import { BudgetPanel } from './component';
import {
  overviewBudget,
  overviewEmptyBudget,
  overviewNeedsAttentionProject,
  overviewRefillRequestStatus,
  overviewUnwiredBudget,
} from './fixtures';

const meta: Meta<typeof BudgetPanel> = {
  title: 'Sections/BudgetPanel',
  component: BudgetPanel,
  parameters: { layout: 'fullscreen' },
  args: {
    budget: overviewBudget,
    needsAttentionProject: overviewNeedsAttentionProject,
    refillRequestStatus: overviewRefillRequestStatus,
  },
  decorators: [
    (Story) => (
      <div className="max-w-[320px] p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BudgetPanel>;

export const Populated: Story = {};

// Nothing near a ceiling and nothing pending — both optional blocks disappear entirely.
export const Empty: Story = {
  args: {
    budget: overviewEmptyBudget,
    needsAttentionProject: undefined,
    refillRequestStatus: undefined,
  },
};

// #273 — Overview's real state today: no budget query client exists yet. Distinct wording and
// layout from `Empty` above, which is a real wired account with genuinely zero consumption.
export const Unwired: Story = {
  args: {
    budget: overviewUnwiredBudget,
    needsAttentionProject: undefined,
    refillRequestStatus: undefined,
  },
};

// Past the warning threshold — the hero meter's fill turns `primary` (breach, not decoration).
export const Breached: Story = {
  args: { budget: { value: 478.4, ceiling: 500, caption: 'account ceiling · 96% used' } },
};

export const MdTierWithTrigger: Story = {
  globals: { viewport: { value: 'md900' } },
  args: {
    actions: (
      <SectionSheetTrigger icon="export" triggerLabel="Open export" label="EXPORT">
        <p className="text-ink font-mono text-xs">Export current view · CSV</p>
      </SectionSheetTrigger>
    ),
  },
};
