import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { AugmentationRequest, MyBudgetRefillLadder } from '@lightbridge/hooks';

import { BudgetRefillView } from '../budget-refill-view';

const noop = () => undefined;
const PERIOD = '2026-08';

beforeAll(() => {
  initI18n('en');
});

function renderView(overrides: Partial<React.ComponentProps<typeof BudgetRefillView>> = {}) {
  return render(<BudgetRefillView onBack={noop} onSubmit={noop} period={PERIOD} {...overrides} />);
}

// `allowedAmountsMicros` defaults to `[]` (ADR-0015's picker is empty by default). Tests that
// exercise the picker itself pass their own `allowedAmountsMicros` explicitly.
//
// `currentTier`/`currentTierAmountMicros`/`ladder` below are dummy values present ONLY because
// `MyBudgetRefillLadder` (the generated wire type) still requires them until the backend removal
// lands -- see the module comment on `packages/hooks/src/budget-tiers.ts`. `BudgetRefillView`
// itself reads none of them; no assertion in this file may depend on these values.
function baseLadder(overrides: Partial<MyBudgetRefillLadder> = {}): MyBudgetRefillLadder {
  return {
    budgetAccountId: 'acc-1',
    period: PERIOD,
    currentTier: 'b-15',
    currentTierAmountMicros: '15000000',
    ladder: [],
    allowedAmountsMicros: [],
    ...overrides,
  };
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

describe('BudgetRefillView -- submit control before any amount is picked', () => {
  it('shows the current period and a submit action, with no amounts available yet', async () => {
    await renderView();

    expect(screen.getByText('For 2026-08')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Request a refill' })).toBeTruthy();
  });

  it('disables submit until an amount is selected, even when idle (not submitting)', async () => {
    await renderView({ ladder: baseLadder({ allowedAmountsMicros: ['30000000'] }) });

    expect(
      screen.getByRole('button', { name: 'Request a refill' }).props.accessibilityState.disabled
    ).toBe(true);
  });

  it('disables the submit control while a request is in flight, regardless of selection', async () => {
    await renderView({
      isSubmitting: true,
      ladder: baseLadder({ allowedAmountsMicros: ['30000000'] }),
      selectedAmountMicros: '30000000',
    });

    expect(
      screen.getByRole('button', { name: 'Requesting…' }).props.accessibilityState.disabled
    ).toBe(true);
  });
});

describe('BudgetRefillView amount picker (ADR-0015) -- a real selector, sourced only from allowedAmountsMicros', () => {
  it('renders every allowed amount as a selectable option, formatted as dollars', async () => {
    await renderView({
      ladder: baseLadder({ allowedAmountsMicros: ['6000000', '15000000', '30000000'] }),
    });

    expect(screen.getByText('$6.00')).toBeTruthy();
    expect(screen.getByText('$15.00')).toBeTruthy();
    expect(screen.getByText('$30.00')).toBeTruthy();
  });

  it('never renders a hardcoded amount not present in allowedAmountsMicros', async () => {
    // A regression guard for the exact drift class called out in the ticket: a hardcoded mirror
    // of the ladder (e.g. `BUDGET_TIER_AMOUNT_USD`'s $1000 top rung) must never leak into the
    // picker just because it's a familiar budget-tier amount -- only the amounts the ACTIVE
    // policy actually offers may appear as options.
    await renderView({ ladder: baseLadder({ allowedAmountsMicros: ['6000000'] }) });

    expect(screen.getByText('$6.00')).toBeTruthy();
    expect(screen.queryByText('$1000.00')).toBeNull();
  });

  it('marks the selected amount as the active option', async () => {
    await renderView({
      ladder: baseLadder({ allowedAmountsMicros: ['6000000', '15000000'] }),
      selectedAmountMicros: '15000000',
    });

    expect(screen.getByLabelText('$15.00').props.accessibilityState.selected).toBeTruthy();
    expect(screen.getByLabelText('$6.00').props.accessibilityState.selected).toBeFalsy();
  });

  it('calls onSelectAmount with the pressed amount, unformatted', async () => {
    const onSelectAmount = jest.fn();
    await renderView({
      ladder: baseLadder({ allowedAmountsMicros: ['6000000', '15000000'] }),
      onSelectAmount,
    });

    await fireEvent.press(screen.getByText('$15.00'));

    expect(onSelectAmount).toHaveBeenCalledWith('15000000');
  });

  it('shows a loading caption, no options, while the ladder query is in flight', async () => {
    await renderView({ isLadderLoading: true });

    expect(screen.getByText('Loading refill amounts…')).toBeTruthy();
    expect(screen.queryByText('$15.00')).toBeNull();
  });

  it('shows an error caption when the ladder query fails, distinct from the loading caption', async () => {
    await renderView({ isLadderError: true });

    expect(screen.getByText("Couldn't load refill amounts.")).toBeTruthy();
    expect(screen.queryByText('Loading refill amounts…')).toBeNull();
  });

  it('says so, and keeps submit disabled, when the active policy offers no amounts at all', async () => {
    await renderView({ ladder: baseLadder({ allowedAmountsMicros: [] }) });

    expect(
      screen.getByText(
        "Your account's budget policy doesn't currently offer any refill amounts. Contact an admin."
      )
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Request a refill' }).props.accessibilityState.disabled
    ).toBe(true);
  });
});

describe('BudgetRefillView submit button copy -- names the amount, never promises the outcome', () => {
  it('names the selected amount in the submit label once one is picked', async () => {
    await renderView({
      ladder: baseLadder({ allowedAmountsMicros: ['30000000'] }),
      selectedAmountMicros: '30000000',
    });

    expect(screen.getByRole('button', { name: 'Request $30.00' })).toBeTruthy();
  });

  it('calls onSubmit on press once enabled -- a bare trigger, the screen owns which amount was picked', async () => {
    const onSubmit = jest.fn();
    await renderView({
      onSubmit,
      ladder: baseLadder({ allowedAmountsMicros: ['30000000'] }),
      selectedAmountMicros: '30000000',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Request $30.00' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

// The pre-ADR-0015 ladder-visibility panel ("you are here, this is next") was removed entirely --
// under a flat, admin-configured amount set there is no ladder *position* left to display. This
// notice is unrelated to that panel (it carries no ladder data of its own) and must render
// regardless of whether the caller has picked an amount or ever submitted a refill.
describe('BudgetRefillView enforcement-gap notice -- always visible, independent of the ladder query', () => {
  it('shows the notice even before any refill data has loaded', async () => {
    await renderView();

    expect(
      screen.getByText(
        "Refill requests are recorded here, but they don't change your enforced usage limit yet — that connection to the request gateway hasn't been built."
      )
    ).toBeTruthy();
  });

  it('keeps showing the notice while the amount picker is loading', async () => {
    await renderView({ isLadderLoading: true });

    expect(
      screen.getByText(/Refill requests are recorded here, but they don't change/)
    ).toBeTruthy();
  });

  it('keeps showing the notice while the amount picker is errored', async () => {
    await renderView({ isLadderError: true });

    expect(
      screen.getByText(/Refill requests are recorded here, but they don't change/)
    ).toBeTruthy();
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
      result: baseRequest({
        status: 'pending_review',
        approvedAmountMicros: null,
        requestedTier: 'b-250',
      }),
    });

    expect(screen.getByText('Requested tier: $250')).toBeTruthy();
    expect(
      screen.getByText(
        "This request is under review by an admin. There's no estimated time for a decision."
      )
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

    expect(
      screen.getByText('This request was denied. Contact support if you have questions.')
    ).toBeTruthy();
  });

  it('falls back to computing the amount from requestedAmountMicros when requestedTier is not a recognized ladder value', async () => {
    await renderView({
      result: baseRequest({
        status: 'auto_approved',
        requestedTier: 'b-999',
        requestedAmountMicros: '999000000',
      }),
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
