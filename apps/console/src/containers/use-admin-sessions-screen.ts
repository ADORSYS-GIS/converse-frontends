'use client';

import type { SessionPage, SessionRow, UserProfile } from '@lightbridge/authz-rpc';
import type {
  SelectFieldOption,
  SessionDetail,
  SessionKindFilter,
  SessionLedgerRow,
  SessionStatusFilter,
} from '@lightbridge/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import {
  ADMIN_SESSIONS_NAVIGATION_OPTIONS,
  useAdminSessionsParams,
  type SessionPageSize,
} from '../client/url-state';
import { getApiErrorMessage } from '@lightbridge/hooks/api-error';
import {
  subjectUserIdsOf,
  toSessionDetail,
  toSessionLedgerRow,
  toSessionUser,
} from './session-rows';
import { userProfilesQuery, userSearchQuery } from './user-profiles-query';
import { useTranslation } from '../i18n/client';

/**
 * `/admin/sessions` — the estate-wide session ledger's data adapter (converse-frontends#450,
 * story C7), shared by the centre and the `BottomSheet` it opens on row pick.
 *
 * Backed by `querySessions` and `revokeSession` (lightbridge-authz#649, merged as #657), plus the
 * pre-existing `revokeSubjectSessions`. **`listSessions` does not and cannot exist** in that
 * schema: cratestack emits `handle_list_sessions` for the generic `model.Session.list` verb, so a
 * procedure by that name is a hard codegen collision. Only the name moved between the story and
 * the shipped surface.
 *
 * Not refine-driven, for the same reason `use-refills-queue-screen.ts` is not: these are cratestack
 * PROCEDURES, and a refine `DataProvider` only models resource CRUD. They go through TanStack
 * Query directly — the same `QueryClient` refine uses, so the IndexedDB persistence and the
 * offline behaviour are identical.
 *
 * Access is gated **server-side** in `app/(console)/admin/sessions/page.tsx`, which 404s a
 * non-admin before any markup is generated (`admin-sessions-route-gate.test.ts`). That gate is the
 * UI half only: `lightbridge-authz` folds `session:read` into the SQL `WHERE` of every one of
 * these calls, so a forged session reaches at most its own rows.
 *
 * ### "Inactive" is two queries, not one filtered page
 *
 * `querySessions.status` takes exactly ONE of `active | revoked | expired | all`. The operator's
 * "Inactive" is `revoked` + `expired`, which this hook fires as two calls and merges, newest
 * first. Narrowing a single `all` page on the client was rejected: every count and every `next`
 * cursor would then be a claim about a set the server never returned, and a page whose rows all
 * happened to be active would render empty with a Next button that skipped it. The honest cost is
 * stated where it bites — `hasNext` is true when EITHER half has more, and the two halves page
 * together (see `cursorStack` below).
 *
 * ### User search resolves to a subject, server-side
 *
 * `sessions.subject` is the session owner's JWT `sub`, which **is** `accounts.id`
 * (lightbridge-authz ADR-0006: "`accounts.id` … since ADR-0006, IS the caller's opaque JWT
 * subject"), and `searchUsers` returns a `users.id`. Those are the same string for the account a
 * login adopts: `set_account_user`'s fallback branch inserts `users(id) VALUES (NEW.id)` and sets
 * `user_id := id` whenever an INSERT names no owner, which is exactly how a person's HOME account
 * — "the one their login adopts, the one that becomes `auth().id`", ADR-0026 D6 — is created, and
 * `migrations/20260830000003_accounts_owned_by_users.sql` states the invariant in as many words
 * ("`users.id == accounts.id == subject` holds for all of them and stays holding"). A person's
 * ADDITIONAL owned accounts get a different id, but they are not what a session's subject names.
 * So the picked `userId` IS the subject to filter on, and the filter runs in the database rather
 * than over a partial page.
 *
 * ### Page size is `?limit=`, per call — and the pager says what the page really holds
 *
 * `querySessions.limit` is rows PER CALL (default 25, clamped at 100), so under the two-call
 * "Inactive" filter a page holds up to twice it. `pagination.pageSize` therefore reports
 * `limit × (number of calls)` — the page's real capacity — rather than the raw `?limit=`: the
 * caption's job is to make "12 rows" readable as "this page is not full", and a second number the
 * page could never reach would not do that. It is the same honesty `hasNext` already applies
 * ("true when EITHER half has more").
 *
 * Changing the size clears the cursor stack and `?after=`. A cursor names a position in a page
 * sequence; a different page size is a different sequence, so resuming an old cursor under a new
 * size would silently skip or repeat rows.
 */

const SESSIONS_QUERY_KEY = ['authz', 'querySessions'];

