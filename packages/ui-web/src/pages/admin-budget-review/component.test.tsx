import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminBudgetReviewPage } from './component';
import { adminNavItems, adminSubNavItems, gatewayProdHistory, pendingRequestsFixture, recentDecisionsFixture } from './fixtures';
import type { AdminBudgetReviewPageProps } from './types';

function baseProps(overrides: Partial<AdminBudgetReviewPageProps> = {}): AdminBudgetReviewPageProps {
  return {
    tier: 'full',
    header: <div>Header</div>,
    nav: { items: adminNavItems },
    subNav: { items: adminSubNavItems },
    activeTab: 'pending',
    onTabChange: vi.fn(),
    pendingCount: pendingRequestsFixture.length,
    decidedCount: 26,
    pending: pendingRequestsFixture,
    decisions: recentDecisionsFixture,
    onRetry: vi.fn(),
    selectedRequestId: null,
    onSelectRequest: vi.fn(),
    reviewDetail: null,
    ...overrides,
  };
}

describe('AdminBudgetReviewPage', () => {
  it('renders the pending queue and the recent decisions ledger from props', () => {
    render(<AdminBudgetReviewPage {...baseProps()} />);

    // pending-only and decisions-only project names — 'gateway-prod' appears in both surfaces.
    expect(screen.getByText('support-copilot')).toBeInTheDocument();
    expect(screen.getByText('rag-catalogue')).toBeInTheDocument();
  });

  it('renders the Pending/Decided tab counts and fires onTabChange', () => {
    const onTabChange = vi.fn();
    render(<AdminBudgetReviewPage {...baseProps({ onTabChange })} />);

    expect(screen.getByRole('button', { name: 'Pending (4)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decided (26)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Decided (26)' }));
    expect(onTabChange).toHaveBeenCalledWith('decided');
  });

  describe('selection → rail retarget wiring', () => {
    it('shows the "select a request" hint when nothing is selected', () => {
      render(<AdminBudgetReviewPage {...baseProps({ reviewDetail: null })} />);

      expect(screen.getByText('Select a request to review it.')).toBeInTheDocument();
    });

    it('fires onSelectRequest with the clicked row', () => {
      const onSelectRequest = vi.fn();
      render(<AdminBudgetReviewPage {...baseProps({ onSelectRequest })} />);

      const rows = screen.getAllByRole('row').slice(1);
      fireEvent.click(rows[0]);

      expect(onSelectRequest).toHaveBeenCalledWith(pendingRequestsFixture[0]);
    });

    it('retargets the right rail to the ReviewDetailPanel for the selected request', () => {
      const selected = pendingRequestsFixture[0];
      render(
        <AdminBudgetReviewPage
          {...baseProps({
            selectedRequestId: selected.id,
            reviewDetail: {
              subject: selected.project,
              requesterEmail: selected.requesterEmail,
              submittedAt: selected.submittedAgo,
              consumedAmount: selected.consumed,
              ceilingAmount: selected.ceiling,
              requestedAmount: selected.requestedAmount,
              history: gatewayProdHistory,
              note: '',
              onNoteChange: vi.fn(),
              onDecide: vi.fn(),
            },
          })}
        />,
      );

      expect(screen.queryByText('Select a request to review it.')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: selected.project })).toBeInTheDocument();
      expect(screen.getByText(`of $${selected.ceiling.toFixed(2)}`)).toBeInTheDocument();
    });
  });

  describe('approve/decline callbacks', () => {
    const selected = pendingRequestsFixture[0];
    const reviewDetail = (onDecide: ReturnType<typeof vi.fn>) => ({
      subject: selected.project,
      requesterEmail: selected.requesterEmail,
      submittedAt: selected.submittedAgo,
      consumedAmount: selected.consumed,
      ceilingAmount: selected.ceiling,
      requestedAmount: selected.requestedAmount,
      history: gatewayProdHistory,
      note: 'Looks reasonable.',
      onNoteChange: vi.fn(),
      onDecide,
    });

    it('fires onDecide("approve", note) naming the requested amount on Approve', () => {
      const onDecide = vi.fn();
      render(
        <AdminBudgetReviewPage
          {...baseProps({ selectedRequestId: selected.id, reviewDetail: reviewDetail(onDecide) })}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: `Approve +$${selected.requestedAmount.toFixed(2)}` }));
      expect(onDecide).toHaveBeenCalledWith('approve', 'Looks reasonable.');
    });

    it('fires onDecide("decline", note) on Decline', () => {
      const onDecide = vi.fn();
      render(
        <AdminBudgetReviewPage
          {...baseProps({ selectedRequestId: selected.id, reviewDetail: reviewDetail(onDecide) })}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
      expect(onDecide).toHaveBeenCalledWith('decline', 'Looks reasonable.');
    });
  });

  it('shows the queue-empty inline status above the still-rendered decisions ledger', () => {
    render(<AdminBudgetReviewPage {...baseProps({ pending: [], pendingCount: 0 })} />);

    expect(screen.getByText('Nothing awaiting a decision. 26 decided this month.')).toBeInTheDocument();
    expect(screen.getByText('rag-catalogue')).toBeInTheDocument();
  });

  it('renders an ErrorLine with Retry on error', () => {
    const onRetry = vi.fn();
    render(<AdminBudgetReviewPage {...baseProps({ pending: [], error: 'Failed to load the review queue.', onRetry })} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load the review queue.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
