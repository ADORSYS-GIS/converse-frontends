import type { SessionRow } from '@lightbridge/authz-rpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `/admin/sessions` (converse-frontends#450, story C7) — the four properties of this hook that are
 * only observable through real calls against a real `QueryClient`, and would otherwise be checked
 * by eye:
 *
 *  1. the filter → `querySessions` argument mapping, INCLUDING that "Inactive" is two calls
 *     (`revoked` + `expired`) rather than one `all` narrowed on the client,
 *  2. one `resolveUserProfiles` batch per PAGE, never one per row,
 *  3. the optimistic revoke and its rollback — a failed call must leave the row exactly as it was,
 *  4. the user search filtering by an exact `subject`, server-side, not by string matching,
 *  5. the page size: `?limit=` reaches the wire verbatim, changing it clears the cursor, and the
 *     pager reports the page's real capacity (twice `limit` under the two-call "Inactive").
 *
 * react-query is NOT mocked; only the RPC client and the URL-state hook are.
 */
const querySessions = vi.fn();
const revokeSession = vi.fn();
const revokeSubjectSessions = vi.fn();
const resolveUserProfiles = vi.fn();
const searchUsers = vi.fn();

vi.mock('../client/rpc-clients', () => ({
  useConsoleAuthzClient: () => ({
    procedures: {
      querySessions,
      revokeSession,
      revokeSubjectSessions,
      resolveUserProfiles,
      searchUsers,
    },
  }),
}));

let view = {
  status: 'active' as 'active' | 'inactive' | 'all',
  kind: 'all' as 'all' | 'browser' | 'token',
  search: '',
  subject: '',
  after: '',
  limit: 25 as 25 | 50 | 100,
  selectedSessionId: '',
};
const setView = vi.fn();

vi.mock('../client/url-state', () => ({
  useAdminSessionsParams: () => [view, setView],
  ADMIN_SESSIONS_NAVIGATION_OPTIONS: { history: 'push' as const },
  SESSION_PAGE_SIZES: [25, 50, 100] as const,
}));

const { useAdminSessionsScreen } = await import('./use-admin-sessions-screen');