/** `searchUsers` refuses a shorter query outright ("a 1-character substring search is a table dump
 *  with extra steps") — the console does not fire one rather than collecting a `BadRequest`. */
const MIN_SEARCH_LENGTH = 2;

/** The wire `status` values each filter maps to. `inactive` is the two-call case. */
const STATUS_QUERIES: Record<SessionStatusFilter, string[]> = {
  active: ['active'],
  inactive: ['revoked', 'expired'],
  all: ['all'],
};

export interface AdminSessionsScreen {
  sessions: SessionLedgerRow[];
  loading: boolean;
  errorMessage: string | undefined;
  retry: () => void;
  /** Degraded, non-blocking — rendered above the table as a status line, never in place of it. */
  status: string | undefined;
  emptyMessage: string;
  /** Whether anything is currently narrowing the ledger — what decides whether `PageControls`
   *  renders a `Reset filters` affordance at all (a reset that is always on screen is a control
   *  that usually does nothing). `limit` is not a filter and does not count. */
  filtersActive: boolean;
  resetFilters: () => void;

  statusFilter: SessionStatusFilter;
  setStatusFilter: (status: SessionStatusFilter) => void;
  kindFilter: SessionKindFilter;
  setKindFilter: (kind: SessionKindFilter) => void;
  search: string;
  setSearch: (search: string) => void;
  userOptions: SelectFieldOption[];
  selectedUser: string;
  setSelectedUser: (subject: string) => void;
  /** Rows per `querySessions` call — the `?limit=` in the URL, one of `SESSION_PAGE_SIZES`. */
  pageSize: number;
  setPageSize: (pageSize: number) => void;

  pagination: {
    shown: number;
    /** The page's real capacity — `pageSize` times the number of calls this filter fires. */
    pageSize: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
  };

  selectedSessionId: string | null;
  selectSession: (row: SessionLedgerRow) => void;
  clearSelection: () => void;
  detail: SessionDetail | null;

  closeConfirmOpen: boolean;
  requestClose: () => void;
  cancelClose: () => void;
  confirmClose: () => void;
  closeAllConfirmOpen: boolean;
  requestCloseAll: () => void;
  cancelCloseAll: () => void;
  confirmCloseAll: () => void;
  revoking: boolean;
  revokeError: string | undefined;
  revokeSuccess: string | undefined;
}

/** Newest first, the order `querySessions` itself pages in (`ORDER BY created_at DESC, id DESC`)
 *  — restated here only because merging the two "inactive" halves interleaves them. */
function byCreatedDesc(a: SessionRow, b: SessionRow): number {
  const delta = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  return delta !== 0 ? delta : b.id.localeCompare(a.id);
}

