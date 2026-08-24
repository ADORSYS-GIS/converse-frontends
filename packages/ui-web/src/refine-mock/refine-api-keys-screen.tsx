// Refine-driven container for `ApiKeysPage` — `useTable` over the `api-keys` resource plus a
// scope filter; revoke goes through `useUpdate` (status flip) on confirm, delete through
// `useDelete`, create through `useCreate`. `ApiKeysPage` stays pure — this container only
// translates hook state into its props (console-ui skill "Refine-driven mock screens").

import React, { useMemo, useState } from 'react';
import type { CrudFilter } from '@refinedev/core';
import { useCreate, useDelete, useTable, useUpdate } from '@refinedev/core';

import {
  apiKeysAdminNavItems,
  apiKeysHygiene,
  apiKeysNavItems,
  apiKeysScope,
  apiKeysScopeAccounts,
  apiKeysScopeProjects,
  apiKeysStatusFilterOptions,
} from '../pages/api-keys/fixtures';
import { ApiKeysPage } from '../pages/api-keys';
import type { ApiKeyRow, ApiKeysRevokeTarget, ApiKeysSecretReveal } from '../pages/api-keys/types';
import type { ScopeSelectValue } from '../components/scope-select';
import { refineMockHeader } from './shared-chrome';

const nav = { items: apiKeysNavItems, adminItems: apiKeysAdminNavItems, showAdmin: false };

function randomSecret(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = 'sk-lb-';
  for (let i = 0; i < 32; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function summarize(rows: ApiKeyRow[]): string {
  const active = rows.filter((row) => row.status === 'active').length;
  const revoked = rows.filter((row) => row.status === 'revoked').length;
  const expiring = rows.filter((row) => row.status === 'expiring').length;
  return `${active} active · ${revoked} revoked${expiring > 0 ? ` · ${expiring} expiring soon` : ''}`;
}

export function RefineApiKeysScreen() {
  const [search, setSearch] = useState('');
  const [statusFilterValue, setStatusFilterValue] = useState('all');
  const [scopeValue, setScopeValue] = useState<ScopeSelectValue>({ accountId: 'adorsys-gis', projectId: 'gateway-prod' });
  const [secretReveal, setSecretReveal] = useState<ApiKeysSecretReveal | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeysRevokeTarget | null>(null);

  const filters = useMemo<CrudFilter[]>(() => {
    const next: CrudFilter[] = [];
    if (search.trim()) next.push({ field: 'name', operator: 'contains', value: search.trim() });
    if (statusFilterValue !== 'all') next.push({ field: 'status', operator: 'eq', value: statusFilterValue });
    return next;
  }, [search, statusFilterValue]);

  const table = useTable<ApiKeyRow>({ resource: 'api-keys', pagination: { currentPage: 1, pageSize: 11 } });

  React.useEffect(() => {
    table.setFilters(filters, 'replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const updateMutation = useUpdate<ApiKeyRow>();
  const deleteMutation = useDelete<ApiKeyRow>();
  const createMutation = useCreate<ApiKeyRow>();

  const rows = table.result.data;
  const loading = table.tableQuery.isLoading;
  const error = table.tableQuery.isError ? table.tableQuery.error?.message : undefined;

  function refetchList() {
    table.tableQuery.refetch();
  }

  return (
    <ApiKeysPage
      header={refineMockHeader}
      nav={nav}
      scope={apiKeysScope}
      keys={rows}
      loading={loading}
      error={error}
      onRetry={refetchList}
      statusSummary={summarize(rows)}
      secretReveal={secretReveal}
      onDismissSecret={() => setSecretReveal(null)}
      onRotate={(row) => {
        const secret = randomSecret();
        updateMutation.mutate(
          {
            resource: 'api-keys',
            id: row.id,
            values: { prefix: `lb_live_${secret.slice(6, 10)}…`, created: new Date().toISOString().slice(0, 10) },
          },
          {
            onSuccess: () => {
              refetchList();
              setSecretReveal({
                heading: 'Key rotated — shown once',
                description: 'Copy it now. Lightbridge stores only the prefix; this value can never be retrieved again.',
                secret,
              });
            },
          },
        );
      }}
      onDelete={(row) => {
        deleteMutation.mutate({ resource: 'api-keys', id: row.id }, { onSuccess: refetchList });
      }}
      onRequestRevoke={(row) => setRevokeTarget({ row })}
      revokeTarget={revokeTarget}
      onConfirmRevoke={(row) => {
        updateMutation.mutate(
          { resource: 'api-keys', id: row.id, values: { status: 'revoked', statusLabel: 'revoked' } },
          {
            onSuccess: () => {
              refetchList();
              setRevokeTarget(null);
            },
            onError: (mutationError) => setRevokeTarget({ row, error: mutationError.message }),
          },
        );
      }}
      onCancelRevoke={() => setRevokeTarget(null)}
      onCreateKey={() => {
        const secret = randomSecret();
        createMutation.mutate(
          {
            resource: 'api-keys',
            values: {
              name: `key-${Date.now().toString(36)}`,
              prefix: `lb_live_${secret.slice(6, 10)}…`,
              status: 'active',
              statusLabel: 'active',
              created: new Date().toISOString().slice(0, 10),
              lastUsed: 'never used',
              expires: 'no expiry',
            },
          },
          {
            onSuccess: () => {
              refetchList();
              setSecretReveal({
                heading: 'New key created — shown once',
                description: 'Copy it now. Lightbridge stores only the prefix; this value can never be retrieved again.',
                secret,
              });
            },
          },
        );
      }}
      pagination={{
        shown: rows.length,
        total: table.result.total ?? rows.length,
        hasPrev: table.currentPage > 1,
        hasNext: table.currentPage < table.pageCount,
        onPrev: () => table.setCurrentPage((page) => Math.max(1, page - 1)),
        onNext: () => table.setCurrentPage((page) => Math.min(table.pageCount, page + 1)),
      }}
      scopeSelect={{
        accounts: apiKeysScopeAccounts,
        projects: apiKeysScopeProjects,
        value: scopeValue,
        onChange: setScopeValue,
      }}
      statusFilterOptions={apiKeysStatusFilterOptions}
      statusFilterValue={statusFilterValue}
      onStatusFilterChange={setStatusFilterValue}
      search={search}
      onSearchChange={setSearch}
      hygiene={apiKeysHygiene}
    />
  );
}
