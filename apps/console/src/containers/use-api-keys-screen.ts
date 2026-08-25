'use client';

import type { ApiKey } from '@lightbridge/authz-rpc';
import type {
  ApiKeyRow,
  ApiKeysHygiene,
  ApiKeysRevokeTarget,
  ApiKeysSecretReveal,
  ScopeSelectProps,
  SegmentedOption,
} from '@lightbridge/ui-web';
import { useDelete, useList } from '@refinedev/core';
import { useMemo } from 'react';

import { useConsoleScopeContext } from '../client/console-scope-context';
import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useApiKeysViewState } from '../client/view-state';
import { apiKeysHygiene, apiKeysStatusSummary, toApiKeyRows } from './api-key-rows';

/**
 * `/api-keys` — the screen's data adapter, shared by its centre (`page.tsx`) and its rail
 * (`@rail/api-keys/page.tsx`).
 *
 * The adapter's whole job is turning hook state into section props: the sections stay pure (no
 * fetching, no refine hooks), exactly as the console-ui skill requires. Listing, paging and
 * filtering go through the generated DataProvider; create/rotate/revoke are cratestack
 * **procedures**, which a `DataProvider` has no slot for, so they call the client directly and
 * then invalidate the list.
 *
 * Centre and rail both call this hook. They therefore issue the same `useList` key and TanStack
 * Query serves both from ONE request — and both write to the same view-state store, so the rail's
 * FILTERS section and the centre's ledger cannot drift apart.
 */

const PAGE_SIZE = 25;

export const STATUS_FILTER_OPTIONS: SegmentedOption<string>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
];

/** Default lifetime for a key created from the rail's one-click action. */
const DEFAULT_KEY_LIFETIME_DAYS = 90;

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
  remove: (row: ApiKeyRow) => void;
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
  const scope = useConsoleScopeContext();
  const client = useConsoleAuthzClient();
  const [view, patchView] = useApiKeysViewState();

  const filters = useMemo(() => {
    const active = [];
    if (scope.value.projectId) {
      active.push({ field: 'projectId', operator: 'eq' as const, value: scope.value.projectId });
    }
    if (view.statusFilter !== 'all') {
      active.push({ field: 'status', operator: 'eq' as const, value: view.statusFilter });
    }
    if (view.search.trim()) {
      active.push({ field: 'name', operator: 'contains' as const, value: view.search.trim() });
    }
    return active;
  }, [scope.value.projectId, view.statusFilter, view.search]);

  const list = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: view.page, pageSize: PAGE_SIZE },
    filters,
    sorters: [{ field: 'createdAt', order: 'desc' }],
  });

  const { mutate: deleteKey } = useDelete();

  const keys = list.result.data;
  const total = list.result.total ?? keys.length;
  // The fetch timestamp, not `Date.now()`: reading the clock during render is impure (it makes
  // the output depend on when React happens to re-render), and "expiring soon" is genuinely
  // relative to when the data was read, not to this particular render.
  const now = list.query.dataUpdatedAt;
  const rows = useMemo(() => toApiKeyRows(keys, now), [keys, now]);

  const refresh = () => {
    void list.query.refetch();
  };

  const runProcedure = async (action: () => Promise<void>) => {
    patchView({ actionError: null });
    try {
      await action();
      refresh();
    } catch (error) {
      patchView({ actionError: error instanceof Error ? error.message : String(error) });
    }
  };

  return {
    scopeAccountLabel: scope.value.accountId || '—',
    scopeProjectLabel:
      scope.projects.find((project) => project.id === scope.value.projectId)?.label ??
      'All projects',
    rows,
    loading: list.query.isLoading,
    errorMessage: list.query.isError
      ? 'Could not load API keys.'
      : (view.actionError ?? undefined),
    statusSummary: apiKeysStatusSummary(keys, now),
    emptyMessage: scope.value.projectId
      ? 'No API keys in this project yet.'
      : 'No API keys yet. Pick a project to scope the list.',
    hygiene: apiKeysHygiene(keys, now),
    secretReveal: view.secretReveal,
    dismissSecret: () => patchView({ secretReveal: null }),
    revokeTarget: view.revokeTarget,
    requestRevoke: (row) => patchView({ revokeTarget: { row } }),
    confirmRevoke: (row) => {
      void (async () => {
        try {
          await client.procedures.revokeApiKey({ args: { keyId: row.id } });
          patchView({ revokeTarget: null });
          refresh();
        } catch (error) {
          // The dialog stays open carrying the reason — that is its documented error contract.
          patchView({
            revokeTarget: {
              row,
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      })();
    },
    cancelRevoke: () => patchView({ revokeTarget: null }),
    rotate: (row) => {
      void runProcedure(async () => {
        const rotated = await client.procedures.rotateApiKey({ args: { keyId: row.id } });
        patchView({
          secretReveal: {
            heading: `Rotated ${row.name}`,
            description:
              'The previous secret is now invalid. Copy the new one — it is shown only once.',
            secret: rotated.secret,
          },
        });
      });
    },
    remove: (row) => {
      deleteKey({ resource: 'apiKeys', id: row.id });
    },
    createKey: () => {
      const projectId = scope.value.projectId;
      if (!projectId) {
        patchView({ actionError: 'Select a project before creating a key.' });
        return;
      }
      void runProcedure(async () => {
        const created = await client.procedures.createApiKey({
          args: {
            projectId,
            name: `key-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}`,
            expiresAt: new Date(
              Date.now() + DEFAULT_KEY_LIFETIME_DAYS * 86_400_000
            ).toISOString(),
            billingPlan: 'standard',
          },
        });
        patchView({
          secretReveal: {
            heading: 'New API key',
            description:
              'Copy it now — this is the only time the secret is shown. It cannot be retrieved again.',
            secret: created.secret,
          },
        });
      });
    },
    selectedRowKeys: view.selectedRowKeys,
    selectRow: (row) => patchView({ selectedRowKeys: [row.id] }),
    retry: refresh,
    pagination: {
      shown: rows.length,
      total,
      hasPrev: view.page > 1,
      hasNext: view.page * PAGE_SIZE < total,
      onPrev: () => patchView({ page: Math.max(1, view.page - 1) }),
      onNext: () => patchView({ page: view.page + 1 }),
    },
    scopeSelect: {
      accounts: scope.accounts,
      projects: scope.projects,
      value: scope.value,
      onChange: (value) => {
        scope.setValue(value);
        patchView({ page: 1 });
      },
    },
    statusFilterOptions: STATUS_FILTER_OPTIONS,
    statusFilterValue: view.statusFilter,
    setStatusFilter: (statusFilter) => patchView({ statusFilter, page: 1 }),
    search: view.search,
    setSearch: (search) => patchView({ search, page: 1 }),
  };
}
