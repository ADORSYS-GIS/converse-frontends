import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { AugmentationRequest } from '@lightbridge/hooks';

import { BudgetReviewView } from '../budget-review-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

function request(overrides: Partial<AugmentationRequest> = {}): AugmentationRequest {
  return {
    id: 'req-1',
    budgetAccountId: 'acc-1',
    accountId: 'acc-1',
    projectId: null,
    period: '2026-08',
    requestedTier: 'b-250',
    requestedAmountMicros: '250000000',
    status: 'pending_review',
    policyEffect: 'manual_review',
    policyReasonCodes: [],
    matchedRuleIds: [],
    policyRevision: null,
    approvedAmountMicros: null,
    grantId: null,
    idempotencyKey: 'key-1',
    reviewedBy: null,
    rejectionReason: null,
    createdAt: '2026-08-15T00:00:00Z',
    reviewedAt: null,
    ...overrides,
  };
}

function renderView(overrides: Partial<React.ComponentProps<typeof BudgetReviewView>> = {}) {
  return render(<BudgetReviewView onBack={noop} onApprove={noop} onReject={noop} {...overrides} />);
}

describe('BudgetReviewView permission gate', () => {
  it('shows generic permission-denied copy and no list when canReview is false', async () => {
    await renderView({ canReview: false, items: [request()] });

    expect(screen.getByText("You don't have permission to review budget requests.")).toBeTruthy();
    expect(screen.queryByText('Requested $250.00')).toBeNull();
  });
});

describe('BudgetReviewView empty state', () => {
  it('renders the centered EmptyState component when there are no pending requests', async () => {
    await renderView({ items: [] });

    expect(
      screen.getByText('No pending requests. New requests that need review will show up here.')
    ).toBeTruthy();
  });
});

describe('BudgetReviewView approve flow', () => {
  it('is a single action with no confirm dialog', async () => {
    const onApprove = jest.fn();
    await renderView({ items: [request()], onApprove });

    await fireEvent.press(screen.getByText('Approve'));

    expect(onApprove).toHaveBeenCalledWith('req-1');
  });

  it('disables the approve button while that request is in flight', async () => {
    await renderView({ items: [request()], pendingRequestId: 'req-1' });

    const button = screen.getByLabelText('Approve request req-1');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('does not disable approve for a request that is not the one in flight', async () => {
    await renderView({
      items: [request({ id: 'req-1' }), request({ id: 'req-2' })],
      pendingRequestId: 'req-2',
    });

    const button = screen.getByLabelText('Approve request req-1');
    expect(button.props.accessibilityState.disabled).toBe(false);
  });
});

describe('BudgetReviewView reject flow', () => {
  it('disables the reject submit until a reason is entered', async () => {
    await renderView({ items: [request()] });

    const rejectButton = screen.getByLabelText('Reject request req-1');
    expect(rejectButton.props.accessibilityState.disabled).toBe(true);
  });

  it('enables reject once a non-empty reason is typed, and submits with it', async () => {
    const onReject = jest.fn();
    await renderView({ items: [request()], onReject });

    await fireEvent.changeText(
      screen.getByLabelText('Reason for the requester (required)'),
      'Exceeds this account’s policy ceiling.'
    );

    const rejectButton = screen.getByLabelText('Reject request req-1');
    expect(rejectButton.props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(rejectButton);
    expect(onReject).toHaveBeenCalledWith('req-1', "Exceeds this account’s policy ceiling.");
  });

  it('keeps reject disabled for a whitespace-only reason', async () => {
    await renderView({ items: [request()] });

    await fireEvent.changeText(screen.getByLabelText('Reason for the requester (required)'), '   ');

    const rejectButton = screen.getByLabelText('Reject request req-1');
    expect(rejectButton.props.accessibilityState.disabled).toBe(true);
  });
});
