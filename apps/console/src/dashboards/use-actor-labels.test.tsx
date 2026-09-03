import type { ActorLabels } from '@lightbridge/authz-rpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActorIds } from './actor-labels';

/**
 * The batching and the PER-KIND gate `useActorLabels` owes `resolveActorLabels`
 * (lightbridge-authz#674).
 *
 * Both are properties of the request the hook actually issues, so neither is observable from a
 * pure function: this file drives the hook through a real `QueryClient` and asserts on the args the
 * mocked RPC client received. react-query is NOT mocked; only the RPC client and the permission
 * hook are.
 *
 * What is pinned here:
 *
 *  - **One call, four kinds.** Every id a page collected goes out in a single batch — the whole
 *    reason `collectActorIds` runs over the responses first rather than per panel.
 *  - **A caller without `user:read` sends API-key ids ONLY.** The procedure refuses the three
 *    estate-wide kinds for them with a 403 that would take the API-key labels in the same batch
 *    down with it. Trimming is not the console deciding authorization — the backend enforces both
 *    halves — it is the console declining to send a request it knows will fail.
 *  - **…and asks nothing at all when the page had no API keys**, rather than firing a request that
 *    can only 403. This is the live papercut the change closes: before it, every dashboard page an
 *    ordinary member opened captioned "Actor names could not be resolved".
 *  - **The cache key follows the TRIMMED batch**, so the two callers never share an entry for what
 *    are, on the wire, two different requests.
 */
const resolveActorLabels = vi.fn();
const can = vi.fn();

vi.mock('../client/rpc-clients', () => ({
  useConsoleAuthzClient: () => ({ procedures: { resolveActorLabels } }),
}));

vi.mock('../client/use-can', () => ({
  useCan: () => ({ can }),
}));

const { useActorLabels } = await import('./use-actor-labels');

const EMPTY_LABELS: ActorLabels = { users: [], accounts: [], projects: [], apiKeys: [] };

const ids = (partial: Partial<ActorIds>): ActorIds => ({
  users: [],
  accounts: [],
  projects: [],
  apiKeys: [],
  ...partial,
});

/** One client per render, so a cache entry never leaks between cases. */
function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function resolve(batch: ActorIds) {
  const rendered = renderHook(() => useActorLabels(batch), { wrapper });
  await waitFor(() => expect(rendered.result.current.status).not.toBe('loading'));
  return rendered;
}

describe('useActorLabels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveActorLabels.mockResolvedValue(EMPTY_LABELS);
  });

  it('sends every kind a page collected in ONE call when the caller holds user:read', async () => {
    can.mockReturnValue(true);
    await resolve(
      ids({
        users: ['usr_1'],
        accounts: ['acct_1'],
        projects: ['proj_1'],
        apiKeys: ['key_1', 'key_2'],
      })
    );

    expect(resolveActorLabels).toHaveBeenCalledTimes(1);
    expect(resolveActorLabels).toHaveBeenCalledWith({
      args: {
        userIds: ['usr_1'],
        accountIds: ['acct_1'],
        projectIds: ['proj_1'],
        apiKeyIds: ['key_1', 'key_2'],
      },
    });
  });

  it('sends API-key ids only when the caller does not hold user:read', async () => {
    can.mockReturnValue(false);
    const rendered = await resolve(
      ids({ users: ['usr_1'], accounts: ['acct_1'], projects: ['proj_1'], apiKeys: ['key_1'] })
    );

    expect(resolveActorLabels).toHaveBeenCalledTimes(1);
    expect(resolveActorLabels).toHaveBeenCalledWith({
      args: { userIds: [], accountIds: [], projectIds: [], apiKeyIds: ['key_1'] },
    });
    // The dropped kinds are not an error: their rows render sentinels, exactly as they did before
    // this hook existed, and the page is not captioned as having failed because nothing failed.
    expect(rendered.result.current.status).toBe('ready');
    expect(rendered.result.current.errorMessage).toBeUndefined();
  });

  it('asks nothing at all when a caller without user:read has no API keys to resolve', async () => {
    can.mockReturnValue(false);
    const rendered = await resolve(ids({ users: ['usr_1'], projects: ['proj_1'] }));

    expect(resolveActorLabels).not.toHaveBeenCalled();
    expect(rendered.result.current.status).toBe('idle');
  });

  it('keys the cache on the TRIMMED batch, so the two callers never share an entry', async () => {
    const batch = ids({ users: ['usr_1'], apiKeys: ['key_1'] });

    can.mockReturnValue(true);
    await resolve(batch);
    can.mockReturnValue(false);
    await resolve(batch);

    expect(resolveActorLabels).toHaveBeenCalledTimes(2);
    expect(resolveActorLabels.mock.calls[0]?.[0].args.userIds).toEqual(['usr_1']);
    expect(resolveActorLabels.mock.calls[1]?.[0].args.userIds).toEqual([]);
  });

  it('resolves an API key to its name, and a revoked one to name + (revoked)', async () => {
    can.mockReturnValue(false);
    resolveActorLabels.mockResolvedValue({
      ...EMPTY_LABELS,
      apiKeys: [
        {
          apiKeyId: 'key_live',
          name: 'Production ingest',
          projectId: 'proj_1',
          accountId: 'acct_1',
          revoked: false,
        },
        {
          apiKeyId: 'key_dead',
          name: 'Retired loader',
          projectId: 'proj_1',
          accountId: 'acct_1',
          revoked: true,
        },
      ],
    } satisfies ActorLabels);

    const rendered = await resolve(ids({ apiKeys: ['key_live', 'key_dead', 'key_gone'] }));
    const labelFor = rendered.result.current.labelFor;

    expect(labelFor('api_key', 'key_live').label).toBe('Production ingest');
    expect(labelFor('api_key', 'key_dead').label).toBe('Retired loader (revoked)');
    // An id the backend returned no row for — either unknown, or one this caller may not see —
    // keeps its own sentinel. The row is never dropped: that would silently stop counting spend.
    expect(labelFor('api_key', 'key_gone').label).toBe('key_gone');
  });

  it('captions a genuine failure without failing the page', async () => {
    can.mockReturnValue(true);
    resolveActorLabels.mockRejectedValue(new Error('boom'));

    const rendered = await resolve(ids({ apiKeys: ['key_1'] }));
    expect(rendered.result.current.status).toBe('error');
    expect(rendered.result.current.errorMessage).toContain('identified by id');
    expect(rendered.result.current.labelFor('api_key', 'key_1').label).toBe('key_1');
  });
});
