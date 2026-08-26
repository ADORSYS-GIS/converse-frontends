import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CborCodec } from './codec';

// `useAuthzRpcClient`/`getAuthzRpcClient` and `useBudgetRpcClient`/`getBudgetRpcClient` are two
// independent module-scope singletons produced by the same `createRpcClientHook` factory (see
// client.ts) — one pointed at `authz-api`, one at `authz-budget`. These tests prove they really
// are independent: each keeps its own client/runtime state, and a call through one never reaches
// the other's `fetch`. `vi.resetModules()` + a fresh dynamic import per test gives each test a
// clean singleton, since the module only constructs a client on the FIRST `useXRpcClient` call.
describe('useAuthzRpcClient / useBudgetRpcClient', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getAuthzRpcClient throws before useAuthzRpcClient has configured it', async () => {
    const { getAuthzRpcClient } = await import('./client');
    expect(() => getAuthzRpcClient()).toThrow(/not configured/);
  });

  it('getBudgetRpcClient throws before useBudgetRpcClient has configured it', async () => {
    const { getBudgetRpcClient } = await import('./client');
    expect(() => getBudgetRpcClient()).toThrow(/not configured/);
  });

  it('routes calls made through the authz client to the authz base URL/basePath, never the budget one', async () => {
    const { useAuthzRpcClient, useBudgetRpcClient } = await import('./client');

    const authzFetch = vi.fn(
      async () =>
        new Response(CborCodec.encode({ id: 'acc_1' }) as unknown as BodyInit, {
          status: 200,
          headers: { 'content-type': 'application/cbor' },
        })
    );
    const budgetFetch = vi.fn(
      async () =>
        new Response(CborCodec.encode({ id: 'aug_1' }) as unknown as BodyInit, {
          status: 200,
          headers: { 'content-type': 'application/cbor' },
        })
    );

    const authzClient = useAuthzRpcClient({
      baseURL: 'https://authz-api.example.com',
      auth: async () => 'token',
      fetch: authzFetch as unknown as typeof fetch,
    });
    const budgetClient = useBudgetRpcClient({
      baseURL: 'https://authz-budget.example.com',
      basePath: '/budget',
      auth: async () => 'token',
      fetch: budgetFetch as unknown as typeof fetch,
    });

    await authzClient.procedures.createAccount({ args: { defaultQuota: null } } as never);

    expect(authzFetch).toHaveBeenCalledTimes(1);
    expect(budgetFetch).not.toHaveBeenCalled();
    const [authzUrl] = authzFetch.mock.calls[0];
    expect(String(authzUrl)).toBe('https://authz-api.example.com/api/rpc/procedure.createAccount');

    await budgetClient.procedures.requestBudgetRefill({
      args: {
        accountId: 'acc_1',
        budgetAccountId: 'acc_1',
        period: '2026-08',
        idempotencyKey: 'idem_1',
      },
    } as never);

    expect(budgetFetch).toHaveBeenCalledTimes(1);
    expect(authzFetch).toHaveBeenCalledTimes(1);
    const [budgetUrl] = budgetFetch.mock.calls[0];
    expect(String(budgetUrl)).toBe(
      'https://authz-budget.example.com/budget/rpc/procedure.requestBudgetRefill'
    );
  });

  it('getAuthzRpcClient/getBudgetRpcClient return the same singleton useXRpcClient configured, not two different instances', async () => {
    const { useAuthzRpcClient, useBudgetRpcClient, getAuthzRpcClient, getBudgetRpcClient } =
      await import('./client');

    const authzClient = useAuthzRpcClient({
      baseURL: 'https://authz-api.example.com',
      auth: async () => 'token',
    });
    const budgetClient = useBudgetRpcClient({
      baseURL: 'https://authz-budget.example.com',
      basePath: '/budget',
      auth: async () => 'token',
    });

    expect(getAuthzRpcClient()).toBe(authzClient);
    expect(getBudgetRpcClient()).toBe(budgetClient);
    expect(getAuthzRpcClient()).not.toBe(getBudgetRpcClient());
  });
});
