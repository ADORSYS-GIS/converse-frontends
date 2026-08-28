'use client';

import type { ApiKey } from '@lightbridge/authz-rpc';
import type {
  ApiKeyRow,
  ApiKeysDeleteTarget,
  ApiKeysHygiene,
  ApiKeysRevokeTarget,
  ApiKeysSecretReveal,
  ScopeSelectProps,
  SegmentedOption,
} from '@lightbridge/ui-web';
import { useDelete, useList } from '@refinedev/core';
import { useMemo } from 'react';

import { useConsoleScope } from '../client/use-console-scope';
import { useConsoleSession } from '../client/session-context';
import { useConsoleAuthzClient } from '../client/rpc-clients';
import {
  API_KEYS_SELECTION_OPTIONS,
  API_KEY_STATUSES,
  useApiKeysParams,
} from '../client/url-state';
import { useSharedMutation } from '../client/use-shared-mutation';
import { apiKeysHygiene, apiKeysStatusSummary, toApiKeyRows } from './api-key-rows';

/**
 * `/api-keys` — the screen's data adapter, shared by its centre (`page.tsx`) and its rail
 * (`@rail/api-keys/page.tsx`).
 *
 * The adapter's whole job is turning URL state + hook state into section props: the sections stay
 * pure (no fetching, no refine hooks, no nuqs), exactly as the console-ui skill requires. Listing,
 * paging and filtering go through the generated DataProvider; create/rotate/revoke are cratestack
 * **procedures**, which a `DataProvider` has no slot for, so they call the client directly.
 *
 * **The URL is the bus** (ADR 0011). Centre and rail both call this hook, so they issue the same
 * `useList` key and TanStack Query serves both from ONE request — and both read the same
 * `?status=…&q=…&page=…&key=…` params, so the rail's FILTERS section and the centre's ledger cannot
 * drift apart. The flow is strictly one-way: URL -> filters -> refine (`syncWithLocation` is off).
 *
 * **What is deliberately NOT in the URL**: the one-time secret a create/rotate returns, and the
 * reason an action failed. Both are mutation outcomes, both are still needed in a *different* zone
 * from the one that fired them, and the first is a credential that must never be written to a
 * history entry — so they travel through the shared `MutationCache` instead
 * (`client/use-shared-mutation.ts`).
 *
 * **Delete (ticket #321)**: `Del` is gated exactly like Revoke — a `TypedConfirmDialog` retargeted
 * by `?delete=<id>`, gone through `useDelete()`'s own `mutation` (a full react-query
 * `UseMutationResult`) rather than the shared cache, because unlike Revoke this mutation has no
 * other zone to share its outcome with — the dialog only ever renders in the centre. `isAdmin`
 * comes straight from the session (`useConsoleSession()`) the root layout already decrypted
 * server-side; it is presentation only — see `ApiKeysLedgerProps.isAdmin`'s doc comment for why
 * this is not the security boundary.
 */

const PAGE_SIZE = 25;

const STATUS_LABELS: Record<(typeof API_KEY_STATUSES)[number], string> = {
  all: 'All',
  active: 'Active',
  revoked: 'Revoked',
};

export const STATUS_FILTER_OPTIONS: SegmentedOption<string>[] = API_KEY_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

/** Default lifetime for a key created from the rail's one-click action. */
const DEFAULT_KEY_LIFETIME_DAYS = 90;

/**
 * Module-level so every zone agrees on the identity: `+ New key` is pressed in the rail, the
 * secret it returns is rendered by the ledger in the centre.
 */
const SECRET_MUTATION_KEY = ['api-keys', 'secret'];
const REVOKE_MUTATION_KEY = ['api-keys', 'revoke'];

type SecretRequest =
  { kind: 'create'; projectId: string | null } | { kind: 'rotate'; keyId: string; name: string };

