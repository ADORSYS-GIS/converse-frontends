// Page-level acceptance story for API KEYS — sections composed inside `ConsoleShell` with the
// section fixtures.
//
// **This screen has no right rail at any tier** (owner review 2026-08-29). It was the clearest
// case for the change: the rail carried FILTERS, KEY HYGIENE, LIFECYCLE, a scope echo and the
// `New key` CTA — measurably taller than the table it parameterised, which in production held a
// single row. All of it is now one `ApiKeysControls` above the ledger, plus inline hygiene notes.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { CreateApiKeyDialog } from '../components/create-api-key-dialog';
import { EmptyState } from '../components/empty-state';
import { ApiKeysHygieneNotes } from '../sections/api-keys-hygiene-notes';
import { apiKeysHygiene } from '../sections/api-keys-hygiene-notes/fixtures';
import { ApiKeysLedger } from '../sections/api-keys-ledger';
import { apiKeysFixture, apiKeysNewSecret } from '../sections/api-keys-ledger/fixtures';
import type {
  ApiKeyRow,
  ApiKeysDeleteTarget,
  ApiKeysRevokeTarget,
} from '../sections/api-keys-ledger';
import type { CreateApiKeyResult } from '../components/create-api-key-dialog';
import { ApiKeysControls } from '../sections/api-keys-controls';
import {
  API_KEY_PROJECT_OPTIONS,
  API_KEY_STATUS_OPTIONS,
} from '../sections/api-keys-controls/fixtures';
import { PageHeader } from '../sections/page-header';
import { storySidebar, storyTopBar } from './shell-fixtures';

interface ApiKeysScreenProps {
  keys?: ApiKeyRow[];
  /** Opens `CreateApiKeyDialog` straight to its secret step (Addition D, 2026-08-30) — the "just
   *  created a key" state, in the SAME modal instance the form would have been, never a separate
   *  floor-level card. */
  initialResult?: CreateApiKeyResult | null;
  revokeInitial?: ApiKeysRevokeTarget | null;
  deleteInitial?: ApiKeysDeleteTarget | null;
  loading?: boolean;
  error?: string;
  showAdmin?: boolean;
  /** Start scoped to "All projects" — the toolbar's own default. `+ New key` stays enabled here
   *  (live findings #4, 2026-08-30): a key belongs to exactly one project, but which one is
   *  `CreateApiKeyDialog`'s own question now, never the ledger's filter. */
  allProjectsScoped?: boolean;
  /** The account has no project at all — the ONLY state that disables `+ New key` itself. */
  zeroProjects?: boolean;
}

const PROJECT_CHOICES = API_KEY_PROJECT_OPTIONS.filter((option) => option.value !== 'all');

