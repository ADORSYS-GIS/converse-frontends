// Refine-driven container for the API KEYS screen — `useTable` over the `api-keys` resource;
// revoke goes through `useUpdate` (status flip) on confirm, delete through `useDelete`, create
// through `useCreate`. The sections stay pure — this container only translates hook state into
// their props (console-ui skill "Refine-driven mock screens").

import React, { useMemo, useState } from 'react';
import type { CrudFilter } from '@refinedev/core';
import { useCreate, useDelete, useTable, useUpdate } from '@refinedev/core';

import { Button } from '../components/button';
import { ApiKeysHygieneNotes } from '../sections/api-keys-hygiene-notes';
import { apiKeysHygiene } from '../sections/api-keys-hygiene-notes/fixtures';
import { ApiKeysLedger } from '../sections/api-keys-ledger';
import type {
  ApiKeyRow,
  ApiKeysDeleteTarget,
  ApiKeysRevokeTarget,
  ApiKeysSecretReveal,
} from '../sections/api-keys-ledger';
import { ApiKeysToolbar } from '../sections/api-keys-toolbar';
import {
  API_KEY_PROJECT_OPTIONS,
  API_KEY_STATUS_OPTIONS,
} from '../sections/api-keys-toolbar/fixtures';
import { ScreenHeading } from '../sections/screen-heading';
import { RefineMockShell } from './shared-chrome';

function randomSecret(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = 'sk-lb-';
  for (let i = 0; i < 32; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// Counts only — the expiring key is `ApiKeysHygieneNotes`' line. Reporting it here too printed
// the same fact twice on one screen (owner screenshot 2026-08-29).
function summarize(rows: ApiKeyRow[]): string {
  const active = rows.filter((row) => row.status === 'active').length;
  const revoked = rows.filter((row) => row.status === 'revoked').length;
  return `${active} active · ${revoked} revoked`;
}

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
        <ScreenHeading title="API keys" />

        <ApiKeysToolbar
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
          onCreate={project === 'all' ? undefined : createKey}
          createDisabledReason={
            project === 'all' ? 'Select a project to create a key.' : undefined
          }
        />

        {rows.length > 0 ? <ApiKeysHygieneNotes hygiene={apiKeysHygiene} /> : null}

        {/* Demo-only affordance for the ticket #321 admin gate; `apps/console` has no equivalent —
            it reads the real session instead. Was a button inside the deleted LIFECYCLE rail
            panel (owner review 2026-08-29). */}
        <Button type="button" variant="secondary" onClick={() => setIsAdmin((value) => !value)}>
          {isAdmin ? 'Demo: acting as admin' : 'Demo: acting as non-admin'}
        </Button>

        <ApiKeysLedger
          keys={rows}
          loading={loading}
          error={error}
          onRetry={refetchList}
          statusSummary={summarize(rows)}
          emptyMessage="No keys in this project yet. Create one from the toolbar above."
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
                onError: (mutationError) => setDeleteTarget({ row, error: mutationError.message }),
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
      </div>
    </RefineMockShell>
  );
}
