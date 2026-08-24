import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RefineAdminBudgetReviewScreen } from './refine-admin-budget-review-screen';
import { RefineMockRoot } from './refine-decorator';

// `gateway-prod` is deliberately reused as a project name by both the `refill-requests` and
// `decisions` fixtures (docs/design/console-redesign/admin-budget-review.svg's own mock data) —
// once RECENT DECISIONS also loads, `gateway-prod` legitimately renders twice on the page. These
// tests key off `ada@adorsys.com` (the pending row's REQUESTER cell) instead, which only the
// pending queue ever renders, to assert the ledger populated without that ambiguity.
describe('RefineAdminBudgetReviewScreen', () => {
  it('adapts useTable loading/data state into AdminBudgetReviewPage props: skeleton while loading, then the live pending queue', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [40, 80] }}>
        <RefineAdminBudgetReviewScreen />
      </RefineMockRoot>,
    );

    expect(screen.queryByText('ada@adorsys.com')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('ada@adorsys.com')).toBeInTheDocument(), { timeout: 3000 });
  });

  it('approving the selected request (useOne detail + useCustomMutation decide) removes it from the pending queue and adds it to decisions', async () => {
    render(
      <RefineMockRoot providerConfig={{ latencyMs: [5, 10] }}>
        <RefineAdminBudgetReviewScreen />
      </RefineMockRoot>,
    );

    await waitFor(() => expect(screen.getByText('ada@adorsys.com')).toBeInTheDocument());

    const rows = screen.getAllByRole('row').slice(1);
    fireEvent.click(rows[0]);

    const approveButton = await screen.findByRole('button', { name: /Approve/ });
    fireEvent.click(approveButton);

    await waitFor(() => expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('ada@adorsys.com')).not.toBeInTheDocument());
  });

  it('adapts a getList failure into AdminBudgetReviewPage error props (ErrorLine + Retry)', async () => {
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
