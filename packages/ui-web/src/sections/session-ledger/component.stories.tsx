import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { BottomSheet } from '../../components/bottom-sheet';
import { Card } from '../../components/card';
import { SessionLedger } from './component';
import { SessionDetailPanel } from './detail-panel';
import { SessionLedgerControls } from './controls';
import type { SessionKindFilter, SessionStatusFilter } from './controls';
import {
  activeSessionRowsFixture,
  revokedSessionDetailFixture,
  sessionDetailFixture,
  sessionRowsFixture,
} from './fixtures';
import type { SessionDetail, SessionLedgerRow } from './types';

const meta: Meta<typeof SessionLedger> = {
  title: 'Sections/SessionLedger',
  component: SessionLedger,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SessionLedger>;

function Demo({
  sessions = sessionRowsFixture,
  loading = false,
  error,
  status,
  withPagination = false,
  emptyMessage = 'No sessions match these filters.',
}: {
  sessions?: SessionLedgerRow[];
  loading?: boolean;
  error?: string;
  status?: string;
  withPagination?: boolean;
  emptyMessage?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="p-6">
      <Card>
        <SessionLedger
          sessions={sessions}
          loading={loading}
          error={error}
          onRetry={() => {}}
          status={status}
          emptyMessage={emptyMessage}
          onResetFilters={() => {}}
          selectedSessionId={selected}
          onSelectSession={(row) => setSelected(row.id)}
          pagination={
            withPagination
              ? {
                  shown: sessions.length,
                  hasPrev: false,
                  hasNext: true,
                  onPrev: () => {},
                  onNext: () => {},
                }
              : undefined
          }
        />
      </Card>
    </div>
  );
}

// The default view an operator opens the screen on: `status: active`, live rows only.
export const ActiveOnly: Story = { render: () => <Demo sessions={activeSessionRowsFixture} /> };

// `All` — the same page with a revoked and an expired row in it, which is the one view where the
// three status words have to be told apart at a glance without a colour doing the telling.
export const MixedStatuses: Story = { render: () => <Demo withPagination /> };

export const Light: Story = {
  name: 'Mixed statuses — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <Demo withPagination />,
};

// The offline marker, isolated: two sessions for the same person, one a browser login and one a
// CLI login whose refresh chain carries `offline_access`.
export const OfflineSessions: Story = {
  name: 'Offline sessions (offline_access refresh chain)',
  render: () => <Demo sessions={sessionRowsFixture.slice(0, 2)} />,
};

// Degraded, not blocking: `resolveUserProfiles` failed, every id falls back to its raw form, and
// the ledger says so ABOVE a table that still lists — and can still close — every session.
export const DegradedIdentityResolution: Story = {
  name: 'Identity resolution failed (degraded, not blocking)',
  render: () => (
    <Demo
      sessions={sessionRowsFixture.map((row, index) => ({
        ...row,
        user: { kind: 'unresolved', userId: `usr_k3m9x1qp0z7${index}` },
      }))}
      status="User names could not be resolved — showing the raw user id instead."
    />
  ),
};

// An inline status line, never a centred placard: this table always has filters above it.
export const Empty: Story = { render: () => <Demo sessions={[]} /> };

// The search matched nobody — stated inline rather than silently showing an unfiltered list.
export const SearchMatchedNobody: Story = {
  name: 'User search matched nobody',
  render: () => (
    <Demo
      sessions={[]}
      status="No user matches “okonkwa” — showing no sessions rather than an unfiltered list."
      emptyMessage="No sessions match these filters."
    />
  ),
};

export const Loading: Story = { render: () => <Demo sessions={[]} loading /> };

export const ErrorState: Story = {
  render: () => <Demo sessions={[]} error="Could not load sessions." />,
};

export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Demo />,
};

// ── Filters ──────────────────────────────────────────────────────────────────────────────────

function ControlsDemo({ withMatches = false }: { withMatches?: boolean }) {
  const [status, setStatus] = useState<SessionStatusFilter>('active');
  const [kind, setKind] = useState<SessionKindFilter>('all');
  const [search, setSearch] = useState(withMatches ? 'okon' : '');
  const [user, setUser] = useState('');

  return (
    <div className="p-6">
      <SessionLedgerControls
        status={status}
        onStatusChange={setStatus}
        kind={kind}
        onKindChange={setKind}
        search={search}
        onSearchChange={setSearch}
        userOptions={
          withMatches
            ? [
                { value: 'acc_5f2b81c07d3e', label: 'Maria Okonkwo · maria@brightline.dev' },
                { value: 'acc_ba71e0c94f28', label: 'Femi Okonkwo · femi@northwind.io' },
              ]
            : []
        }
        selectedUser={user}
        onSelectedUserChange={setUser}
      />
    </div>
  );
}

export const Controls: Story = { render: () => <ControlsDemo /> };
export const ControlsWithUserMatches: Story = {
  name: 'Controls — searchUsers matches picked',
  render: () => <ControlsDemo withMatches />,
};

// ── Detail sheet ─────────────────────────────────────────────────────────────────────────────

function SheetDemo({
  session = sessionDetailFixture,
  openClose = false,
  openCloseAll = false,
  error,
  success,
}: {
  session?: SessionDetail;
  openClose?: boolean;
  openCloseAll?: boolean;
  error?: string;
  success?: string;
}) {
  const [closeOpen, setCloseOpen] = useState(openClose);
  const [closeAllOpen, setCloseAllOpen] = useState(openCloseAll);

  return (
    <div className="p-6">
      <BottomSheet open onOpenChange={() => {}} title="Session" subtitle={session.id}>
        <SessionDetailPanel
          session={session}
          onRequestClose={() => setCloseOpen(true)}
          closeConfirmOpen={closeOpen}
          onConfirmClose={() => setCloseOpen(false)}
          onCancelClose={() => setCloseOpen(false)}
          onRequestCloseAll={() => setCloseAllOpen(true)}
          closeAllConfirmOpen={closeAllOpen}
          onConfirmCloseAll={() => setCloseAllOpen(false)}
          onCancelCloseAll={() => setCloseAllOpen(false)}
          error={error}
          success={success}
        />
      </BottomSheet>
    </div>
  );
}

export const DetailSheet: Story = { render: () => <SheetDemo /> };

export const DetailSheetLight: Story = {
  name: 'Detail sheet — wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <SheetDemo />,
};

// An already-revoked session: "Close session" is ABSENT, not disabled — there is nothing left to
// close, and no state this screen could get it into.
export const DetailSheetRevoked: Story = {
  name: 'Detail sheet — already revoked (no Close session action)',
  render: () => <SheetDemo session={revokedSessionDetailFixture} />,
};

export const ConfirmCloseSession: Story = {
  name: 'Confirm — close one session (plain)',
  render: () => <SheetDemo openClose />,
};

export const ConfirmCloseAllSessions: Story = {
  name: 'Confirm — close every session for this user (typed)',
  render: () => <SheetDemo openCloseAll />,
};

// The rollback path: the optimistic status has already been reverted by the container, and the
// sheet says why in an `ErrorLine` rather than leaving a silent optimistic success on screen.
export const RevokeFailed: Story = {
  name: 'Detail sheet — revoke failed (row rolled back)',
  render: () => <SheetDemo error="Could not close the session. It may already be revoked." />,
};

export const RevokeSucceeded: Story = {
  name: 'Detail sheet — revoke succeeded',
  render: () => <SheetDemo session={revokedSessionDetailFixture} success="Session closed." />,
};
