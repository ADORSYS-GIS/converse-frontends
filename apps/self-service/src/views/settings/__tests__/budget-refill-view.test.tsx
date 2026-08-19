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

// `allowedAmountsMicros` defaults to `[]` (ADR-0015's picker is empty by default) so the
// pre-existing ladder-visibility tests below -- which assert specific `$N.NN` badge strings --
// never collide with the amount picker also rendering a `$N.NN` option label for the same value.
// Tests that exercise the picker itself pass their own `allowedAmountsMicros` explicitly.
function baseLadder(overrides: Partial<MyBudgetRefillLadder> = {}): MyBudgetRefillLadder {
  return {
    budgetAccountId: 'acc-1',
    period: PERIOD,
    currentTier: 'b-15',
    currentTierAmountMicros: '15000000',
    nextTier: 'b-30',
    nextTierAmountMicros: '30000000',
    ladder: [
      { tier: 'b-15', amountMicros: '15000000' },
      { tier: 'b-30', amountMicros: '30000000' },
      { tier: 'b-60', amountMicros: '60000000' },
      { tier: 'b-120', amountMicros: '120000000' },
      { tier: 'b-250', amountMicros: '250000000' },
      { tier: 'b-500', amountMicros: '500000000' },
      { tier: 'b-1000', amountMicros: '1000000000' },
    ],
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
    // `ladder: []` (the seven-rung visibility panel, unrelated to this picker) isolates these
    // assertions from `baseLadder`'s own rung Badges, which otherwise render the SAME dollar
    // strings for the default $15/$30/$60/... rungs and would make `getByText` ambiguous.
    await renderView({
      ladder: baseLadder({ ladder: [], allowedAmountsMicros: ['6000000', '15000000', '30000000'] }),
    });

    expect(screen.getByText('$6.00')).toBeTruthy();
    expect(screen.getByText('$15.00')).toBeTruthy();
    expect(screen.getByText('$30.00')).toBeTruthy();
  });

  it('never renders a hardcoded amount not present in allowedAmountsMicros', async () => {
    // A regression guard for the exact drift class called out in the ticket: a hardcoded mirror
    // of the ladder (e.g. `BUDGET_TIER_AMOUNT_USD`'s $1000 top rung) must never leak into the
    // picker just because it's a familiar budget-tier amount -- only the amounts the ACTIVE
    // policy actually offers may appear as options. `ladder: []` removes the visibility panel's
    // OWN top-rung Badge so this assertion is purely about the picker, not a false pass from the
    // unrelated ladder panel happening to also render "$1000.00".
    await renderView({ ladder: baseLadder({ ladder: [], allowedAmountsMicros: ['6000000'] }) });

    expect(screen.getByText('$6.00')).toBeTruthy();
    expect(screen.queryByText('$1000.00')).toBeNull();
  });

  it('marks the selected amount as the active option', async () => {
    await renderView({
      ladder: baseLadder({ ladder: [], allowedAmountsMicros: ['6000000', '15000000'] }),
      selectedAmountMicros: '15000000',
    });

    expect(screen.getByLabelText('$15.00').props.accessibilityState.selected).toBeTruthy();
    expect(screen.getByLabelText('$6.00').props.accessibilityState.selected).toBeFalsy();
  });

  it('calls onSelectAmount with the pressed amount, unformatted', async () => {
    const onSelectAmount = jest.fn();
    await renderView({
      ladder: baseLadder({ ladder: [], allowedAmountsMicros: ['6000000', '15000000'] }),
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

describe('BudgetRefillView ladder panel -- visibility only, never a picker', () => {
  it('shows a loading line and no ladder data while the ladder query is in flight', async () => {
    await renderView({ isLadderLoading: true });

    expect(screen.getByText('Loading your budget tier…')).toBeTruthy();
    expect(screen.queryByText(/Current tier:/)).toBeNull();
  });

  it('shows an error line when the ladder query fails, distinct from the loading line', async () => {
    await renderView({ isLadderError: true });

    expect(screen.getByText("Couldn't load your budget tier.")).toBeTruthy();
    expect(screen.queryByText('Loading your budget tier…')).toBeNull();
  });

  it('renders nothing for the panel when idle with no ladder data (no crash on a null ladder)', async () => {
    await renderView();

    expect(screen.queryByText(/Current tier:/)).toBeNull();
    expect(screen.queryByText("Couldn't load your budget tier.")).toBeNull();
  });

  it('shows current + next tier amounts, the full seven-rung ladder, and the enforcement-gap notice once loaded', async () => {
    await renderView({ ladder: baseLadder() });

    expect(screen.getByText('Current tier: $15.00')).toBeTruthy();
    expect(screen.getByText('A refill would grant: $30.00')).toBeTruthy();
    // Every rung renders as a dollar-labeled status badge -- $15.00 doubles as the current-tier
    // amount above AND a ladder rung, so this only asserts the ones that appear nowhere else.
    // `formatMicroUsd` never inserts a thousands separator (see its own doc comment -- pure
    // BigInt arithmetic, no `toLocaleString`), so the top rung reads "$1000.00", not "$1,000.00".
    for (const amount of ['$60.00', '$120.00', '$250.00', '$500.00', '$1000.00']) {
      expect(screen.getByText(amount)).toBeTruthy();
    }
    expect(
      screen.getByText(
        "Refill requests are recorded here, but they don't change your enforced usage limit yet — that connection to the request gateway hasn't been built."
      )
    ).toBeTruthy();
  });

  it('says there is nothing further to request when already at the top rung, instead of a next-tier amount', async () => {
    await renderView({
      ladder: baseLadder({
        currentTier: 'b-1000',
        currentTierAmountMicros: '1000000000',
        nextTier: null,
        nextTierAmountMicros: null,
      }),
    });

    expect(screen.getByText('Current tier: $1000.00')).toBeTruthy();
    expect(
      screen.getByText("You're already at the highest tier — there's nothing further to request.")
    ).toBeTruthy();
    expect(screen.queryByText(/^A refill would grant:/)).toBeNull();
  });

  it('renders the ladder as read-only status badges, not selectable controls -- pressing one does not call onSubmit', async () => {
    const onSubmit = jest.fn();
    // showBackButton: false isolates this assertion from the unrelated PageHeader back button --
    // this test is about the ladder rungs adding no pressables of their own, not about the
    // screen's total button count. `allowedAmountsMicros: []` (baseLadder's own default) keeps
    // the amount picker from adding pressables of its own either, so the only button left is the
    // real submit action.
    await renderView({ ladder: baseLadder(), onSubmit, showBackButton: false });

    // A Badge has no press affordance at all (no onPress prop exists on it) -- firing a press
    // event at its rendered text must be a no-op, not accidentally bubble to the submit handler.
    await fireEvent.press(screen.getByText('$60.00'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    // Exactly one button on the whole screen (the real submit action) even with all seven rungs
    // rendered and the amount picker empty -- proves no per-rung pressable was introduced.
    expect(screen.getAllByRole('button')).toHaveLength(1);
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
