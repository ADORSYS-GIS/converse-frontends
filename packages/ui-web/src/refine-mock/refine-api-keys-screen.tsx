// Refine-driven container for the API KEYS screen — `useTable` over the `api-keys` resource;
// revoke goes through `useUpdate` (status flip) on confirm, delete through `useDelete`, create
// through `useCreate`. The sections stay pure — this container only translates hook state into
// their props (console-ui skill "Refine-driven mock screens").

import React, { useMemo, useState } from 'react';
import type { CrudFilter } from '@refinedev/core';
import { useCreate, useDelete, useTable, useUpdate } from '@refinedev/core';

import { Button } from '../components/button';
import { RailPanel } from '../components/rail-panel';
import { ScopeSelect } from '../components/scope-select';
import type { ScopeSelectValue } from '../components/scope-select';
import { SectionSheetTrigger } from '../components/section-sheet-trigger';
import { API_KEYS_FILTERS_RAIL_LABEL, ApiKeysFiltersRail } from '../sections/api-keys-filters-rail';
import { apiKeysStatusFilterOptions } from '../sections/api-keys-filters-rail/fixtures';
import { API_KEYS_HYGIENE_RAIL_LABEL, ApiKeysHygieneRail } from '../sections/api-keys-hygiene-rail';
import { apiKeysHygiene } from '../sections/api-keys-hygiene-rail/fixtures';
import {
  API_KEYS_LIFECYCLE_RAIL_LABEL,
  ApiKeysLifecycleRail,
} from '../sections/api-keys-lifecycle-rail';
import { ApiKeysLedger } from '../sections/api-keys-ledger';
import type {
  ApiKeyRow,
  ApiKeysRevokeTarget,
  ApiKeysSecretReveal,
} from '../sections/api-keys-ledger';
import { SCOPE_RAIL_LABEL, ScopeRail } from '../sections/scope-rail';
import {
  scopeAccounts,
  scopeProjects,
  scopeRailFixture,
} from '../sections/scope-rail/fixtures';
import { ScreenHeading } from '../sections/screen-heading';
import { RefineMockShell } from './shared-chrome';

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

const ROTATED_SECRET_COPY =
  'Copy it now. Lightbridge stores only the prefix; this value can never be retrieved again.';

export function RefineApiKeysScreen() {
  const [search, setSearch] = useState('');
  const [statusFilterValue, setStatusFilterValue] = useState('all');
  const [scopeValue, setScopeValue] = useState<ScopeSelectValue>({
    accountId: 'adorsys-gis',
    projectId: 'gateway-prod',
  });
  const [secretReveal, setSecretReveal] = useState<ApiKeysSecretReveal | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeysRevokeTarget | null>(null);

  const filters = useMemo<CrudFilter[]>(() => {
    const next: CrudFilter[] = [];
    if (search.trim()) next.push({ field: 'name', operator: 'contains', value: search.trim() });
    if (statusFilterValue !== 'all')
      next.push({ field: 'status', operator: 'eq', value: statusFilterValue });
    return next;
  }, [search, statusFilterValue]);

  const table = useTable<ApiKeyRow>({
    resource: 'api-keys',
    pagination: { currentPage: 1, pageSize: 11 },
  });

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

  function createKey() {
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
            description: ROTATED_SECRET_COPY,
            secret,
          });
        },
      }
    );
  }

  const scopeSelect = (
    <ScopeSelect
      accounts={scopeAccounts}
      projects={scopeProjects}
      value={scopeValue}
      onChange={setScopeValue}
    />
  );

  const filtersRail = (
    <ApiKeysFiltersRail
      statusOptions={apiKeysStatusFilterOptions}
      statusValue={statusFilterValue}
      onStatusChange={setStatusFilterValue}
      search={search}
      onSearchChange={setSearch}
    />
  );

  return (
    <RefineMockShell
      active="api-keys"
      leftSecondary={
        <RailPanel label={SCOPE_RAIL_LABEL}>
          <ScopeRail {...scopeRailFixture} />
        </RailPanel>
      }
      leftSecondaryLabel="Scope"
      rail={
        <>
          <RailPanel>
            <Button type="button" variant="primary" className="w-full" onClick={createKey}>
              + New key
            </Button>
          </RailPanel>
          <RailPanel label={SCOPE_RAIL_LABEL}>{scopeSelect}</RailPanel>
          <RailPanel label={API_KEYS_FILTERS_RAIL_LABEL}>{filtersRail}</RailPanel>
          <RailPanel label={API_KEYS_HYGIENE_RAIL_LABEL}>
            <ApiKeysHygieneRail hygiene={apiKeysHygiene} />
          </RailPanel>
          <RailPanel label={API_KEYS_LIFECYCLE_RAIL_LABEL}>
            <ApiKeysLifecycleRail />
          </RailPanel>
        </>
      }>
      <div className="flex flex-col gap-6">
        <ScreenHeading
          title="Api-Keys"
          subline={`${scopeRailFixture.accountLabel} / ${scopeRailFixture.projectLabel}`}
          sublineActions={
            <SectionSheetTrigger icon="scope" triggerLabel="Open scope" label={SCOPE_RAIL_LABEL}>
              {scopeSelect}
            </SectionSheetTrigger>
          }
          actions={
            <Button type="button" variant="primary" onClick={createKey} className="lg:hidden">
              + New key
            </Button>
          }
        />

        <ApiKeysLedger
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
                values: {
                  prefix: `lb_live_${secret.slice(6, 10)}…`,
                  created: new Date().toISOString().slice(0, 10),
                },
              },
              {
                onSuccess: () => {
                  refetchList();
                  setSecretReveal({
                    heading: 'Key rotated — shown once',
                    description: ROTATED_SECRET_COPY,
                    secret,
                  });
                },
              }
            );
          }}
          onDelete={(row) => {
            deleteMutation.mutate({ resource: 'api-keys', id: row.id }, { onSuccess: refetchList });
          }}
          onRequestRevoke={(row) => setRevokeTarget({ row })}
          revokeTarget={revokeTarget}
          onConfirmRevoke={(row) => {
            updateMutation.mutate(
              {
                resource: 'api-keys',
                id: row.id,
                values: { status: 'revoked', statusLabel: 'revoked' },
              },
              {
                onSuccess: () => {
                  refetchList();
                  setRevokeTarget(null);
                },
                onError: (mutationError) => setRevokeTarget({ row, error: mutationError.message }),
              }
            );
          }}
          onCancelRevoke={() => setRevokeTarget(null)}
          pagination={{
            shown: rows.length,
            total: table.result.total ?? rows.length,
            hasPrev: table.currentPage > 1,
            hasNext: table.currentPage < table.pageCount,
            onPrev: () => table.setCurrentPage((page) => Math.max(1, page - 1)),
            onNext: () => table.setCurrentPage((page) => Math.min(table.pageCount, page + 1)),
          }}
          toolbarActions={
            <SectionSheetTrigger
              icon="filter"
              triggerLabel="Open filters"
              label={API_KEYS_FILTERS_RAIL_LABEL}>
              {filtersRail}
            </SectionSheetTrigger>
          }
        />
      </div>
    </RefineMockShell>
  );
}
