import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { AugmentationRequest } from '@lightbridge/hooks';

import { BudgetRefillView } from '../budget-refill-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

function renderView(overrides: Partial<React.ComponentProps<typeof BudgetRefillView>> = {}) {
  return render(<BudgetRefillView onBack={noop} onSelectTier={noop} {...overrides} />);
}

function baseRequest(overrides: Partial<AugmentationRequest> = {}): AugmentationRequest {
  return {
    id: 'req-1',
    budgetAccountId: 'acc-1',
    accountId: 'acc-1',
    projectId: null,
    period: '2026-08',
    requestedTier: 'b-30',
    requestedAmountMicros: '30000000',
    status: 'auto_approved',
    policyEffect: 'auto_approve',
    policyReasonCodes: [],
    matchedRuleIds: [],
    policyRevision: null,
    approvedAmountMicros: '30000000',
    grantId: 'grant-1',
    idempotencyKey: 'key-1',
    reviewedBy: null,
    rejectionReason: null,
    createdAt: '2026-08-15T00:00:00Z',
    reviewedAt: null,
    ...overrides,
  };
}

describe('BudgetRefillView tier picker', () => {
  it('renders every tier as a discrete, labeled tile', async () => {
    await renderView();

    expect(screen.getByText('$15')).toBeTruthy();
    expect(screen.getByText('$30')).toBeTruthy();
    expect(screen.getByText('$60')).toBeTruthy();
    expect(screen.getByText('$120')).toBeTruthy();
    expect(screen.getByText('$250')).toBeTruthy();
    expect(screen.getByText('$500')).toBeTruthy();
    expect(screen.getByText('$1,000')).toBeTruthy();
  });

  it('renders exactly one discrete radio tile per ladder entry -- no free-text amount input anywhere', async () => {
    await renderView();

    // The tier picker is `accessibilityRole="radio"` tiles only (see BudgetRefillView) -- exactly
    // BUDGET_TIERS.length of them, and no placeholder-bearing text input anywhere in the tree.
    expect(screen.getAllByRole('radio')).toHaveLength(7);
    expect(screen.queryAllByPlaceholderText(/.+/)).toHaveLength(0);
  });

  it('calls onSelectTier with the tile pressed', async () => {
    const onSelectTier = jest.fn();
    await renderView({ onSelectTier });

    await fireEvent.press(screen.getByText('$60'));

    expect(onSelectTier).toHaveBeenCalledWith('b-60');
  });

  it('disables every tile while a submission is in flight', async () => {
    await renderView({ isSubmitting: true, selectedTier: 'b-30' });

    const tile = screen.getByLabelText('Request the $60 budget tier');
    expect(tile.props.accessibilityState.disabled).toBe(true);
  });

  it('does not disable tiles when idle', async () => {
    await renderView();

    const tile = screen.getByLabelText('Request the $60 budget tier');
    expect(tile.props.accessibilityState.disabled).toBe(false);
  });
});

describe('BudgetRefillView permission gate', () => {
  it('shows a generic permission-denied message and no tier picker when canRefill is false', async () => {
    await renderView({ canRefill: false });

    expect(screen.getByText("You don't have permission to request a budget refill.")).toBeTruthy();
    expect(screen.queryByText('$30')).toBeNull();
  });
});

describe('BudgetRefillView result states', () => {
  it('shows the token-refresh notice on auto_approved', async () => {
    await renderView({ result: baseRequest({ status: 'auto_approved' }) });

    expect(
      screen.getByText(
        "Granted. This takes effect the next time your access token silently refreshes in the background — not immediately, and you won't need to log in again."
      )
    ).toBeTruthy();
  });

  it('shows the token-refresh notice on approved', async () => {
    await renderView({ result: baseRequest({ status: 'approved' }) });

    expect(screen.getByText(/Granted\. This takes effect/)).toBeTruthy();
  });

  it('shows the token-refresh notice on partially_approved, plus the approved amount', async () => {
    await renderView({
      result: baseRequest({ status: 'partially_approved', approvedAmountMicros: '15000000' }),
    });

    expect(screen.getByText(/Granted\. This takes effect/)).toBeTruthy();
    expect(screen.getByText('Approved amount: $15.00')).toBeTruthy();
  });

  it('shows under-review copy with no ETA on pending_review', async () => {
    await renderView({ result: baseRequest({ status: 'pending_review', approvedAmountMicros: null }) });

    expect(
      screen.getByText("This request is under review by an admin. There's no estimated time for a decision.")
    ).toBeTruthy();
  });

  it('shows the verbatim rejectionReason on denied when present', async () => {
    await renderView({
      result: baseRequest({
        status: 'denied',
        approvedAmountMicros: null,
        rejectionReason: 'Your account has exceeded its monthly review cap.',
      }),
    });

    expect(screen.getByText('Your account has exceeded its monthly review cap.')).toBeTruthy();
  });

  it('falls back to a mapped reason-code copy on denied with no rejectionReason', async () => {
    await renderView({
      result: baseRequest({
        status: 'denied',
        approvedAmountMicros: null,
        rejectionReason: null,
        policyReasonCodes: ['account_suspended'],
      }),
    });

    expect(
      screen.getByText("Your account is suspended, so refill requests can't be processed.")
    ).toBeTruthy();
  });

  it('falls back to the generic denied copy for an unrecognized reason code', async () => {
    await renderView({
      result: baseRequest({
        status: 'denied',
        approvedAmountMicros: null,
        rejectionReason: null,
        policyReasonCodes: ['some_future_code_not_in_the_table'],
      }),
    });

    expect(screen.getByText('This request was denied. Contact support if you have questions.')).toBeTruthy();
  });

  it('shows generic permission-denied copy on a 403, without a retry action', async () => {
    await renderView({ errorStatus: 403, canRetry: false });

    expect(screen.getByText("You don't have permission to request a budget refill.")).toBeTruthy();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('shows a retry action for a non-403 thrown error', async () => {
    const onRetry = jest.fn();
    await renderView({ errorStatus: 500, canRetry: true, onRetry });

    await fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });
});
