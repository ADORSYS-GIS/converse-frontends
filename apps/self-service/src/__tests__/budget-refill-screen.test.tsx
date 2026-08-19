import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

// This is the exact regression the fix targets: `getApiErrorStatus`/`getApiErrorMessage` used to
// read the Axios `error.response.status` shape, which `CratestackRpcError` (the generated RPC
// client's actual thrown error -- packages/authz-rpc/generated/src/runtime.ts) never has, so
// `errorStatus` was always `undefined` and this screen showed no error UI on any failure at all
// (see packages/hooks/src/api-error.ts's module comment). This test mocks `@lightbridge/hooks`'s
// data hooks but deliberately keeps the REAL `getApiErrorStatus` (via the dependency-free
// `@lightbridge/hooks/api-error` subpath, same pattern as the `./budget-tiers` subpath already
// used by budget-refill-view.tsx) so the screen's actual wiring is exercised, not bypassed.
const mockUseRequestBudgetRefill = jest.fn();
// The read-only ladder-visibility companion (`getMyBudgetRefillLadder`) added alongside this
// screen's ladder panel -- mocked to a harmless "nothing loaded yet" default so the existing
// error/retry-focused tests below don't need to know it exists. `ladder-panel.test.tsx` covers
// the panel's own loading/error/loaded rendering in isolation.
const mockUseMyBudgetRefillLadder = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('@lightbridge/hooks', () => {
  const apiError = jest.requireActual('@lightbridge/hooks/api-error');
  return {
    __esModule: true,
    ...apiError,
    createBudgetIdempotencyKey: () => 'idem-1',
    currentBudgetPeriod: () => '2026-08',
    useCurrentAccount: () => ({ data: { id: 'acc-1' } }),
    usePermissions: () => ({ has: () => true }),
    useRequestBudgetRefill: () => mockUseRequestBudgetRefill(),
    useMyBudgetRefillLadder: () => mockUseMyBudgetRefillLadder(),
  };
});

import { BudgetRefillScreen } from '../screens/budget-refill-screen';

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  mockUseRequestBudgetRefill.mockReset();
  mockUseMyBudgetRefillLadder.mockReset();
  mockUseMyBudgetRefillLadder.mockReturnValue({ data: null, isLoading: false, isError: false });
});

describe('BudgetRefillScreen -- reacts to a real CratestackRpcError, not just an Axios-shaped one', () => {
  it('shows the permission-denied copy (not nothing) for a real 403 CratestackRpcError, and hides Retry', async () => {
    mockUseRequestBudgetRefill.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      data: null,
      // Real shape: `.status` directly on the instance, no `.response` at all.
      error: {
        name: 'CratestackRpcError',
        status: 403,
        code: 'permission_denied',
        body: {
          code: 'permission_denied',
          message: 'Forbidden: missing required permission: budget:self-refill',
        },
        message: 'RPC call failed with code permission_denied (status 403): Forbidden: ...',
      },
    });

    await render(<BudgetRefillScreen />);

    expect(screen.getByText("You don't have permission to request a budget refill.")).toBeTruthy();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('shows the retry hint and a Retry action for a non-403 (5xx) real CratestackRpcError', async () => {
    mockUseRequestBudgetRefill.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      data: null,
      error: {
        name: 'CratestackRpcError',
        status: 500,
        code: 'internal',
        body: { code: 'internal', message: 'Something exploded server-side.' },
        message: 'RPC call failed with code internal (status 500): Something exploded server-side.',
      },
    });

    await render(<BudgetRefillScreen />);

    expect(
      screen.getByText(
        "Something went wrong sending this request. Retrying reuses the same request so it won't be processed twice."
      )
    ).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('shows no error UI at all when there is no error', async () => {
    mockUseRequestBudgetRefill.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      data: null,
      error: null,
    });

    await render(<BudgetRefillScreen />);

    expect(screen.queryByText("You don't have permission to request a budget refill.")).toBeNull();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it("never shows the previous attempt's error UI while a new request is in flight", async () => {
    mockUseRequestBudgetRefill.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: true,
      data: null,
      error: {
        name: 'CratestackRpcError',
        status: 403,
        code: 'permission_denied',
        body: { code: 'permission_denied', message: 'Forbidden' },
        message: 'RPC call failed with code permission_denied (status 403): Forbidden',
      },
    });

    await render(<BudgetRefillScreen />);

    expect(screen.queryByText("You don't have permission to request a budget refill.")).toBeNull();
    expect(screen.getByRole('button', { name: 'Requesting…' })).toBeTruthy();
  });
});

