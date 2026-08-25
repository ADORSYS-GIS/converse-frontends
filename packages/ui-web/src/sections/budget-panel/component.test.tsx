import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BudgetPanel } from './component';
import {
  overviewBudget,
  overviewNeedsAttentionProject,
  overviewRefillRequestStatus,
} from './fixtures';

describe('BudgetPanel', () => {
  it('fires onRequestRefill from the NEEDS ATTENTION action', () => {
    const onRequestRefill = vi.fn();
    render(
      <BudgetPanel
        budget={overviewBudget}
        needsAttentionProject={overviewNeedsAttentionProject}
        onRequestRefill={onRequestRefill}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Request refill' }));

    expect(onRequestRefill).toHaveBeenCalledTimes(1);
  });

  it('fires onReviewInAdmin from the refill-request status link', () => {
    const onReviewInAdmin = vi.fn();
    render(
      <BudgetPanel
        budget={overviewBudget}
        refillRequestStatus={overviewRefillRequestStatus}
        onReviewInAdmin={onReviewInAdmin}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Review in Admin/ }));

    expect(onReviewInAdmin).toHaveBeenCalledTimes(1);
  });

  it('omits both optional blocks when their data is absent', () => {
    render(<BudgetPanel budget={overviewBudget} />);

    expect(screen.queryByText('NEEDS ATTENTION')).not.toBeInTheDocument();
    expect(screen.queryByText('REFILL REQUESTS')).not.toBeInTheDocument();
  });

  it('renders the compact-tier trigger slot on the heading row', () => {
    render(
      <BudgetPanel budget={overviewBudget} actions={<button type="button">Open export</button>} />
    );

    expect(screen.getByRole('button', { name: 'Open export' })).toBeInTheDocument();
  });
});
