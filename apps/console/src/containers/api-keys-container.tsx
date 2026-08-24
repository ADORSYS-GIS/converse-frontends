'use client';

import type { ApiKey } from '@lightbridge/authz-rpc';
import {
  ApiKeysPage,
  type ApiKeyRow,
  type ApiKeysRevokeTarget,
  type ApiKeysSecretReveal,
  type SegmentedOption,
} from '@lightbridge/ui-web';
import { useDelete, useList } from '@refinedev/core';
import { useMemo, useState } from 'react';

import { ConsoleHeaderBar, adminNavItems, navItems } from '../client/console-chrome';
import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useConsoleSession } from '../client/session-context';
import { useConsoleScope } from '../client/use-console-scope';
import { apiKeysHygiene, apiKeysStatusSummary, toApiKeyRows } from './api-key-rows';

/**
 * `/api-keys` — the `ApiKeysPage` view driven by refine over the generated `apiKeys` resource.
 *
 * The container's whole job is adapting hook state to props: the page view stays pure (no fetching,
 * no refine hooks), exactly as the console-ui skill requires. Listing, paging and filtering go
 * through the generated DataProvider; create/rotate/revoke are cratestack **procedures**, which a
 * `DataProvider` has no slot for, so they call the client directly and then invalidate the list.
 */

const PAGE_SIZE = 25;

const STATUS_FILTER_OPTIONS: SegmentedOption<string>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
];

/** Default lifetime for a key created from the rail's one-click action. */
const DEFAULT_KEY_LIFETIME_DAYS = 90;

export function ApiKeysContainer() {
  const session = useConsoleSession();
  const scope = useConsoleScope();
  const client = useConsoleAuthzClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeysRevokeTarget | null>(null);
  const [secretReveal, setSecretReveal] = useState<ApiKeysSecretReveal | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filters = useMemo(() => {
    const active = [];
    if (scope.value.projectId) {
      active.push({ field: 'projectId', operator: 'eq' as const, value: scope.value.projectId });
    }
    if (statusFilter !== 'all') {
      active.push({ field: 'status', operator: 'eq' as const, value: statusFilter });
    }
    if (search.trim()) {
      active.push({ field: 'name', operator: 'contains' as const, value: search.trim() });
    }
    return active;
  }, [scope.value.projectId, statusFilter, search]);

  const list = useList<ApiKey>({
    resource: 'apiKeys',
    pagination: { currentPage: page, pageSize: PAGE_SIZE },
    filters,
    sorters: [{ field: 'createdAt', order: 'desc' }],
  });

  const { mutate: deleteKey } = useDelete();

  const keys = list.result.data;
  const total = list.result.total ?? keys.length;
  // The fetch timestamp, not `Date.now()`: reading the clock during render is impure (it makes the
  // output depend on when React happens to re-render), and "expiring soon" is genuinely relative to
  // when the data was read, not to this particular render.
  const now = list.query.dataUpdatedAt;
  const rows = useMemo(() => toApiKeyRows(keys, now), [keys, now]);

  const refresh = () => {
    void list.query.refetch();
  };

  const runProcedure = async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
      refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  };

  const errorMessage = list.query.isError ? 'Could not load API keys.' : (actionError ?? undefined);

  return (
    <ApiKeysPage
      header={<ConsoleHeaderBar />}
      nav={{
        items: navItems('api-keys'),
        adminItems: adminNavItems('api-keys'),
        showAdmin: session.isAdmin,
      }}
      scope={{
        accountLabel: scope.value.accountId || '—',
        projectLabel:
          scope.projects.find((project) => project.id === scope.value.projectId)?.label ??
          'All projects',
      }}
      keys={rows}
      loading={list.query.isLoading}
      loadingRowCount={8}
      error={errorMessage}
      onRetry={refresh}
      statusSummary={apiKeysStatusSummary(keys, now)}
      emptyMessage={
        scope.value.projectId
          ? 'No API keys in this project yet.'
          : 'No API keys yet. Pick a project to scope the list.'
      }
      secretReveal={secretReveal}
      onDismissSecret={() => setSecretReveal(null)}
      onCreateKey={() => {
        const projectId = scope.value.projectId;
        if (!projectId) {
          setActionError('Select a project before creating a key.');
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
          setSecretReveal({
            heading: 'New API key',
            description:
              'Copy it now — this is the only time the secret is shown. It cannot be retrieved again.',
            secret: created.secret,
          });
        });
      }}
      onRotate={(row: ApiKeyRow) => {
        void runProcedure(async () => {
          const rotated = await client.procedures.rotateApiKey({ args: { keyId: row.id } });
          setSecretReveal({
            heading: `Rotated ${row.name}`,
            description:
              'The previous secret is now invalid. Copy the new one — it is shown only once.',
            secret: rotated.secret,
          });
        });
      }}
      onDelete={(row: ApiKeyRow) => {
        deleteKey({ resource: 'apiKeys', id: row.id });
      }}
      onRequestRevoke={(row: ApiKeyRow) => setRevokeTarget({ row })}
      revokeTarget={revokeTarget}
      onConfirmRevoke={(row: ApiKeyRow) => {
        void (async () => {
          try {
            await client.procedures.revokeApiKey({ args: { keyId: row.id } });
            setRevokeTarget(null);
            refresh();
          } catch (error) {
            // The dialog stays open carrying the reason — that is its documented error contract.
            setRevokeTarget({
              row,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })();
      }}
      onCancelRevoke={() => setRevokeTarget(null)}
      selectedRowKeys={selectedRowKeys}
      onSelectRow={(row) => setSelectedRowKeys([row.id])}
      pagination={{
        shown: rows.length,
        total,
        hasPrev: page > 1,
        hasNext: page * PAGE_SIZE < total,
        onPrev: () => setPage((current) => Math.max(1, current - 1)),
        onNext: () => setPage((current) => current + 1),
      }}
      scopeSelect={{
        accounts: scope.accounts,
        projects: scope.projects,
        value: scope.value,
        onChange: (value) => {
          scope.setValue(value);
          setPage(1);
        },
      }}
      statusFilterOptions={STATUS_FILTER_OPTIONS}
      statusFilterValue={statusFilter}
      onStatusFilterChange={(value) => {
        setStatusFilter(value);
        setPage(1);
      }}
      search={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      hygiene={apiKeysHygiene(keys, now)}
    />
  );
}