// The composition `apps/console`'s `(console)` layout + the `/accounts/[accountId]/api-keys` route perform for real.
//
// `showAdmin` doubles as the ledger's `isAdmin` (ticket #321): the same `lightbridge-admin` grant
// that reveals the NavSpine's Admin group is what the console-side container reads to decide
// whether `Del` renders at all, so one story flag drives both consistently.
function ApiKeysScreen({
  keys = apiKeysFixture,
  initialResult = null,
  revokeInitial = null,
  deleteInitial = null,
  loading = false,
  error,
  showAdmin = false,
  allProjectsScoped = false,
  zeroProjects = false,
}: ApiKeysScreenProps) {
  const [createOpen, setCreateOpen] = useState(initialResult !== null);
  const [result, setResult] = useState<CreateApiKeyResult | null>(initialResult);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeysRevokeTarget | null>(revokeInitial);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeysDeleteTarget | null>(deleteInitial);
  const [project, setProject] = useState(allProjectsScoped ? 'all' : 'gateway-prod');
  const [statusFilterValue, setStatusFilterValue] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [name, setName] = useState('');

  // `+ New key` is disabled ONLY when the account has no project to put a key in — never merely
  // because the toolbar's own filter happens to be scoped to "All projects" (live findings #4).
  const canCreate = !zeroProjects && PROJECT_CHOICES.length > 0;
  const openCreateDialog = () => {
    if (!canCreate) return;
    setDraftProjectId(project !== 'all' ? project : (PROJECT_CHOICES[0]?.value ?? null));
    setResult(null);
    setCreateOpen(true);
  };

  const hygiene = useMemo(() => (keys.length > 0 ? apiKeysHygiene : undefined), [keys.length]);

  return (
    <ConsoleShell sidebar={storySidebar('api-keys', { isAdmin: showAdmin })} topBar={storyTopBar()}>
      {/* No aside column here either — this screen has no rail content at any tier (owner review
          2026-08-29). Scope is the sidebar's (account) and the toolbar's (project); there is
          nothing left for a rail to hold. Filters live in `PageHeader.controls`; `+ New key` is
          `PageHeader.action`, the emphasised, right-most control on the title row (shell brief
          2026-08-30). */}
      <div className="flex flex-col gap-6">
        {/* "API keys", not "Api-Keys" — the old title was the route slug run through a title-caser,
            which disagreed with the nav item sitting right beside it. */}
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
            <Button
              type="button"
              variant="primary"
              disabled={!canCreate}
              title={canCreate ? undefined : 'Create a project before creating a key.'}
              onClick={openCreateDialog}>
              + New key
            </Button>
          }
        />

        {hygiene ? <ApiKeysHygieneNotes hygiene={hygiene} /> : null}

        <CreateApiKeyDialog
          open={createOpen}
          projectOptions={PROJECT_CHOICES}
          projectId={draftProjectId}
          onProjectChange={setDraftProjectId}
          name={name}
          onNameChange={setName}
          expiryDays="30"
          expiryOptions={[
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '89', label: '89 days' },
          ]}
          onExpiryDaysChange={() => {}}
          plans={[{ id: 'pro', name: 'Pro' }]}
          plansLoading={false}
          onRetryPlans={() => {}}
          planId="pro"
          onPlanChange={() => {}}
          submitting={false}
          canSubmit={name.trim().length > 0 && draftProjectId !== null}
          onSubmit={() => {
            // Addition D: the SAME modal instance switches to its secret step, rather than
            // closing and handing the result to a separate floor-level card.
            setResult(apiKeysNewSecret);
          }}
          onCancel={() => {
            setCreateOpen(false);
            setName('');
          }}
          result={result}
          onDone={() => {
            setResult(null);
            setCreateOpen(false);
            setName('');
          }}
        />

        <Card>
          <ApiKeysLedger
            keys={keys}
            loading={loading}
            error={error}
            onRetry={() => {}}
            emptyState={
              <EmptyState
                headline="No API keys in this project"
                explainer="Keys authenticate requests to the Lightbridge API. Each belongs to exactly one project."
                action={
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!canCreate}
                    title={canCreate ? undefined : 'Create a project before creating a key.'}
                    onClick={openCreateDialog}>
                    + New key
                  </Button>
                }
              />
            }
            onRotate={() => {}}
            onRequestRevoke={(row) => setRevokeTarget({ row })}
            revokeTarget={revokeTarget}
            onConfirmRevoke={() => setRevokeTarget(null)}
            onCancelRevoke={() => setRevokeTarget(null)}
            isAdmin={showAdmin}
            onRequestDelete={(row) => setDeleteTarget({ row })}
            deleteTarget={deleteTarget}
            onConfirmDelete={() => setDeleteTarget(null)}
            onCancelDelete={() => setDeleteTarget(null)}
            selectedRowKeys={selectedRowKeys}
            onSelectRow={(row) => setSelectedRowKeys([row.id])}
            pagination={{ shown: keys.length, total: 27, hasPrev: false, hasNext: true }}
          />
        </Card>
      </div>
    </ConsoleShell>
  );
}

