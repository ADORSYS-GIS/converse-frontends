import { describe, expect, it, vi } from 'vitest';

// budget.ts pulls in `./auth-session` → `@lightbridge/authz-rpc`, both of which drag in React
// Native's entry point transitively (Flow syntax Vitest's Rollup/esbuild pipeline can't parse).
// Mock both so this file only exercises the pure helpers under test — same pattern as
// projects.test.ts.
//
// `getAuthzRpcClient` and `getBudgetRpcClient` are mocked as two DISTINCT spies (not the same
// stub reused for both) specifically so the routing tests below can assert which one a given
// budget procedure actually called -- a shared/identical mock would make a routing regression
// (e.g. reverting a call site back to `getAuthzRpcClient`) invisible to these tests.
vi.mock('./auth-session', () => ({ useAuthSession: () => ({ isAuthenticated: true }) }));
const mockAuthzProcedures = { requestBudgetRefill: vi.fn() };
const mockBudgetProcedures = {
  requestBudgetRefill: vi.fn(),
  listPendingAugmentationRequests: vi.fn(),
  approveAugmentationRequest: vi.fn(),
  rejectAugmentationRequest: vi.fn(),
};
const getAuthzRpcClient = vi.fn(() => ({ procedures: mockAuthzProcedures }));
const getBudgetRpcClient = vi.fn(() => ({ procedures: mockBudgetProcedures }));
vi.mock('@lightbridge/authz-rpc', () => ({
  getAuthzRpcClient: () => getAuthzRpcClient(),
  getBudgetRpcClient: () => getBudgetRpcClient(),
  createId: () => 'test-id',
}));

import {
  BUDGET_TIER_AMOUNT_USD,
  BUDGET_TIERS,
  approveAugmentationRequest,
  createBudgetIdempotencyKey,
  currentBudgetPeriod,
  formatBudgetTierAmount,
  formatMicroUsd,
  isBudgetTier,
  listPendingAugmentationRequests,
  pendingAugmentationRequestsListQueryKey,
  pendingAugmentationRequestsQueryKey,
  rejectAugmentationRequest,
  requestBudgetRefill,
} from './budget';

// Regression coverage for converse-frontends#175: every budget:*-gated RPC procedure moved off
// `authz-api` onto `authz-budget` (lightbridge-authz#351, hard cutover) -- a call site still
// pointed at `getAuthzRpcClient()` would 404 in production. These tests fail if any of the four
// wired procedures regress back to the CRUD client, and prove the CRUD client is never touched by
// budget calls at all.
describe('budget procedures route through getBudgetRpcClient, never getAuthzRpcClient', () => {
  it('requestBudgetRefill calls the budget client only', async () => {
    mockBudgetProcedures.requestBudgetRefill.mockResolvedValueOnce({ id: 'aug_1' });

    await requestBudgetRefill({
      accountId: 'acc_1',
      idempotencyKey: 'idem_1',
    });

    expect(getBudgetRpcClient).toHaveBeenCalled();
    expect(mockBudgetProcedures.requestBudgetRefill).toHaveBeenCalledWith({
      args: expect.objectContaining({ accountId: 'acc_1', budgetAccountId: 'acc_1' }),
    });
    expect(getAuthzRpcClient).not.toHaveBeenCalled();
    expect(mockAuthzProcedures.requestBudgetRefill).not.toHaveBeenCalled();
  });

  it('listPendingAugmentationRequests calls the budget client only', async () => {
    mockBudgetProcedures.listPendingAugmentationRequests.mockResolvedValueOnce([]);

    await listPendingAugmentationRequests('acc_1');

    expect(getBudgetRpcClient).toHaveBeenCalled();
    expect(mockBudgetProcedures.listPendingAugmentationRequests).toHaveBeenCalledWith({
      args: { budgetAccountId: 'acc_1' },
    });
    expect(getAuthzRpcClient).not.toHaveBeenCalled();
  });

  it('approveAugmentationRequest calls the budget client only', async () => {
    mockBudgetProcedures.approveAugmentationRequest.mockResolvedValueOnce({ id: 'aug_1' });

    await approveAugmentationRequest({ requestId: 'aug_1' });

    expect(getBudgetRpcClient).toHaveBeenCalled();
    expect(mockBudgetProcedures.approveAugmentationRequest).toHaveBeenCalledWith({
      args: { requestId: 'aug_1' },
    });
    expect(getAuthzRpcClient).not.toHaveBeenCalled();
  });

  it('rejectAugmentationRequest calls the budget client only', async () => {
    mockBudgetProcedures.rejectAugmentationRequest.mockResolvedValueOnce({ id: 'aug_1' });

    await rejectAugmentationRequest({ requestId: 'aug_1', reason: 'duplicate' });

    expect(getBudgetRpcClient).toHaveBeenCalled();
    expect(mockBudgetProcedures.rejectAugmentationRequest).toHaveBeenCalledWith({
      args: { requestId: 'aug_1', reason: 'duplicate' },
    });
    expect(getAuthzRpcClient).not.toHaveBeenCalled();
  });
});

