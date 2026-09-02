import type { AugmentationRequest } from '@lightbridge/authz-rpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUGMENTATION_STATUS } from './refill-rows';

/**
 * `/admin/refills-queue` — the ONE thing this hook's requester wiring must hold
 * (converse-frontends#444): a page of N pending rows costs exactly ONE `resolveUserProfiles`
 * call, never one per row. That is a property of the query key (the sorted, de-duplicated id
 * list — `requesterIdsOf`, unit-tested in `refill-rows.test.ts`), so it is only observable by
 * counting real calls through a real `QueryClient`, which is what this file does: react-query is
 * NOT mocked here, only the two RPC clients and the two ambient URL/scope hooks are.
 */
const listPendingAugmentationRequests = vi.fn();
const resolveUserProfiles = vi.fn();

vi.mock('../client/rpc-clients', () => ({
  useConsoleBudgetClient: () => ({
    procedures: {
      listPendingAugmentationRequests,
      approveAugmentationRequest: vi.fn(),
      rejectAugmentationRequest: vi.fn(),
    },
  }),
  useConsoleAuthzClient: () => ({ procedures: { resolveUserProfiles } }),
}));

vi.mock('../client/url-state', () => ({
  useAdminParams: () => [
    { after: '', selectedRequestId: '', sortKey: 'submitted', sortDirection: 'asc' },
    vi.fn(),
  ],
}));

vi.mock('../client/use-console-scope', () => ({
  useConsoleScope: () => ({ allProjects: [], allAccounts: [] }),
}));

const { useRefillsQueueScreen } = await import('./use-refills-queue-screen');

function request(
  id: string,
  requestedByUserId: string | null,
  createdAt = '2026-08-30T12:00:00.000Z'
): AugmentationRequest {
  return {
    id,
    budgetAccountId: 'budget-1',
    accountId: 'acct_1',
    projectId: 'proj_1',
    period: '2026-08',
    requestedTier: 'tier-1',
    requestedAmountMicros: '250000000',
    status: AUGMENTATION_STATUS.PENDING_REVIEW,
    policyEffect: null,
    policyReasonCodes: [],
    matchedRuleIds: [],
    policyRevision: null,
    approvedAmountMicros: null,
    grantId: null,
    idempotencyKey: null,
    reviewedBy: null,
    rejectionReason: null,
    requestedByUserId,
    createdAt,
  } as AugmentationRequest;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function renderScreen() {
  const rendered = renderHook(() => useRefillsQueueScreen(), { wrapper });
  await waitFor(() => expect(rendered.result.current.loading).toBe(false));
  return rendered;
}

describe('useRefillsQueueScreen — requester resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves a whole page of requesters in ONE batch call, not one per row', async () => {
    listPendingAugmentationRequests.mockResolvedValue({
      entries: [
        request('r1', 'usr_b'),
        request('r2', 'usr_a', '2026-08-30T13:00:00.000Z'),
        request('r3', 'usr_b', '2026-08-30T14:00:00.000Z'),
        request('r4', null, '2026-08-30T15:00:00.000Z'),
      ],
      nextCursor: null,
    });
    resolveUserProfiles.mockResolvedValue({
      profiles: [
        { userId: 'usr_a', displayName: 'Maria Okonkwo', email: 'maria@brightline.dev' },
        { userId: 'usr_b', displayName: 'tobias.lang', email: null },
      ],
    });

    const { result } = await renderScreen();
    await waitFor(() => expect(result.current.pending[0]?.requester.kind).toBe('user'));

    expect(resolveUserProfiles).toHaveBeenCalledTimes(1);
    // De-duplicated (usr_b appears on two rows) and sorted, and the NULL row contributes nothing.
    expect(resolveUserProfiles).toHaveBeenCalledWith({ args: { userIds: ['usr_a', 'usr_b'] } });
  });

  it('maps each row to its own requester, sentinels included', async () => {
    listPendingAugmentationRequests.mockResolvedValue({
      entries: [
        request('r1', 'usr_a'),
        request('r2', 'usr_ghost', '2026-08-30T13:00:00.000Z'),
        request('r3', null, '2026-08-30T14:00:00.000Z'),
      ],
      nextCursor: null,
    });
    resolveUserProfiles.mockResolvedValue({
      profiles: [{ userId: 'usr_a', displayName: 'Maria Okonkwo', email: 'maria@brightline.dev' }],
    });

    const { result } = await renderScreen();
    await waitFor(() => expect(result.current.pending[0]?.requester.kind).toBe('user'));

    expect(result.current.pending.map((row) => row.requester)).toEqual([
      { kind: 'user', name: 'Maria Okonkwo', email: 'maria@brightline.dev' },
      { kind: 'unresolved', userId: 'usr_ghost' },
      { kind: 'unknown' },
    ]);
    expect(result.current.requesterStatus).toBeUndefined();
  });

  it('fires NO batch at all when the whole page predates the migration', async () => {
    listPendingAugmentationRequests.mockResolvedValue({
      entries: [request('r1', null), request('r2', null, '2026-08-30T13:00:00.000Z')],
      nextCursor: null,
    });

    const { result } = await renderScreen();

    expect(resolveUserProfiles).not.toHaveBeenCalled();
    expect(result.current.pending.map((row) => row.requester.kind)).toEqual(['unknown', 'unknown']);
  });

  it('degrades to the raw id plus a status line when the batch fails — the queue still lists', async () => {
    listPendingAugmentationRequests.mockResolvedValue({
      entries: [request('r1', 'usr_a')],
      nextCursor: null,
    });
    resolveUserProfiles.mockRejectedValue(new Error('user:read refused'));

    const { result } = await renderScreen();
    await waitFor(() => expect(result.current.requesterStatus).toBeDefined());

    expect(result.current.pending).toHaveLength(1);
    expect(result.current.pending[0]?.requester).toEqual({
      kind: 'unresolved',
      userId: 'usr_a',
    });
    // The queue's OWN error line stays empty: a failed name lookup is not a failed queue.
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('hands the same requester to the review detail panel as to its queue row', async () => {
    listPendingAugmentationRequests.mockResolvedValue({
      entries: [request('r1', 'usr_a')],
      nextCursor: null,
    });
    resolveUserProfiles.mockResolvedValue({
      profiles: [{ userId: 'usr_a', displayName: 'Maria Okonkwo', email: 'maria@brightline.dev' }],
    });

    const { result } = await renderScreen();
    await waitFor(() => expect(result.current.pending[0]?.requester.kind).toBe('user'));

    // No selection yet — `?request=` is empty in the mocked URL state, so there is no panel.
    expect(result.current.reviewDetail).toBeNull();
    expect(result.current.pending[0]?.requester).toEqual({
      kind: 'user',
      name: 'Maria Okonkwo',
      email: 'maria@brightline.dev',
    });
  });
});