const meta: Meta<typeof ApiKeysScreen> = {
  title: 'Pages/ApiKeys',
  component: ApiKeysScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ApiKeysScreen>;

// `lg` (≥1024, the default story viewport). Full page, populated — 11-row ledger, inline hygiene
// notes, `CreateApiKeyDialog` open on its own secret step (Addition D, 2026-08-30 — the "just
// created a key" state, in place, never a separate floor-level card).
export const Populated: Story = {
  render: () => <ApiKeysScreen initialResult={apiKeysNewSecret} />,
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Populated`.
export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <ApiKeysScreen initialResult={apiKeysNewSecret} />,
  globals: { theme: 'wireframe' },
};

// Same data with the dialog closed — the steady state once a secret step ends with Done.
export const WithoutSecretStrip: Story = { render: () => <ApiKeysScreen /> };

/**
 * Scoped to "All projects" — the state the console lands in by default, so it is a first-class
 * story, not an edge case. `+ New key` stays ENABLED here (live findings #4, 2026-08-30 — this
 * used to disable the button outright with no way to proceed): the dialog it opens asks which
 * project to target, so browsing the ledger unscoped never blocks creating a key.
 */
export const AllProjectsScoped: Story = {
  render: () => <ApiKeysScreen allProjectsScoped />,
};

/**
 * The one real disable condition left (live findings #4): the account has no project at all, so
 * there is nowhere for a new key to belong. The toolbar and the trigger both say so in words
 * rather than leaving a disabled button with no explanation.
 */
export const ZeroProjects: Story = {
  render: () => <ApiKeysScreen allProjectsScoped zeroProjects keys={[]} />,
};

// Revoke gating flow mid-state: TypedConfirmDialog open, typed value not yet matching the name.
export const RevokeDialogOpen: Story = {
  render: () => <ApiKeysScreen revokeInitial={{ row: apiKeysFixture[0] }} />,
};

// Ticket #321 — Del is admin-only and typed-confirm gated. The standing LIFECYCLE rail panel that
// used to state this is gone (owner review 2026-08-29); the dialog itself is where that
// explanation now lives, at the moment it is needed.
export const DeleteDialogOpen: Story = {
  render: () => <ApiKeysScreen showAdmin deleteInitial={{ row: apiKeysFixture[0] }} />,
};

export const DeleteDialogOpenLight: Story = {
  name: 'Delete dialog open — wireframe (light)',
  render: () => <ApiKeysScreen showAdmin deleteInitial={{ row: apiKeysFixture[0] }} />,
  globals: { theme: 'wireframe' },
};

// A signed-in non-admin: NavSpine's Admin group and the ledger's `Del` action are both absent —
// same grant, same story flag.
export const NonAdminView: Story = {
  name: 'Non-admin — Del omitted, Admin nav hidden',
  render: () => <ApiKeysScreen />,
};

// A true empty collection replaces the table with `EmptyState` outright.
export const Empty: Story = { render: () => <ApiKeysScreen keys={[]} /> };

export const Loading: Story = { render: () => <ApiKeysScreen keys={[]} loading /> };

export const ErrorState: Story = {
  render: () => <ApiKeysScreen keys={[]} error="Failed to load keys for this project." />,
};

export const AdminNav: Story = {
  name: 'Nav — admin (Admin group visible)',
  render: () => <ApiKeysScreen showAdmin />,
};

// `md` tier (600–1024): left rail persists inline; the toolbar wraps. No sheet, no trigger — the
// reason this tier no longer needs a sheet-open story of its own.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <ApiKeysScreen initialResult={apiKeysNewSecret} />,
};

// Base tier (<600): single column, nav docked as a fixed bottom navigation bar, the key ledger
// scrolls horizontally inside its own container (the page never scrolls sideways).
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <ApiKeysScreen initialResult={apiKeysNewSecret} />,
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `MobileBaseTier`.
export const MobileBaseTierLight: Story = {
  name: 'Mobile Base Tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <ApiKeysScreen initialResult={apiKeysNewSecret} />,
};