describe('BUDGET_TIERS', () => {
  it('is the ADR-0008 discrete ladder, in ascending order', () => {
    expect(BUDGET_TIERS).toEqual(['b-15', 'b-30', 'b-60', 'b-120', 'b-250', 'b-500', 'b-1000']);
  });

  it('every tier has a matching dollar amount', () => {
    for (const tier of BUDGET_TIERS) {
      expect(BUDGET_TIER_AMOUNT_USD[tier]).toBeGreaterThan(0);
    }
  });
});

describe('isBudgetTier', () => {
  it('accepts every ladder value', () => {
    for (const tier of BUDGET_TIERS) {
      expect(isBudgetTier(tier)).toBe(true);
    }
  });

  it('rejects a free-text/non-ladder value', () => {
    expect(isBudgetTier('b-30.5')).toBe(false);
    expect(isBudgetTier('unlimited')).toBe(false);
    expect(isBudgetTier('')).toBe(false);
  });
});

describe('formatBudgetTierAmount', () => {
  it('formats the small tiers without a thousands separator', () => {
    expect(formatBudgetTierAmount('b-15')).toBe('$15');
    expect(formatBudgetTierAmount('b-30')).toBe('$30');
  });

  it('formats the four-figure tier with a thousands separator', () => {
    expect(formatBudgetTierAmount('b-1000')).toBe('$1,000');
  });
});

describe('formatMicroUsd', () => {
  it('formats a whole-dollar amount', () => {
    expect(formatMicroUsd('30000000')).toBe('$30.00');
  });

  it('formats a sub-dollar fractional amount', () => {
    expect(formatMicroUsd('1500000')).toBe('$1.50');
  });

  it('rounds to the nearest cent', () => {
    expect(formatMicroUsd('1999999')).toBe('$2.00');
    expect(formatMicroUsd('1994000')).toBe('$1.99');
    expect(formatMicroUsd('1995000')).toBe('$2.00');
  });

  it('handles a value at 2^53 and beyond without precision loss (the whole reason this is BigInt-based)', () => {
    // Number.MAX_SAFE_INTEGER is 9007199254740991; one above it would silently round in `Number()`.
    expect(formatMicroUsd('9007199254740993000000')).toBe('$9007199254740993.00');
  });

  it('handles a negative amount', () => {
    expect(formatMicroUsd('-2500000')).toBe('-$2.50');
  });

  it('returns the raw input unchanged for an unparseable shape rather than throwing', () => {
    expect(formatMicroUsd('not-a-number')).toBe('not-a-number');
  });
});

describe('currentBudgetPeriod', () => {
  it("formats a date as the 'YYYY-MM' wire format", () => {
    expect(currentBudgetPeriod(new Date('2026-08-15T00:00:00Z'))).toBe('2026-08');
  });

  it('pads single-digit months', () => {
    expect(currentBudgetPeriod(new Date('2026-01-05T00:00:00Z'))).toBe('2026-01');
  });
});

describe('createBudgetIdempotencyKey', () => {
  it('delegates to createId (cuid2), same generator projects.ts uses for ids', () => {
    expect(createBudgetIdempotencyKey()).toBe('test-id');
  });
});

// `getApiErrorStatus`/`isPermissionDeniedError` used to live here, tested against an
// axios-shaped error (`{ response: { status } }`) this app's RPC transport never actually
// produces -- see git history. They now live in `./api-error.ts` alongside `getApiErrorMessage`
// (a generic API-error helper, not budget-specific) and are tested in `./api-error.test.ts`
// against a real `CratestackRpcError`, the shape the generated RPC client actually throws.

describe('pendingAugmentationRequestsListQueryKey', () => {
  it('appends the resolved budgetAccountId on top of the bare prefix', () => {
    expect(pendingAugmentationRequestsListQueryKey('acc-1')).toEqual([
      ...pendingAugmentationRequestsQueryKey,
      'acc-1',
    ]);
  });

  it("falls back to 'all' when scoping is omitted (the review queue's global default)", () => {
    expect(pendingAugmentationRequestsListQueryKey()).toEqual([
      ...pendingAugmentationRequestsQueryKey,
      'all',
    ]);
  });
});
