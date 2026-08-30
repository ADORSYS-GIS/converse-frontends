import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RefineAdminBudgetReviewScreen } from './refine-admin-budget-review-screen';
import { RefineMockRoot } from './refine-decorator';

// Phase 6 (admin/settings revamp) deleted the RECENT DECISIONS ledger below the queue, so
// `gateway-prod` (the pending row's own project cell) is no longer ambiguous with a second
// section's fixture data — these tests key off it directly rather than the deleted Requester
// column's `ada@adorsys.com`.
describe('RefineAdminBudgetReviewScreen', () => {
  it('adapts useTable loading/data state into the Admin sections’ props: skeleton while loading, then the live pending queue', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [40, 80] }}>
        <RefineAdminBudgetReviewScreen />
      </RefineMockRoot>,
    );

    expect(screen.queryByText('gateway-prod')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('gateway-prod')).toBeInTheDocument(), { timeout: 3000 });
  });

  it('approving the selected request (useOne detail + useCustomMutation decide) removes it from the pending queue', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [5, 10] }}>
        <RefineAdminBudgetReviewScreen />
      </RefineMockRoot>,
    );

    await waitFor(() => expect(screen.getByText('gateway-prod')).toBeInTheDocument());

    const rows = screen.getAllByRole('row').slice(1);
    fireEvent.click(rows[0]);

    const approveButton = await screen.findByRole('button', { name: /Approve/ });
    fireEvent.click(approveButton);

    await waitFor(() => expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('gateway-prod')).not.toBeInTheDocument());
  });

  it('adapts a getList failure into the Admin sections’ error props (ErrorLine + Retry)', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [10, 20], errorResources: { 'refill-requests': 'Failed to load the review queue.' } }}>
        <RefineAdminBudgetReviewScreen />
      </RefineMockRoot>,
    );

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Failed to load the review queue.'), {
      timeout: 3000,
    });
  });
});