// ADR-0015 (lightbridge-authz#386): `requestBudgetRefill` gains an optional caller-chosen
// `requestedAmountMicros`, checked against the policy's `allowedAmountsMicros`. This screen owns
// the selection state and must source every option from that live field -- never a hardcoded
// mirror (the exact drift class that left `allowed_models` silently inert for months on the
// backend side, lightbridge-authz#282/#283).
describe('BudgetRefillScreen amount selection (ADR-0015) -- reads allowedAmountsMicros, never a constant', () => {
  it('defaults to the first allowed amount once the ladder loads, and sends it on submit', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({});
    mockUseRequestBudgetRefill.mockReturnValue({
      mutateAsync,
      isPending: false,
      data: null,
      error: null,
    });
    mockUseMyBudgetRefillLadder.mockReturnValue({
      data: {
        budgetAccountId: 'acc-1',
        period: '2026-08',
        currentTier: 'b-15',
        currentTierAmountMicros: '15000000',
        nextTier: 'b-30',
        nextTierAmountMicros: '30000000',
        ladder: [],
        allowedAmountsMicros: ['6000000', '15000000', '30000000'],
      },
      isLoading: false,
      isError: false,
    });

    await render(<BudgetRefillScreen />);

    // The default selection (the first offered amount, $6.00) is named directly in the submit
    // button's copy -- proves the picker actually drove a real selection, not just rendered.
    const submitButton = screen.getByRole('button', { name: 'Request $6.00' });
    await fireEvent.press(submitButton);

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'acc-1', requestedAmountMicros: '6000000' })
    );
  });

  it('sends the amount the caller actually picked, not the default, once they change the selection', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({});
    mockUseRequestBudgetRefill.mockReturnValue({
      mutateAsync,
      isPending: false,
      data: null,
      error: null,
    });
    mockUseMyBudgetRefillLadder.mockReturnValue({
      data: {
        budgetAccountId: 'acc-1',
        period: '2026-08',
        currentTier: 'b-15',
        currentTierAmountMicros: '15000000',
        nextTier: 'b-30',
        nextTierAmountMicros: '30000000',
        ladder: [],
        allowedAmountsMicros: ['6000000', '15000000', '30000000'],
      },
      isLoading: false,
      isError: false,
    });

    await render(<BudgetRefillScreen />);

    await fireEvent.press(screen.getByText('$30.00'));
    await fireEvent.press(screen.getByRole('button', { name: 'Request $30.00' }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ requestedAmountMicros: '30000000' })
    );
  });

  it('never offers an amount the policy did not return -- proves the picker is not a hardcoded list', async () => {
    mockUseRequestBudgetRefill.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      data: null,
      error: null,
    });
    mockUseMyBudgetRefillLadder.mockReturnValue({
      data: {
        budgetAccountId: 'acc-1',
        period: '2026-08',
        currentTier: 'b-15',
        currentTierAmountMicros: '15000000',
        nextTier: 'b-30',
        nextTierAmountMicros: '30000000',
        ladder: [],
        allowedAmountsMicros: ['6000000'],
      },
      isLoading: false,
      isError: false,
    });

    await render(<BudgetRefillScreen />);

    expect(screen.getByText('$6.00')).toBeTruthy();
    // $1000.00 is a real ADR-0008 ladder rung and the OLD static `BUDGET_TIER_AMOUNT_USD` top
    // value -- if the picker ever regressed to reading that constant instead of
    // `allowedAmountsMicros`, this is exactly the string that would leak back in.
    expect(screen.queryByText('$1000.00')).toBeNull();
  });

  it('disables submit and never calls the mutation when the active policy offers no amounts', async () => {
    const mutateAsync = jest.fn();
    mockUseRequestBudgetRefill.mockReturnValue({
      mutateAsync,
      isPending: false,
      data: null,
      error: null,
    });
    mockUseMyBudgetRefillLadder.mockReturnValue({
      data: {
        budgetAccountId: 'acc-1',
        period: '2026-08',
        currentTier: 'b-15',
        currentTierAmountMicros: '15000000',
        nextTier: 'b-30',
        nextTierAmountMicros: '30000000',
        ladder: [],
        allowedAmountsMicros: [],
      },
      isLoading: false,
      isError: false,
    });

    await render(<BudgetRefillScreen />);

    expect(
      screen.getByText(
        "Your account's budget policy doesn't currently offer any refill amounts. Contact an admin."
      )
    ).toBeTruthy();

    const submitButton = screen.getByRole('button', { name: 'Request a refill' });
    expect(submitButton.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(submitButton);

    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