export interface ApiKeysScreen {
  scopeAccountLabel: string;
  scopeProjectLabel: string;
  rows: ApiKeyRow[];
  loading: boolean;
  errorMessage: string | undefined;
  statusSummary: string;
  emptyMessage: string;
  hygiene: ApiKeysHygiene;
  secretReveal: ApiKeysSecretReveal | null;
  dismissSecret: () => void;
  revokeTarget: ApiKeysRevokeTarget | null;
  requestRevoke: (row: ApiKeyRow) => void;
  confirmRevoke: (row: ApiKeyRow) => void;
  cancelRevoke: () => void;
  rotate: (row: ApiKeyRow) => void;
  isAdmin: boolean;
  deleteTarget: ApiKeysDeleteTarget | null;
  requestDelete: (row: ApiKeyRow) => void;
  confirmDelete: (row: ApiKeyRow) => void;
  cancelDelete: () => void;
  createKey: () => void;
  selectedRowKeys: string[];
  selectRow: (row: ApiKeyRow) => void;
  retry: () => void;
  pagination: {
    shown: number;
    total: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
  };
  scopeSelect: ScopeSelectProps;
  statusFilterOptions: SegmentedOption<string>[];
  statusFilterValue: string;
  setStatusFilter: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
}

export function useApiKeysScreen(): ApiKeysScreen {
  const scope = useConsoleScope();
  const session = useConsoleSession();
  const client = useConsoleAuthzClient();
  const [view, setView] = useApiKeysParams();

  const filters = useMemo(() => {
    const active = [];
    if (scope.value.projectId) {
      active.push({ field: 'projectId', operator: 'eq' as const, value: scope.value.projectId });
    }
    if (view.status !== 'all') {
      active.push({ field: 'status', operator: 'eq' as const, value: view.status });
    }
    if (view.search.trim()) {
      active.push({ field: 'name', operator: 'contains' as const, value: view.search.trim() });
    }
    return active;
  }, [scope.value.projectId, view.status, view.search]);

  const list = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: view.page, pageSize: PAGE_SIZE },
    filters,
    sorters: [{ field: 'createdAt', order: 'desc' }],
  });

  // `mutation` is the underlying react-query `UseMutationResult` — its own `.error`/`.isPending`
  // give the delete confirmation everything it needs without a `useSharedMutation`: unlike
  // Revoke, which is a bespoke procedure call, Delete goes through refine's generic resource
  // `DataProvider` (`useDelete`) already gets a per-instance mutation object for free, and the
  // dialog it feeds only ever renders in this one zone (the centre), so there is no second zone
  // to read the outcome from a shared cache.
  const { mutate: deleteKeyMutate, mutation: deleteMutation } = useDelete();

  const refresh = () => {
    void list.query.refetch();
  };

  const secret = useSharedMutation<SecretRequest, ApiKeysSecretReveal>({
    mutationKey: SECRET_MUTATION_KEY,
    mutationFn: async (request) => {
      if (request.kind === 'rotate') {
        const rotated = await client.procedures.rotateApiKey({ args: { keyId: request.keyId } });
        return {
          heading: `Rotated ${request.name}`,
          description:
            'The previous secret is now invalid. Copy the new one — it is shown only once.',
          secret: rotated.secret,
        };
      }
      // A guard, not a UI branch: reported through the same inline error line every other failure
      // of this action uses, and visible in whichever zone is rendering it.
      if (!request.projectId) throw new Error('Select a project before creating a key.');
      const created = await client.procedures.createApiKey({
        args: {
          projectId: request.projectId,
          name: `key-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}`,
          expiresAt: new Date(Date.now() + DEFAULT_KEY_LIFETIME_DAYS * 86_400_000).toISOString(),
          billingPlan: 'standard',
        },
      });
      return {
        heading: 'New API key',
        description:
          'Copy it now — this is the only time the secret is shown. It cannot be retrieved again.',
        secret: created.secret,
      };
    },
    onSuccess: refresh,
  });

  const revoke = useSharedMutation<{ keyId: string }, void>({
    mutationKey: REVOKE_MUTATION_KEY,
    mutationFn: async ({ keyId }) => {
      await client.procedures.revokeApiKey({ args: { keyId } });
    },
    onSuccess: () => {
      void setView({ revokeKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
      refresh();
    },
  });

  const keys = list.result.data;
  const total = list.result.total ?? keys.length;
  // The fetch timestamp, not `Date.now()`: reading the clock during render is impure (it makes
  // the output depend on when React happens to re-render), and "expiring soon" is genuinely
  // relative to when the data was read, not to this particular render.
  const now = list.query.dataUpdatedAt;
  const rows = useMemo(() => toApiKeyRows(keys, now), [keys, now]);

  // The revoke DIALOG is view state (`?revoke=<id>`), so Back closes it and the confirmation is
  // linkable; the row it points at is looked up in the data, and the failure reason it may carry
  // comes from the mutation, never from the URL. The delete dialog (`?delete=<id>`) is the same
  // shape.
  const revokeRow = rows.find((row) => row.id === view.revokeKeyId) ?? null;
  const deleteRow = rows.find((row) => row.id === view.deleteKeyId) ?? null;
  const deleteErrorMessage = deleteMutation.error?.message;

  return {
    scopeAccountLabel: scope.value.accountId || '—',
    scopeProjectLabel:
      scope.projects.find((project) => project.id === scope.value.projectId)?.label ??
      'All projects',
    rows,
    loading: list.query.isLoading,
    errorMessage: list.query.isError ? 'Could not load API keys.' : secret.errorMessage,
    statusSummary: apiKeysStatusSummary(keys, now),
    emptyMessage: scope.value.projectId
      ? 'No API keys in this project yet.'
      : 'No API keys yet. Pick a project to scope the list.',
    hygiene: apiKeysHygiene(keys, now),
    secretReveal: secret.data ?? null,
    dismissSecret: secret.dismiss,
    revokeTarget: revokeRow ? { row: revokeRow, error: revoke.errorMessage } : null,
    requestRevoke: (row) => {
      revoke.dismiss();
      // Only one destructive dialog can be open at once — clearing the other target here means
      // Revoke and Delete can never both be `?revoke=…&delete=…` at the same time.
      void setView({ revokeKeyId: row.id, deleteKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
    },
    confirmRevoke: (row) => revoke.mutate({ keyId: row.id }),
    cancelRevoke: () => {
      revoke.dismiss();
      void setView({ revokeKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
    },
    rotate: (row) => secret.mutate({ kind: 'rotate', keyId: row.id, name: row.name }),
    // Presentation only (see `ApiKeysLedgerProps.isAdmin`'s doc comment): `lightbridge-authz`
    // refuses `apiKeys:delete` server-side regardless of what this renders.
    isAdmin: session.isAdmin,
    deleteTarget: deleteRow ? { row: deleteRow, error: deleteErrorMessage } : null,
    requestDelete: (row) => {
      deleteMutation.reset();
      void setView({ deleteKeyId: row.id, revokeKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
    },
    confirmDelete: (row) => {
      deleteKeyMutate(
        { resource: 'apiKeys', id: row.id },
        {
          onSuccess: () => {
            void setView({ deleteKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
            refresh();
          },
        }
      );
    },
    cancelDelete: () => {
      deleteMutation.reset();
      void setView({ deleteKeyId: '' }, API_KEYS_SELECTION_OPTIONS);
    },
    createKey: () => secret.mutate({ kind: 'create', projectId: scope.value.projectId }),
    selectedRowKeys: view.selectedKeyId ? [view.selectedKeyId] : [],
    selectRow: (row) => {
      void setView({ selectedKeyId: row.id }, API_KEYS_SELECTION_OPTIONS);
    },
    retry: refresh,
    pagination: {
      shown: rows.length,
      total,
      hasPrev: view.page > 1,
      hasNext: view.page * PAGE_SIZE < total,
      onPrev: () => {
        void setView({ page: Math.max(1, view.page - 1) });
      },
      onNext: () => {
        void setView({ page: view.page + 1 });
      },
    },
    scopeSelect: {
      accounts: scope.accounts,
      projects: scope.projects,
      value: scope.value,
      onChange: (value) => {
        scope.setValue(value);
        // Re-scoping invalidates the current page number. Queued in the same tick as the scope
        // write above, so nuqs coalesces both into ONE history entry — not two Back presses.
        void setView({ page: 1 }, { history: 'push' });
      },
    },
    statusFilterOptions: STATUS_FILTER_OPTIONS,
    statusFilterValue: view.status,
    setStatusFilter: (status) => {
      void setView({ status: status as (typeof API_KEY_STATUSES)[number], page: 1 });
    },
    search: view.search,
    setSearch: (search) => {
      void setView({ search, page: 1 });
    },
  };
}