function session(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    id: 'ses_1',
    accountId: 'acc_1',
    projectId: 'prj_1',
    clientId: 'console-web',
    kind: 'browser',
    status: 'active',
    createdAt: '2026-08-12T09:14:00.000Z',
    updatedAt: '2026-08-12T09:14:00.000Z',
    lastUsedAt: null,
    expiresAt: '2026-09-19T09:14:00.000Z',
    userAgent: 'Mozilla/5.0',
    subject: 'acc_1',
    subjectUserId: 'acc_1',
    offline: false,
    expired: false,
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function renderScreen() {
  const rendered = renderHook(() => useAdminSessionsScreen(), { wrapper });
  await waitFor(() => expect(rendered.result.current.loading).toBe(false));
  return rendered;
}

describe('useAdminSessionsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    view = {
      status: 'active',
      kind: 'all',
      search: '',
      subject: '',
      after: '',
      limit: 25,
      selectedSessionId: '',
    };
    querySessions.mockResolvedValue({ rows: [session()], next: null });
    resolveUserProfiles.mockResolvedValue({
      profiles: [
        {
          userId: 'acc_1',
          displayName: 'Maria Okonkwo',
          email: 'maria@brightline.dev',
          username: null,
        },
      ],
    });
    searchUsers.mockResolvedValue({ users: [] });
  });

  it('sends status: active by default, and omits the filters that are not set', async () => {
    await renderScreen();

    expect(querySessions).toHaveBeenCalledTimes(1);
    expect(querySessions).toHaveBeenCalledWith({
      args: {
        status: 'active',
        kind: undefined,
        subject: undefined,
        after: undefined,
        limit: 25,
      },
    });
  });

  it('fires TWO queries for Inactive — revoked and expired — and merges them newest first', async () => {
    view = { ...view, status: 'inactive' };
    querySessions.mockImplementation(async ({ args }: { args: { status: string } }) =>
      args.status === 'revoked'
        ? {
            rows: [
              session({ id: 'ses_old', status: 'revoked', createdAt: '2026-01-01T00:00:00.000Z' }),
            ],
            next: null,
          }
        : {
            rows: [
              session({
                id: 'ses_new',
                status: 'active',
                expired: true,
                createdAt: '2026-06-01T00:00:00.000Z',
              }),
            ],
            next: null,
          }
    );

    const { result } = await renderScreen();

    expect(querySessions).toHaveBeenCalledTimes(2);
    expect(querySessions.mock.calls.map(([call]) => call.args.status).sort()).toEqual([
      'expired',
      'revoked',
    ]);
    expect(result.current.sessions.map((row) => row.id)).toEqual(['ses_new', 'ses_old']);
    expect(result.current.sessions.map((row) => row.status)).toEqual(['expired', 'revoked']);
  });

  it('passes the picked user through as an exact subject filter, not a client-side match', async () => {
    view = { ...view, search: 'maria', subject: 'acc_1' };
    await renderScreen();

    expect(querySessions.mock.calls[0]![0].args.subject).toBe('acc_1');
    // The 2-character floor is the backend's own; a shorter query is never sent.
    expect(searchUsers).toHaveBeenCalledWith({ args: { query: 'maria' } });
  });

  it('never fires the search below the backend’s own two-character floor', async () => {
    view = { ...view, search: 'm' };
    await renderScreen();

    expect(searchUsers).not.toHaveBeenCalled();
  });

  it('resolves a whole page of users in ONE batch, never one per row', async () => {
    querySessions.mockResolvedValue({
      rows: [
        session({ id: 'a', subjectUserId: 'usr_1' }),
        session({ id: 'b', subjectUserId: 'usr_2' }),
        session({ id: 'c', subjectUserId: 'usr_1' }),
      ],
      next: null,
    });
    resolveUserProfiles.mockResolvedValue({ profiles: [] });

    await renderScreen();

    await waitFor(() => expect(resolveUserProfiles).toHaveBeenCalledTimes(1));
    expect(resolveUserProfiles).toHaveBeenCalledWith({ args: { userIds: ['usr_1', 'usr_2'] } });
  });

  it('says so inline when a lookup degrades, without blanking the rows', async () => {
    resolveUserProfiles.mockRejectedValue(new Error('nope'));

    const { result } = await renderScreen();

    await waitFor(() => expect(result.current.status).toMatch(/could not be resolved/));
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('says so inline when the user search matched nobody, rather than showing an unfiltered list', async () => {
    view = { ...view, search: 'nobody' };
    const { result } = await renderScreen();

    await waitFor(() => expect(result.current.status).toMatch(/No user matches/));
  });

  it('flips the row optimistically on revoke and keeps it flipped on success', async () => {
    view = { ...view, status: 'all', selectedSessionId: 'ses_1' };
    revokeSession.mockResolvedValue({ revoked: true });

    const { result } = await renderScreen();
    expect(result.current.sessions[0]!.status).toBe('active');

    await act(async () => {
      result.current.confirmClose();
    });

    await waitFor(() => expect(revokeSession).toHaveBeenCalledWith({ args: { id: 'ses_1' } }));
    await waitFor(() => expect(result.current.revokeSuccess).toBe('Session closed.'));
  });

  it('rolls the row back and explains why when the revoke fails — never a silent optimistic success', async () => {
    view = { ...view, status: 'all', selectedSessionId: 'ses_1' };
    revokeSession.mockRejectedValue(new Error('Session not found.'));

    const { result } = await renderScreen();

    await act(async () => {
      result.current.confirmClose();
    });

    await waitFor(() => expect(result.current.revokeError).toBeTruthy());
    await waitFor(() => expect(result.current.sessions[0]!.status).toBe('active'));
    expect(result.current.revokeSuccess).toBeUndefined();
  });

  it('aims the bulk revoke at the session’s subject — the account id, which IS the JWT sub', async () => {
    view = { ...view, status: 'all', selectedSessionId: 'ses_1' };
    revokeSubjectSessions.mockResolvedValue({ revokedCount: 3 });

    const { result } = await renderScreen();

    await act(async () => {
      result.current.confirmCloseAll();
    });

    await waitFor(() =>
      expect(revokeSubjectSessions).toHaveBeenCalledWith({ args: { accountId: 'acc_1' } })
    );
    await waitFor(() =>
      expect(result.current.revokeSuccess).toBe('Closed 3 sessions for this user.')
    );
  });

  it('sends the page size the URL names, verbatim — never a hardcoded 25', async () => {
    view = { ...view, limit: 100 };
    await renderScreen();

    expect(querySessions).toHaveBeenCalledWith({
      args: {
        status: 'active',
        kind: undefined,
        subject: undefined,
        after: undefined,
        limit: 100,
      },
    });
  });

  it('clears the cursor when the page size changes — a new size is a new page sequence', async () => {
    view = { ...view, after: 'cursor_page_3' };
    const { result } = await renderScreen();

    act(() => result.current.setPageSize(50));

    expect(setView).toHaveBeenCalledWith({ limit: 50, after: '' });
  });

  it('leaves the page size alone when the filters are reset — it is not one of them', async () => {
    view = { ...view, limit: 100, status: 'all' };
    const { result } = await renderScreen();

    act(() => result.current.resetFilters());

    const [args] = setView.mock.calls.at(-1) as [Record<string, unknown>];
    expect(args).not.toHaveProperty('limit');
    expect(args).toMatchObject({ status: 'active', after: '' });
  });

  it('reports the page’s REAL capacity, which under Inactive is twice the per-call limit', async () => {
    view = { ...view, status: 'inactive', limit: 50 };
    const { result } = await renderScreen();

    // Two calls of 50 each, merged into one page — so the pager must say 100, not the 50 the
    // operator picked. Saying 50 would make a 73-row page look impossible.
    expect(querySessions).toHaveBeenCalledTimes(2);
    expect(result.current.pageSize).toBe(50);
    expect(result.current.pagination.pageSize).toBe(100);
  });

  it('reports the per-call limit as the capacity for a single-query filter', async () => {
    view = { ...view, limit: 50 };
    const { result } = await renderScreen();

    expect(result.current.pagination.pageSize).toBe(50);
  });

  it('reports a no-op revoke honestly rather than as a success it did not cause', async () => {
    view = { ...view, status: 'all', selectedSessionId: 'ses_1' };
    revokeSession.mockResolvedValue({ revoked: false });

    const { result } = await renderScreen();

    await act(async () => {
      result.current.confirmClose();
    });

    await waitFor(() =>
      expect(result.current.revokeSuccess).toBe('That session was already closed.')
    );
  });
});
