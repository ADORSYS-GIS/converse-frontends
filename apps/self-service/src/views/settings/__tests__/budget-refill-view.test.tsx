import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { AugmentationRequest } from '@lightbridge/hooks';

import { BudgetRefillView } from '../budget-refill-view';

const noop = () => undefined;
const PERIOD = '2026-08';

beforeAll(() => {
  initI18n('en');
});

function renderView(overrides: Partial<React.ComponentProps<typeof BudgetRefillView>> = {}) {
  return render(<BudgetRefillView onBack={noop} onSubmit={noop} period={PERIOD} {...overrides} />);
}

function baseRequest(overrides: Partial<AugmentationRequest> = {}): AugmentationRequest {
  return {
    id: 'req-1',
    budgetAccountId: 'acc-1',
    accountId: 'acc-1',
    projectId: null,
    period: PERIOD,
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

describe('BudgetRefillView -- no tier/amount picker of any kind', () => {
  it('shows the current period and a single submit action, nothing selectable', async () => {
    await renderView();

    expect(screen.getByText('For 2026-08')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Request a refill' })).toBeTruthy();
    // Confirms the old tier ladder is gone -- these dollar tiles must never render again.
    expect(screen.queryByText('$15')).toBeNull();
    expect(screen.queryByText('$30')).toBeNull();
    expect(screen.queryByText('$1,000')).toBeNull();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.queryAllByPlaceholderText(/.+/)).toHaveLength(0);
  });

  it('calls onSubmit on press -- a bare trigger, never carrying a tier/amount payload', async () => {
    const onSubmit = jest.fn();
    await renderView({ onSubmit });

    await fireEvent.press(screen.getByRole('button', { name: 'Request a refill' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the submit control while a request is in flight', async () => {
    await renderView({ isSubmitting: true });

    expect(
      screen.getByRole('button', { name: 'Requesting…' }).props.accessibilityState.disabled
    ).toBe(true);
  });

  it('does not disable submit when idle', async () => {
    await renderView();

    expect(
      screen.getByRole('button', { name: 'Request a refill' }).props.accessibilityState.disabled
    ).toBe(false);
  });
});

describe('BudgetRefillView permission gate', () => {
  it('shows a generic permission-denied message and no request control when canRefill is false', async () => {
    await renderView({ canRefill: false });

    expect(screen.getByText("You don't have permission to request a budget refill.")).toBeTruthy();
    expect(screen.queryByText('Request a refill')).toBeNull();
  });
});

describe('BudgetRefillView result states -- tier revealed from the response, never chosen upfront', () => {
  it('shows the token-refresh notice and the server-assigned tier on auto_approved', async () => {
    await renderView({ result: baseRequest({ status: 'auto_approved', requestedTier: 'b-30' }) });

    expect(screen.getByText('Requested tier: $30')).toBeTruthy();
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

  it('shows under-review copy with no ETA on pending_review, and still reveals the requested tier', async () => {
    await renderView({
      result: baseRequest({ status: 'pending_review', approvedAmountMicros: null, requestedTier: 'b-250' }),
    });

    expect(screen.getByText('Requested tier: $250')).toBeTruthy();
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

  it('falls back to computing the amount from requestedAmountMicros when requestedTier is not a recognized ladder value', async () => {
    await renderView({
      result: baseRequest({ status: 'auto_approved', requestedTier: 'b-999', requestedAmountMicros: '999000000' }),
    });

    expect(screen.getByText('Requested tier: $999.00')).toBeTruthy();
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
