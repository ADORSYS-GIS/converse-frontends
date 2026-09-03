'use client';

import type { PlatformRoleGrant, PlatformRoleGrantPage, UserProfile } from '@lightbridge/authz-rpc';
import type {
  GrantRoleDialogProps,
  GrantUserOption,
  PlatformRoleGrantRow,
  PlatformRoleGrantsProps,
  RevokeRoleDialogProps,
} from '@lightbridge/ui-web';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useDebouncedValue } from '../client/use-debounced-value';
import { CONSOLE_DIALOGS, useAdminRolesParams, useUrlDialog } from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { PLATFORM_ROLES } from '../shared/permissions';
import { grantIdentityIdsOf, toPlatformRoleGrantRow } from './role-grant-rows';

/**
 * `/admin/roles` — the platform-role grant directory's data adapter (converse-frontends#452,
 * story C9), backed by lightbridge-authz#656's four procedures.
 *
 * Like the refills queue, this screen is NOT refine-driven: `listPlatformRoleGrants`,
 * `grantPlatformRole`, `revokePlatformRole` and `searchUsers` are cratestack **procedures** on
 * `authz-api`, and a refine `DataProvider` only models resource CRUD. They go through TanStack
 * Query directly, on the same `QueryClient` refine uses.
 *
 * View state is the URL (ADR 0011): `?role=`/`?revoked=`/`?after=` describe the page an operator
 * is actually looking at, and `?grant=`/`?revoke=` are the two dialogs. The grant FORM's drafts
 * are local — a person's name typed into a search box has no business in browser history.
 *
 * Access is gated **server-side** in `app/(console)/admin/roles/page.tsx` on `rbac:manage`, and
 * `lightbridge-authz` independently refuses every procedure below without it, so nothing here is a
 * security boundary.
 */

const PAGE_SIZE = 50;
const GRANTS_QUERY_KEY = ['authz', 'platformRoleGrants', PAGE_SIZE];
/** Sorted, de-duplicated id list as the variable part — see `grantIdentityIdsOf`'s own comment. */
const IDENTITY_QUERY_KEY = ['authz', 'resolveUserProfiles'];
const USER_SEARCH_QUERY_KEY = ['authz', 'searchUsers'];

/** `searchUsers` REFUSES a shorter query outright (`SearchUsersInput`'s own contract), so the
 *  dialog states this number rather than firing a call it knows will fail. */
export const USER_SEARCH_MIN_LENGTH = 2;
/** Explicit, never the backend's implicit default: the acceptance criterion asks for a stated
 *  limit, and the popup is a picker, not a directory browser. The backend clamps at 50 anyway. */
export const USER_SEARCH_LIMIT = 20;
/** Long enough that typing a name is one request, short enough that the list still feels live. */
const USER_SEARCH_DEBOUNCE_MS = 300;

/**
 * Identity resolution failed but the grants themselves did not — rendered as an `InlineStatus`
 * above the table. The rows are real and revocable; only their names are missing, and a failed
 * secondary lookup must never blank a page of live grants.
 */
const IDENTITY_DEGRADED_MESSAGE =
  'User names could not be resolved — showing the raw user id instead.';

/** Shared so the grant dialog and the ledger observe the same outcome (`use-shared-mutation.ts`). */
const GRANT_MUTATION_KEY = ['authz', 'grantPlatformRole'];
const REVOKE_MUTATION_KEY = ['authz', 'revokePlatformRole'];

export interface AdminRolesScreen {
  ledger: PlatformRoleGrantsProps;
  grantDialog: GrantRoleDialogProps;
  revokeDialog: RevokeRoleDialogProps;
  /** Opens the grant dialog — wired to `PageHeader.action`. */
  openGrantDialog: () => void;
  /**
   * The last completed mutation, said in one line under the header: how many sessions a revocation
   * closed, or that a grant will reach its holder at the next mint. `undefined` when nothing has
   * happened yet — the console has no toast pattern (ADR 0008), so an outcome is a status line or
   * it is nothing.
   */
  outcome: string | undefined;
  dismissOutcome: () => void;
}

