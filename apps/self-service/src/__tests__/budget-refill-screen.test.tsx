import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
