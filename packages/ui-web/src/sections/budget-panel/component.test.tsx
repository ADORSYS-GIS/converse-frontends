import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BudgetPanel } from './component';
import {
  overviewBudget,
  overviewErrorBudget,
  overviewLoadingBudget,
  overviewNeedsAttentionProject,
  overviewRefillRequestStatus,
  overviewUnwiredBudget,
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

    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    expect(screen.queryByText('Refill requests')).not.toBeInTheDocument();
  });

  it('renders the compact-tier trigger slot on the heading row', () => {
    render(
      <BudgetPanel budget={overviewBudget} actions={<button type="button">Open export</button>} />
    );

    expect(screen.getByRole('button', { name: 'Open export' })).toBeInTheDocument();
  });

  // Regression for #273 — see `budget-hero`'s equivalent block for the full rationale.
  it('renders BudgetHero\'s "Not wired" headline instead of a fabricated numeral for status="unwired"', () => {
    render(<BudgetPanel budget={overviewUnwiredBudget} />);

    expect(screen.getByText('Not wired')).toBeInTheDocument();
    expect(screen.queryByText(/^\$0\.00/)).not.toBeInTheDocument();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(
      screen.getByText('Budget figures arrive with the budget query wiring.')
    ).toBeInTheDocument();
  });

  // #306 — the account-level hero's own inline refill control (ADR 0008 Decision 7), distinct
  // from the NEEDS ATTENTION project sub-block's `onRequestRefill`.
  it('forwards heroAction to BudgetHero, beside the account-level numeral', () => {
    render(
      <BudgetPanel
        budget={overviewBudget}
        heroAction={<button type="button">Request refill</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Request refill' })).toBeInTheDocument();
  });

  it('renders BudgetHero\'s loading skeleton for status="loading", no fabricated numeral', () => {
    render(<BudgetPanel budget={overviewLoadingBudget} />);

    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });

  it('renders BudgetHero\'s error line for status="error", distinct from "unwired"', () => {
    render(<BudgetPanel budget={overviewErrorBudget} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load budget consumption.');
    expect(screen.queryByText('Not wired')).not.toBeInTheDocument();
  });
});