export function useAdminRolesScreen(): AdminRolesScreen {
  const client = useConsoleAuthzClient();
  const queryClient = useQueryClient();
  const session = useConsoleSession();
  const [view, setView] = useAdminRolesParams();
  // Both of this screen's modals, on the console's one `?dialog=` contract (owner directive
  // 2026-09-03): `?dialog=grant-role` and `?dialog=revoke-role&dialog-id=<grant id>`.
  const grantDialogUrl = useUrlDialog(CONSOLE_DIALOGS.grantRole);
  const revokeDialogUrl = useUrlDialog(CONSOLE_DIALOGS.revokeRole);

  /**
   * SANCTIONED LOCAL STATE (ADR 0011 Decision 3 — in-flight form drafts): the grant form. The
   * search box names a real person, the reason is prose about why someone is being given
   * authority, and both would otherwise be written into browser history and into every link
   * copied from the address bar.
   */
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<GrantUserOption | null>(null);
  const [role, setRole] = useState<string>(PLATFORM_ROLES[0]);
  const [reason, setReason] = useState('');

  /**
   * SANCTIONED LOCAL STATE: the stack of page cursors a `Previous` press needs. `?after=` names
   * the CURRENT page; this is the trail that got there — a browser-history-shaped concept, not a
   * fact about what is on screen (the identical split `use-refills-queue-screen.ts` documents).
   */
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const grantsQuery = useQuery({
    queryKey: [...GRANTS_QUERY_KEY, view.role, view.includeRevoked, view.after],
    queryFn: async (): Promise<PlatformRoleGrantPage> =>
      client.procedures.listPlatformRoleGrants({
        args: {
          limit: PAGE_SIZE,
          role: view.role || undefined,
          includeRevoked: view.includeRevoked,
          after: view.after || undefined,
        },
      }),
  });

  const grants = useMemo<PlatformRoleGrant[]>(
    () => grantsQuery.data?.entries ?? [],
    [grantsQuery.data]
  );
  // `null`/`undefined` means "nothing further to page to", per the schema's own contract — never
  // assumed `false` before the fetch has answered.
  const nextCursor = grantsQuery.data?.nextCursor ?? null;

  /**
   * ONE `resolveUserProfiles` batch per page, over every holder AND granter id on it. The 200-id
   * cap the input documents cannot be reached: `PAGE_SIZE` is 50, so at most 100 ids.
   */
  const identityIds = useMemo(() => grantIdentityIdsOf(grants), [grants]);

  const identityQuery = useQuery({
    queryKey: [...IDENTITY_QUERY_KEY, identityIds],
    queryFn: async () => client.procedures.resolveUserProfiles({ args: { userIds: identityIds } }),
    enabled: identityIds.length > 0,
  });

  /** `undefined` while the batch has not answered — which is what makes rows render `Resolving…`
   *  rather than the "we asked and got nothing" sentinel. An empty map after a failure is the
   *  second, genuinely different claim. */
  const profiles = useMemo<ReadonlyMap<string, UserProfile> | undefined>(() => {
    if (identityIds.length === 0) return new Map();
    if (identityQuery.isPending) return undefined;
    return new Map(
      (identityQuery.data?.profiles ?? []).map((profile) => [profile.userId, profile])
    );
  }, [identityIds.length, identityQuery.isPending, identityQuery.data]);

  const rows = useMemo<PlatformRoleGrantRow[]>(
    () =>
      grants.map((grant) =>
        toPlatformRoleGrantRow(grant, profiles, session.user?.platformUserId ?? '')
      ),
    [grants, profiles, session.user?.platformUserId]
  );

  // ── the person picker ───────────────────────────────────────────────────────────────────────

  const debouncedQuery = useDebouncedValue(query.trim(), USER_SEARCH_DEBOUNCE_MS);
  // Not searched once a person is chosen: Base UI's combobox fills the input with the selected
  // label on press, which would otherwise fire a fresh search for the name already picked.
  const searchEnabled =
    grantDialogUrl.open && selectedUser === null && debouncedQuery.length >= USER_SEARCH_MIN_LENGTH;

  const searchQuery = useQuery({
    queryKey: [...USER_SEARCH_QUERY_KEY, debouncedQuery, USER_SEARCH_LIMIT],
    queryFn: async () =>
      client.procedures.searchUsers({ args: { query: debouncedQuery, limit: USER_SEARCH_LIMIT } }),
    enabled: searchEnabled,
  });

  const results = useMemo<GrantUserOption[]>(
    () =>
      (searchQuery.data?.users ?? []).map((profile) => ({
        userId: profile.userId,
        // Same precedence `toRequester` uses: an email is a fallback identity, not a preferred
        // one. The raw id is the last resort — a row that exists but names nobody still has to be
        // pickable, since it is a real person somebody may need to grant a role to.
        label: profile.displayName || profile.username || profile.email || profile.userId,
        email: profile.email ?? undefined,
      })),
    [searchQuery.data]
  );

  // ── mutations ───────────────────────────────────────────────────────────────────────────────

  const invalidateGrants = () => {
    void queryClient.invalidateQueries({ queryKey: GRANTS_QUERY_KEY });
  };

  const closeGrantDialog = () => {
    grantDialogUrl.close();
    setQuery('');
    setSelectedUser(null);
    setRole(PLATFORM_ROLES[0]);
    setReason('');
  };

  const grant = useSharedMutation<
    { userId: string; role: string; reason?: string },
    PlatformRoleGrant
  >({
    mutationKey: GRANT_MUTATION_KEY,
    mutationFn: (variables) => client.procedures.grantPlatformRole({ args: variables }),
    onSuccess: () => {
      invalidateGrants();
      closeGrantDialog();
    },
  });

  const revokeTargetRow = revokeDialogUrl.id
    ? (rows.find((row) => row.id === revokeDialogUrl.id) ?? null)
    : null;

  const revoke = useSharedMutation<
    { grantId: string; reason?: string },
    { grant: PlatformRoleGrant; revokedSessionCount: number }
  >({
    mutationKey: REVOKE_MUTATION_KEY,
    mutationFn: (variables) => client.procedures.revokePlatformRole({ args: variables }),
    onSuccess: () => {
      invalidateGrants();
      revokeDialogUrl.close();
    },
  });

  /**
   * The one line either mutation leaves behind. Both state the propagation rule rather than
   * claiming immediate effect — a grant reaches its holder at the next mint, a revocation bites
   * now BECAUSE it closed their sessions, and `revokedSessionCount` is the honest figure for how
   * many. `0` is a real answer (they had none open), printed as such.
   */
  const outcome = revoke.data
    ? `Revoked ${revoke.data.grant.role} · ${revoke.data.revokedSessionCount} session${
        revoke.data.revokedSessionCount === 1 ? '' : 's'
      } closed, so the change applies now.`
    : grant.data
      ? `Granted ${grant.data.role} · it reaches them at their next token mint.`
      : undefined;

  return {
    ledger: {
      grants: rows,
      loading: grantsQuery.isPending,
      loadingRowCount: 6,
      error: grantsQuery.isError ? 'Could not load platform role grants.' : undefined,
      onRetry: () => void grantsQuery.refetch(),
      roleFilter: view.role,
      onRoleFilterChange: (next) => {
        // A new filter is a new collection: the cursor from the old one names a row that may not
        // be in it at all, so both the URL cursor and the local trail reset together.
        setCursorStack([]);
        void setView({ role: next, after: '' });
      },
      roles: PLATFORM_ROLES,
      includeRevoked: view.includeRevoked,
      onIncludeRevokedChange: (next) => {
        setCursorStack([]);
        void setView({ includeRevoked: next, after: '' });
      },
      onRequestRevoke: (row) => {
        revoke.dismiss();
        revokeDialogUrl.openDialog(row.id);
      },
      identityStatus: identityQuery.isError ? IDENTITY_DEGRADED_MESSAGE : undefined,
      pagination: {
        shown: rows.length,
        hasPrev: cursorStack.length > 0,
        hasNext: nextCursor !== null,
        onPrev: () => {
          const previous = cursorStack[cursorStack.length - 1] ?? '';
          setCursorStack((stack) => stack.slice(0, -1));
          void setView({ after: previous });
        },
        onNext: () => {
          if (!nextCursor) return;
          setCursorStack((stack) => [...stack, view.after]);
          void setView({ after: nextCursor });
        },
      },
    },
    grantDialog: {
      open: grantDialogUrl.open,
      query,
      onQueryChange: setQuery,
      minQueryLength: USER_SEARCH_MIN_LENGTH,
      results,
      searching: searchEnabled && searchQuery.isPending,
      searchError: searchQuery.isError ? 'User search is unavailable.' : undefined,
      selectedUser,
      onSelectUser: setSelectedUser,
      role,
      onRoleChange: setRole,
      roles: PLATFORM_ROLES,
      reason,
      onReasonChange: setReason,
      submitting: grant.isPending,
      error: grant.errorMessage,
      onSubmit: () => {
        if (!selectedUser) return;
        grant.mutate({
          userId: selectedUser.userId,
          role,
          // An empty reason is allowed on the wire; sending `''` would record a reason that says
          // nothing, so it is sent as absent.
          reason: reason.trim() || undefined,
        });
      },
      onCancel: () => {
        grant.dismiss();
        closeGrantDialog();
      },
    },
    revokeDialog: {
      grant: revokeTargetRow,
      submitting: revoke.isPending,
      error: revoke.errorMessage,
      onConfirm: () => {
        if (!revokeTargetRow) return;
        revoke.mutate({ grantId: revokeTargetRow.id });
      },
      onCancel: () => {
        revoke.dismiss();
        revokeDialogUrl.close();
      },
    },
    openGrantDialog: () => {
      grant.dismiss();
      grantDialogUrl.openDialog();
    },
    outcome,
    dismissOutcome: () => {
      grant.dismiss();
      revoke.dismiss();
    },
  };
}
