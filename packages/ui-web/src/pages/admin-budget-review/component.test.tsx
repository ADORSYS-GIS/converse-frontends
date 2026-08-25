import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminBudgetReviewPage } from './component';
import { adminNavItems, adminSubNavItems, gatewayProdHistory, pendingRequestsFixture, recentDecisionsFixture } from './fixtures';
import type { AdminBudgetReviewPageProps } from './types';

function baseProps(overrides: Partial<AdminBudgetReviewPageProps> = {}): AdminBudgetReviewPageProps {
  return {
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

// `useIsBelowLg` defaults to "assume below lg" when `matchMedia` is unavailable (jsdom doesn't
// implement it here) — which would auto-open the selection-driven REVIEW sheet in every test
// that sets `reviewDetail`, including ones that have nothing to do with sheets. Most tests in
// this file simulate `lg` (a stable, sheet-free baseline); the REVIEW-sheet tests override this
// explicitly to prove the below-lg behaviour.
function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('AdminBudgetReviewPage', () => {
  beforeEach(() => {
    mockMatchMedia(false); // simulate `lg` by default
  });

  afterEach(() => {
    // @ts-expect-error - restore jsdom's own "matchMedia does not exist" baseline.
    delete window.matchMedia;
  });

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

    it('opens the compact-tier REVIEW sheet automatically once a request is selected below lg, without needing a trigger', () => {
      mockMatchMedia(true); // simulate below `lg` — see `useIsBelowLg`'s own docstring for why
      // this must be gated by an actual viewport check rather than firing unconditionally.
      const selected = pendingRequestsFixture[0];
      const { rerender } = render(<AdminBudgetReviewPage {...baseProps()} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(
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

      const dialog = screen.getByRole('dialog', { name: 'REVIEW' });
      expect(within(dialog).getByRole('heading', { name: selected.project })).toBeInTheDocument();
    });

    it('does NOT open the REVIEW sheet on selection at lg — selecting a request must never mount an invisible-but-modal dialog that freezes the rest of the page', () => {
      // Default `beforeEach` already simulates `lg` (matches: false).
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

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // The pending queue rows must stay reachable — a modal dialog would mark them aria-hidden.
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
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
