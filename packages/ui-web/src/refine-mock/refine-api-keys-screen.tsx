// Refine-driven container for the API KEYS screen — `useTable` over the `api-keys` resource;
// revoke goes through `useUpdate` (status flip) on confirm, delete through `useDelete`, create
// through `useCreate`. The sections stay pure — this container only translates hook state into
// their props (console-ui skill "Refine-driven mock screens").

import React, { useMemo, useState } from 'react';
import type { CrudFilter } from '@refinedev/core';
import { useCreate, useDelete, useTable, useUpdate } from '@refinedev/core';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { EmptyState } from '../components/empty-state';
import { SecretReveal } from '../components/secret-reveal';
import type { LedgerSort } from '../components/ledger-table';
import { ApiKeysHygieneNotes } from '../sections/api-keys-hygiene-notes';
import { apiKeysHygiene } from '../sections/api-keys-hygiene-notes/fixtures';
import { ApiKeysLedger } from '../sections/api-keys-ledger';
import type {
  ApiKeyRow,
  ApiKeysDeleteTarget,
  ApiKeysRevokeTarget,
  ApiKeysSecretReveal,
} from '../sections/api-keys-ledger';
import { ApiKeysControls } from '../sections/api-keys-controls';
import {
  API_KEY_PROJECT_OPTIONS,
  API_KEY_STATUS_OPTIONS,
} from '../sections/api-keys-controls/fixtures';
import { PageHeader } from '../sections/page-header';
import { RefineMockShell } from './shared-chrome';

function randomSecret(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = 'sk-lb-';
  for (let i = 0; i < 32; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// No more `summarize`/`statusSummary` (2026-08-30 revamp brief) — it duplicated
// `ApiKeysHygieneNotes`'s own line, which stays the ONE status line for this ledger.

const ROTATED_SECRET_COPY =
  'Copy it now. Lightbridge stores only the prefix; this value can never be retrieved again.';

export function RefineApiKeysScreen() {
  const [search, setSearch] = useState('');
  const [statusFilterValue, setStatusFilterValue] = useState('all');
  // Project is a toolbar parameter now, not a rail `ScopeSelect` — account is identity and lives
  // in the header (owner review 2026-08-29).
  const [project, setProject] = useState('gateway-prod');
  const [secretReveal, setSecretReveal] = useState<ApiKeysSecretReveal | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeysRevokeTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeysDeleteTarget | null>(null);
  // Demo-only toggle for the admin gate (ticket #321) — `apps/console` reads this from the real
  // session (`useConsoleSession().isAdmin`) instead.
  const [isAdmin, setIsAdmin] = useState(true);

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
  const activeSort = table.sorters[0];
  const sort: LedgerSort | undefined = activeSort
    ? { key: activeSort.field, direction: activeSort.order }
    : undefined;

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

  return (
    // No rails on this screen at any tier (owner review 2026-08-29) — filters, hygiene and the
    // create action are the toolbar's and the ledger's now.
    <RefineMockShell active="api-keys">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="API keys"
          controls={
            <ApiKeysControls
              projectField={{
                label: 'Project',
                value: project,
                options: API_KEY_PROJECT_OPTIONS,
                onChange: setProject,
              }}
              statusOptions={API_KEY_STATUS_OPTIONS}
              statusValue={statusFilterValue}
              onStatusChange={setStatusFilterValue}
              search={search}
              onSearchChange={setSearch}
            />
          }
          action={
            // `+ New key` stays enabled at "All projects" (live findings #4, 2026-08-30): a key
            // belongs to exactly one project, but which one is the real dialog's own question
            // (`CreateApiKeyDialog`'s Project field) — this mock's simplified `createKey()` has
            // no such picker, so it targets whichever project the toolbar itself is scoped to,
            // defaulting to the first real project rather than the "All projects" sentinel.
            <Button type="button" variant="primary" onClick={createKey}>
              + New key
            </Button>
          }
        />

        {rows.length > 0 ? <ApiKeysHygieneNotes hygiene={apiKeysHygiene} /> : null}

        {/* Demo-only affordance for the ticket #321 admin gate; `apps/console` has no equivalent —
            it reads the real session instead. Was a button inside the deleted LIFECYCLE rail
            panel (owner review 2026-08-29). */}
        <Button type="button" variant="secondary" onClick={() => setIsAdmin((value) => !value)}>
          {isAdmin ? 'Demo: acting as admin' : 'Demo: acting as non-admin'}
        </Button>

        {/* Addition D (2026-08-30) — CREATE's own secret would show inside a real
            `CreateApiKeyDialog`'s own secret step in `apps/console`; this mock's simplified
            `createKey()` (below) has no dialog to fold it into, so it stays a floor-level
            `SecretReveal` — but, matching the real fix, as a sibling ABOVE the `Card`, never
            nested inside `ApiKeysLedger`'s own tree (the "card inside a card" this addition
            exists to stop). */}
        {secretReveal ? (
          <SecretReveal
            heading={secretReveal.heading}
            description={secretReveal.description}
            secret={secretReveal.secret}
            onDismiss={() => setSecretReveal(null)}
          />
        ) : null}

        <Card>
          <ApiKeysLedger
            keys={rows}
            loading={loading}
            error={error}
            onRetry={refetchList}
            emptyState={
              <EmptyState
                headline="No API keys in this project"
                explainer="Keys authenticate requests to the Lightbridge API. Each belongs to exactly one project."
                action={
                  <Button type="button" variant="primary" onClick={createKey}>
                    + New key
                  </Button>
                }
              />
            }
            sort={sort}
            onSortChange={(next) => table.setSorters([{ field: next.key, order: next.direction }])}
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
                  onError: (mutationError) =>
                    setRevokeTarget({ row, error: mutationError.message }),
                }
              );
            }}
            onCancelRevoke={() => setRevokeTarget(null)}
            isAdmin={isAdmin}
            onRequestDelete={(row) => setDeleteTarget({ row })}
            deleteTarget={deleteTarget}
            onConfirmDelete={(row) => {
              deleteMutation.mutate(
                { resource: 'api-keys', id: row.id },
                {
                  onSuccess: () => {
                    refetchList();
                    setDeleteTarget(null);
                  },
                  onError: (mutationError) =>
                    setDeleteTarget({ row, error: mutationError.message }),
                }
              );
            }}
            onCancelDelete={() => setDeleteTarget(null)}
            pagination={{
              shown: rows.length,
              total: table.result.total ?? rows.length,
              hasPrev: table.currentPage > 1,
              hasNext: table.currentPage < table.pageCount,
              onPrev: () => table.setCurrentPage((page) => Math.max(1, page - 1)),
              onNext: () => table.setCurrentPage((page) => Math.min(table.pageCount, page + 1)),
            }}
          />
        </Card>
      </div>
    </RefineMockShell>
  );
}
