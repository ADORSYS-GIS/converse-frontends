import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { RefineAdminBudgetReviewScreen } from './refine-admin-budget-review-screen';
import { withRefineMock } from './refine-decorator';

// `useTable` over `refill-requests` (pending), `useOne` for the selected request's detail, decide
// via `useCustomMutation` — console-ui skill "Refine-driven mock screens".
const meta: Meta<typeof RefineAdminBudgetReviewScreen> = {
  title: 'Refine/AdminBudgetReview',
  component: RefineAdminBudgetReviewScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof RefineAdminBudgetReviewScreen>;

export const Populated: Story = {
  decorators: [withRefineMock({ latencyMs: [300, 600] })],
  render: () => (
    <div className="w-full">
      <RefineAdminBudgetReviewScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('gateway-prod')).toBeInTheDocument(), { timeout: 3000 });
  },
};

// Selecting a pending row fetches its detail via `useOne` and opens the `DetailSheet`; approving
// it removes the row from the pending queue — the interaction flow named in the task ("approve a
// request -> row leaves pending queue").
export const ApproveFlow: Story = {
  decorators: [withRefineMock({ latencyMs: [10, 20] })],
  render: () => (
    <div className="w-full">
      <RefineAdminBudgetReviewScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('gateway-prod')).toBeInTheDocument(), { timeout: 3000 });

    const rows = canvas.getAllByRole('row').slice(1);
    await userEvent.click(rows[0]);

    const approveButton = await canvas.findByRole('button', { name: /Approve/ }, { timeout: 3000 });
    await userEvent.click(approveButton);

    await waitFor(() => expect(canvas.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument(), {
      timeout: 3000,
    });
    // The pending ledger's header row alone would leave 1 `row`; a decided request keeps a
    // shrinking-but-still-populated pending queue, so assert the request is simply gone from it.
    await waitFor(() => {
      const remaining = canvas.getAllByRole('row').slice(1).map((row) => row.textContent);
      expect(remaining.some((text) => text?.includes('gateway-prod'))).toBe(false);
    });
  },
};

// The `refill-requests` resource rejects every `getList` call.
export const ErrorMode: Story = {
  decorators: [withRefineMock({ latencyMs: [10, 20], errorResources: { 'refill-requests': 'Failed to load the review queue.' } })],
  render: () => (
    <div className="w-full">
      <RefineAdminBudgetReviewScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole('alert')).toHaveTextContent('Failed to load the review queue.'), {
      timeout: 3000,
    });
  },
};