export function useAdminSessionsScreen(): AdminSessionsScreen {
  const { t } = useTranslation('admin');
  const client = useConsoleAuthzClient();
  const queryClient = useQueryClient();
  const [view, setView] = useAdminSessionsParams();

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3, the same carve-out `use-refills-queue-screen.ts`
   * documents): the stack of page cursors a `Previous` press needs. `?after=` names the CURRENT
   * page; this is the trail that got the operator there — a browser-history-shaped concept, not
   * itself a fact about "what am I looking at", so it stays local rather than round-tripping
   * through the URL as a second, redundant param.
   */
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  /**
   * SANCTIONED LOCAL STATE: which confirmation is open. It is a modal step inside an already
   * URL-addressed selection (`?selected=<id>` IS in the URL), and a link that reopened a
   * half-confirmed revoke on someone else's screen is precisely what a shared URL must not do —
   * the same reasoning every unsent-dialog draft on this list carries.
   */
  const [confirming, setConfirming] = useState<'one' | 'all' | null>(null);

  const wireStatuses = STATUS_QUERIES[view.status];

  const sessionsQuery = useQuery({
    queryKey: [...SESSIONS_QUERY_KEY, view.status, view.kind, view.subject, view.after, view.limit],
    queryFn: async (): Promise<SessionPage[]> => {
      // One call per wire status — one for `active`/`all`, two for `inactive`. `Promise.all`
      // rather than sequential: they are independent reads and the pager treats them as one page.
      return Promise.all(
        wireStatuses.map((status) =>
          client.procedures.querySessions({
            args: {
              status,
              kind: view.kind === 'all' ? undefined : view.kind,
              subject: view.subject || undefined,
              after: view.after || undefined,
              limit: view.limit,
            },
          })
        )
      );
    },
  });

  const pages = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const rows = useMemo(() => pages.flatMap((page) => page.rows).sort(byCreatedDesc), [pages]);
  /**
   * `next` is null on the final page and ONLY there (`SessionPage`'s own contract). With two
   * halves in flight the merged page has more to show while EITHER half does; the cursor written
   * to `?after=` is the first non-null one, which is enough because both halves are cursors over
   * the same `(created_at, id)` ordering of the same table.
   */
  const nextCursor = pages.map((page) => page.next).find((cursor) => Boolean(cursor)) ?? null;

  // ── identity resolution: ONE batch per page ─────────────────────────────────────────────────

  const subjectUserIds = useMemo(() => subjectUserIdsOf(rows), [rows]);

  const profilesQuery = useQuery({
    ...userProfilesQuery(client, subjectUserIds),
    // Nothing to ask for: a page whose every row predates the subject column has no id to resolve,
    // and firing an empty batch would be a request that cannot answer anything. The page holds at
    // most `?limit=` rows (twice that for the two-call `inactive` case), and `?limit=` is capped
    // at 100 by `SESSION_PAGE_SIZES`, so the worst case is 200 ids — exactly the cap, never over
    // it. Widening `SESSION_PAGE_SIZES` past 100 would break that; `querySessions` clamps there
    // too, which is why it does not.
    enabled: subjectUserIds.length > 0,
  });

  const profilesById = useMemo(() => {
    if (profilesQuery.isError) return new Map<string, UserProfile>();
    if (!profilesQuery.data) return undefined;
    return new Map(profilesQuery.data.map((profile) => [profile.userId, profile]));
  }, [profilesQuery.data, profilesQuery.isError]);

  // ── user search ────────────────────────────────────────────────────────────────────────────

  const searchTerm = view.search.trim();
  const searchEnabled = searchTerm.length >= MIN_SEARCH_LENGTH;

  const searchQuery = useQuery({
    ...userSearchQuery(client, searchTerm),
    enabled: searchEnabled,
  });

  const userOptions: SelectFieldOption[] = useMemo(() => {
    const matches = searchQuery.data ?? [];
    return matches.map((profile) => {
      const name = profile.displayName || profile.username || profile.email || profile.userId;
      return {
        value: profile.userId,
        label: profile.email && profile.email !== name ? `${name} · ${profile.email}` : name,
      };
    });
  }, [searchQuery.data]);

  // ── rows ───────────────────────────────────────────────────────────────────────────────────

  const ledgerRows = useMemo(
    () =>
      rows.map((row) =>
        // The account label: `querySessions` returns no account NAME, and `resolveActorLabels` is
        // an estate lookup this screen deliberately does not fire — the person is what an operator
        // reads a session list by, and the account id is already the subject shown in the detail
        // sheet. Stating the id is honest; inventing a name would not be.
        toSessionLedgerRow(row, toSessionUser(row.subjectUserId, profilesById), row.accountId)
      ),
    [rows, profilesById]
  );

  const selectedRaw = rows.find((row) => row.id === view.selectedSessionId) ?? null;
  const selectedLedgerRow = ledgerRows.find((row) => row.id === view.selectedSessionId) ?? null;
  const detail =
    selectedRaw && selectedLedgerRow ? toSessionDetail(selectedRaw, selectedLedgerRow, rows) : null;

  // ── revoke, optimistically, with a real rollback ────────────────────────────────────────────

  /**
   * The optimistic write and its rollback both operate on the query cache, not on component
   * state: the row's status is server state, and the cache is where ADR 0011 says server state
   * lives. `onMutate` snapshots every page under this screen's key prefix and flips the affected
   * rows to `revoked`; `onError` restores the snapshot verbatim — no silent optimistic success.
   * `onSettled` refetches so the server's own computed status (which may differ, e.g. a session
   * that expired between the render and the click) replaces the guess.
   */
  const revoke = useMutation({
    mutationFn: async (
      variables: { kind: 'one'; id: string } | { kind: 'all'; accountId: string }
    ) => {
      if (variables.kind === 'one') {
        return client.procedures.revokeSession({ args: { id: variables.id } });
      }
      return client.procedures.revokeSubjectSessions({ args: { accountId: variables.accountId } });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: SESSIONS_QUERY_KEY });
      const snapshot = queryClient.getQueriesData<SessionPage[]>({ queryKey: SESSIONS_QUERY_KEY });

      const affects = (row: SessionRow) =>
        variables.kind === 'one'
          ? row.id === variables.id
          : row.subject === variables.accountId && row.status === 'active';

      queryClient.setQueriesData<SessionPage[]>({ queryKey: SESSIONS_QUERY_KEY }, (current) =>
        current?.map((page) => ({
          ...page,
          rows: page.rows.map((row) =>
            affects(row) ? { ...row, status: 'revoked', expired: false } : row
          ),
        }))
      );

      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSuccess: () => setConfirming(null),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });

  const revokeSuccess = useMemo(() => {
    if (!revoke.isSuccess || !revoke.data) return undefined;
    if ('revoked' in revoke.data) {
      return revoke.data.revoked ? t('sessions.revoked.one') : t('sessions.revoked.already');
    }
    const { revokedCount } = revoke.data;
    return revokedCount === 0
      ? t('sessions.revoked.none-left')
      : t('sessions.revoked.count', { count: revokedCount });
  }, [revoke.data, revoke.isSuccess, t]);

  const filtersAreDefault =
    view.status === 'active' && view.kind === 'all' && !view.subject && !view.search;

  return {
    sessions: ledgerRows,
    loading: sessionsQuery.isLoading,
    errorMessage: sessionsQuery.isError ? t('sessions.load-failed') : undefined,
    retry: () => {
      revoke.reset();
      void sessionsQuery.refetch();
    },
    status: profilesQuery.isError
      ? t('sessions.labels-unresolved')
      : searchQuery.isError
        ? t('sessions.search-failed')
        : searchEnabled && !searchQuery.isLoading && userOptions.length === 0
          ? t('sessions.empty.no-match', { search: searchTerm })
          : undefined,
    emptyMessage: filtersAreDefault
      ? t('sessions.empty.no-active')
      : t('sessions.empty.no-filter-match'),
    filtersActive: !filtersAreDefault,
    resetFilters: () => {
      setCursorStack([]);
      // `limit` is deliberately NOT reset: it is how much of the table the operator wants to see
      // at once, not one of the filters that produced an empty result. Resetting it would answer
      // "nothing matched" by also changing the page size, which is not what the button says.
      void setView({ status: 'active', kind: 'all', search: '', subject: '', after: '' });
    },

    statusFilter: view.status,
    setStatusFilter: (status) => {
      setCursorStack([]);
      void setView({ status, after: '' });
    },
    kindFilter: view.kind,
    setKindFilter: (kind) => {
      setCursorStack([]);
      void setView({ kind, after: '' });
    },
    search: view.search,
    // Changing the query invalidates whichever match was picked from the previous one: a filter
    // left pointing at a person who is no longer in the list is a filter nobody can see.
    setSearch: (search) => void setView({ search, subject: '', after: '' }),
    userOptions,
    selectedUser: view.subject,
    setSelectedUser: (subject) => {
      setCursorStack([]);
      void setView({ subject, after: '' });
    },
    pageSize: view.limit,
    setPageSize: (limit) => {
      // Same reset every other filter setter performs, for a sharper reason: a cursor is a
      // position in a page sequence, and a new size is a new sequence. Resuming the old cursor
      // would skip or repeat rows rather than merely showing a stale filter.
      setCursorStack([]);
      void setView({ limit: limit as SessionPageSize, after: '' });
    },

    pagination: {
      shown: ledgerRows.length,
      // The page's real capacity, not the raw `?limit=`: `inactive` fires two calls and merges
      // them, so its page holds up to twice the per-call limit. See this hook's own doc comment.
      pageSize: view.limit * wireStatuses.length,
      hasPrev: cursorStack.length > 0,
      hasNext: nextCursor !== null,
      onPrev: () => {
        setCursorStack((stack) => {
          const next = [...stack];
          const previous = next.pop() ?? '';
          void setView({ after: previous }, ADMIN_SESSIONS_NAVIGATION_OPTIONS);
          return next;
        });
      },
      onNext: () => {
        if (!nextCursor) return;
        setCursorStack((stack) => [...stack, view.after]);
        void setView({ after: nextCursor }, ADMIN_SESSIONS_NAVIGATION_OPTIONS);
      },
    },

    selectedSessionId: view.selectedSessionId || null,
    selectSession: (row) => {
      revoke.reset();
      setConfirming(null);
      void setView({ selectedSessionId: row.id }, ADMIN_SESSIONS_NAVIGATION_OPTIONS);
    },
    clearSelection: () => {
      revoke.reset();
      setConfirming(null);
      void setView({ selectedSessionId: '' }, ADMIN_SESSIONS_NAVIGATION_OPTIONS);
    },
    detail,

    closeConfirmOpen: confirming === 'one',
    requestClose: () => {
      revoke.reset();
      setConfirming('one');
    },
    cancelClose: () => setConfirming(null),
    confirmClose: () => {
      if (!detail) return;
      revoke.mutate({ kind: 'one', id: detail.id });
    },
    closeAllConfirmOpen: confirming === 'all',
    requestCloseAll: () => {
      revoke.reset();
      setConfirming('all');
    },
    cancelCloseAll: () => setConfirming(null),
    confirmCloseAll: () => {
      if (!detail?.subject) return;
      revoke.mutate({ kind: 'all', accountId: detail.subject });
    },
    revoking: revoke.isPending,
    revokeError: revoke.isError ? getApiErrorMessage(revoke.error) : undefined,
    revokeSuccess,
  };
}
