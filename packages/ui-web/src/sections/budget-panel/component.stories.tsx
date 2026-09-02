import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../../components/button';
import { BudgetPanel } from './component';
import {
  overviewBudget,
  overviewEmptyBudget,
  overviewErrorBudget,
  overviewLoadingBudget,
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

// Past the warning threshold — the hero meter's fill turns `primary` (breach, not decoration),
// and #306's inline `heroAction` sits beside the numeral (ADR 0008 Decision 7). IA v3 phase 3:
// this button navigates to `/accounts/<id>/refill` rather than opening a dialog — see
// `heroAction`'s own doc comment.
export const Breached: Story = {
  args: {
    budget: { value: 478.4, ceiling: 500, caption: 'account ceiling · 96% used' },
    heroAction: <Button size="sm">Request refill</Button>,
  },
};

// 2026-08-30 owner round ("budget refill form disappeared"): the standing, always-visible
// secondary action on the heading row — reachable well before any breach, unlike `heroAction`.
export const WithStandingRefillAction: Story = {
  name: 'With the standing "Request refill…" heading action (pre-breach)',
  args: {
    actions: (
      <Button type="button" variant="secondary" size="sm">
        Request refill…
      </Button>
    ),
  },
};

// #306 — the budget-balance/usage query is in flight.
export const Loading: Story = {
  args: {
    budget: overviewLoadingBudget,
    needsAttentionProject: undefined,
    refillRequestStatus: undefined,
  },
};

// #306 — the budget-balance/usage query ran and failed. Distinct from `Unwired`: this account has
// a real budget, the query for it just failed.
export const ErrorState: Story = {
  args: {
    budget: overviewErrorBudget,
    needsAttentionProject: undefined,
    refillRequestStatus: undefined,
  },
};
