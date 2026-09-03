// Page-level acceptance story for `/admin/sessions` (converse-frontends#450, story C7) — the
// sections composed inside `ConsoleShell` exactly as `apps/console`'s
// `containers/admin-sessions-centre.tsx` composes them for real: `PageHeader` (title + the filter
// cluster in `controls`) over a `Card` holding the ledger and its pager, with row detail in a
// `BottomSheet` at EVERY tier (`/admin/*` mounts no rail at any tier — ADR 0013 D2/phase E).
//
// `apps/console` cannot be exercised without a signed-in, admin session, so this is where the
// screen is reviewed and screenshotted.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BottomSheet } from '../components/bottom-sheet';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { PageHeader } from '../sections/page-header';
import {
  SessionLedger,
  SessionDetailPanel,
  SessionLedgerControls,
} from '../sections/session-ledger';
import type {
  SessionDetail,
  SessionKindFilter,
  SessionLedgerRow,
  SessionStatusFilter,
} from '../sections/session-ledger';
import { sessionDetailFixture, sessionRowsFixture } from '../sections/session-ledger/fixtures';
import { storySidebar, storyTopBar } from './shell-fixtures';

/** The detail the sheet shows for a picked row — the container joins the row it already has with
 *  the ids `querySessions` returned for it, which is what this fixture stands in for. */
function detailFor(row: SessionLedgerRow, page: SessionLedgerRow[]): SessionDetail {
  return {
    ...row,
    subject: sessionDetailFixture.subject,
    accountId: sessionDetailFixture.accountId,
    projectId: sessionDetailFixture.projectId,
    userAgent: sessionDetailFixture.userAgent,
    subjectSessionsOnPage: page.filter((other) => other.account === row.account).length,
    confirmLabel: sessionDetailFixture.confirmLabel,
  };
}

function AdminSessionsScreen({
  sessions = sessionRowsFixture,
  initialStatus = 'all',
  initialSelectedId = null,
  status,
  loading = false,
  error,
}: {
  sessions?: SessionLedgerRow[];
  initialStatus?: SessionStatusFilter;
  initialSelectedId?: string | null;
  status?: string;
  loading?: boolean;
  error?: string;
}) {
  const [statusFilter, setStatusFilter] = useState<SessionStatusFilter>(initialStatus);
  const [kind, setKind] = useState<SessionKindFilter>('all');
  const [search, setSearch] = useState('');
  const [user, setUser] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeAllOpen, setCloseAllOpen] = useState(false);

  const visible = sessions.filter((row) => {
    if (kind !== 'all' && row.kind !== kind) return false;
    if (statusFilter === 'active') return row.status === 'active';
    if (statusFilter === 'inactive') return row.status !== 'active';
    return true;
  });

  const selected = visible.find((row) => row.id === selectedId) ?? null;

  return (
    <ConsoleShell
      sidebar={storySidebar('admin', { showAdmin: true })}
      topBar={storyTopBar()}
      railWidth={280}
      onRailWidthChange={() => {}}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Sessions"
          subtitle={`${visible.length} session${visible.length === 1 ? '' : 's'} on this page`}
          controls={
            <SessionLedgerControls
              status={statusFilter}
              onStatusChange={setStatusFilter}
              kind={kind}
              onKindChange={setKind}
              search={search}
              onSearchChange={setSearch}
              userOptions={
                search.length >= 2
                  ? [{ value: 'acc_5f2b81c07d3e', label: 'Maria Okonkwo · maria@brightline.dev' }]
                  : []
              }
              selectedUser={user}
              onSelectedUserChange={setUser}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          }
        />

        <Card>
          <SessionLedger
            sessions={visible}
            loading={loading}
            error={error}
            onRetry={() => {}}
            status={status}
            emptyMessage="No sessions match these filters."
            onResetFilters={() => {
              setStatusFilter('active');
              setKind('all');
              setSearch('');
              setUser('');
            }}
            selectedSessionId={selectedId}
            onSelectSession={(row) => setSelectedId(row.id)}
            pagination={{
              shown: visible.length,
              // The page's real capacity: "Inactive" is two `querySessions` calls merged, so its
              // page holds up to twice the per-call `?limit=` — the container computes this, the
              // section only renders it.
              pageSize: statusFilter === 'inactive' ? pageSize * 2 : pageSize,
              hasPrev: false,
              hasNext: true,
              onPrev: () => {},
              onNext: () => {},
            }}
          />
        </Card>
      </div>

      {/* BottomSheet at every tier — never a side drawer (ADR 0013's locked layout contract, and
          this story's own AC). No `portalClassName` tier gate: there is no rail to hand off to. */}
      <BottomSheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        title="Session"
        subtitle={selected?.id}>
        {selected ? (
          <SessionDetailPanel
            key={selected.id}
            session={detailFor(selected, visible)}
            onRequestClose={() => setCloseOpen(true)}
            closeConfirmOpen={closeOpen}
            onConfirmClose={() => setCloseOpen(false)}
            onCancelClose={() => setCloseOpen(false)}
            onRequestCloseAll={() => setCloseAllOpen(true)}
            closeAllConfirmOpen={closeAllOpen}
            onConfirmCloseAll={() => setCloseAllOpen(false)}
            onCancelCloseAll={() => setCloseAllOpen(false)}
          />
        ) : null}
      </BottomSheet>
    </ConsoleShell>
  );
}

const meta: Meta<typeof AdminSessionsScreen> = {
  title: 'Pages/Admin/Sessions',
  component: AdminSessionsScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AdminSessionsScreen>;

/** The screenshot the PR's evidence uses: a full page of mixed statuses, offline markers and
 *  sentinel identities. */
export const Populated: Story = { render: () => <AdminSessionsScreen /> };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <AdminSessionsScreen />,
};

/** The default landing filter — live sessions only. */
export const ActiveFilter: Story = {
  name: 'Filter — Active',
  render: () => <AdminSessionsScreen initialStatus="active" />,
};

/** `Inactive` is revoked + expired: two `querySessions` calls merged, not one `all` filtered on
 *  the client (the container's own doc comment carries the reasoning). */
export const InactiveFilter: Story = {
  name: 'Filter — Inactive (revoked + expired)',
  render: () => <AdminSessionsScreen initialStatus="inactive" />,
};

/** Row detail open — the second screenshot in the PR's evidence. */
export const DetailSheetOpen: Story = {
  render: () => <AdminSessionsScreen initialSelectedId="ses_7a3e5b1f8c02" />,
};

export const DetailSheetOpenLight: Story = {
  name: 'Detail sheet open — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <AdminSessionsScreen initialSelectedId="ses_7a3e5b1f8c02" />,
};

export const DegradedIdentityResolution: Story = {
  name: 'Identity resolution failed (degraded, not blocking)',
  render: () => (
    <AdminSessionsScreen
      sessions={sessionRowsFixture.map((row, index) => ({
        ...row,
        user: { kind: 'unresolved', userId: `usr_k3m9x1qp0z7${index}` },
      }))}
      status="User names could not be resolved — showing the raw user id instead."
    />
  ),
};

export const Empty: Story = { render: () => <AdminSessionsScreen sessions={[]} /> };

export const Loading: Story = { render: () => <AdminSessionsScreen sessions={[]} loading /> };

export const ErrorState: Story = {
  render: () => <AdminSessionsScreen sessions={[]} error="Could not load sessions." />,
};

export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <AdminSessionsScreen />,
};
