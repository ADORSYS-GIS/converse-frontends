import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../../components/card';
import type { LedgerSort } from '../../components/ledger-table';
import { ReviewQueue } from './component';
import { pendingRequestsFixture } from './fixtures';
import type { RefillRequestRow } from './types';

const meta: Meta<typeof ReviewQueue> = {
  title: 'Sections/ReviewQueue',
  component: ReviewQueue,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ReviewQueue>;

function Demo({
  pending = pendingRequestsFixture,
  loading = false,
  error,
  initialSelectedId = null,
  withPagination = false,
  requesterStatus,
}: {
  pending?: RefillRequestRow[];
  loading?: boolean;
  error?: string;
  initialSelectedId?: string | null;
  withPagination?: boolean;
  requesterStatus?: string;
}) {
  const [sort, setSort] = useState<LedgerSort>({ key: 'submitted', direction: 'asc' });
  const [selected, setSelected] = useState<string | null>(initialSelectedId);

  return (
    <div className="p-6">
      <Card>
        <ReviewQueue
          pending={pending}
          loading={loading}
          error={error}
          onRetry={() => {}}
          sort={sort}
          onSortChange={setSort}
          selectedRequestId={selected}
          onSelectRequest={(row) => setSelected(row.id)}
          requesterStatus={requesterStatus}
          pagination={
            withPagination
              ? { shown: pending.length, hasPrev: false, hasNext: true, onNext: () => {} }
              : undefined
          }
        />
      </Card>
    </div>
  );
}

export const Populated: Story = { render: () => <Demo initialSelectedId="gateway-prod" /> };

export const WithPagination: Story = {
  render: () => <Demo initialSelectedId="gateway-prod" withPagination />,
};

// ── Requester column (converse-frontends#444) ──────────────────────────────────────────────────
//
// `Populated` above already mixes all three steady states, because a real page does: the fixture
// carries two resolved identities (one with an email, one whose federated identity has none), one
// pre-migration NULL and one id the batch returned nothing for. The stories below isolate each so
// a reviewer of THIS column does not have to hunt for the row that shows the state they care
// about. Every one of them keeps its row in the queue — a labelled sentinel is never a reason to
// drop a pending decision.

const requesterRow = (
  id: string,
  requester: RefillRequestRow['requester'],
  overrides: Partial<RefillRequestRow> = {}
): RefillRequestRow => ({
  ...pendingRequestsFixture[0]!,
  id,
  requester,
  ...overrides,
});

export const RequesterResolved: Story = {
  name: 'Requester — resolved (name over email)',
  render: () => (
    <Demo
      pending={[
        requesterRow('resolved-with-email', {
          kind: 'user',
          name: 'Maria Okonkwo',
          email: 'maria@brightline.dev',
        }),
        requesterRow(
          'resolved-no-email',
          { kind: 'user', name: 'tobias.lang' },
          { project: 'batch-eval', submittedAgo: '2 d ago' }
        ),
      ]}
    />
  ),
};

export const RequesterUnknownPreMigration: Story = {
  name: 'Requester — unknown (pre-2026-09 rows)',
  render: () => (
    <Demo
      pending={pendingRequestsFixture.map((row) => ({ ...row, requester: { kind: 'unknown' } }))}
    />
  ),
};

export const RequesterUnresolved: Story = {
  name: 'Requester — unresolved id',
  render: () => (
    <Demo
      pending={pendingRequestsFixture.map((row, index) => ({
        ...row,
        requester: { kind: 'unresolved', userId: `usr_k3m9x1qp0z7${index}` },
      }))}
    />
  ),
};

// The degraded path: `resolveUserProfiles` failed, every id falls back to its raw form, and the
// queue says so ABOVE a table that still lists — and can still decide — every request.
export const RequesterResolutionFailed: Story = {
  name: 'Requester — resolution failed (degraded, not blocking)',
  render: () => (
    <Demo
      pending={pendingRequestsFixture.map((row, index) => ({
        ...row,
        requester: { kind: 'unresolved', userId: `usr_k3m9x1qp0z7${index}` },
      }))}
      requesterStatus="Requester names could not be resolved — showing the raw user id instead."
    />
  ),
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart, so the sentinels' de-emphasis is verified
// in both themes rather than only in the dark one.
export const RequesterStatesLight: Story = {
  name: 'Requester — all states, wireframe (light)',
  globals: { theme: 'wireframe' },
  render: () => <Demo />,
};

export const Empty: Story = { render: () => <Demo pending={[]} /> };

export const Loading: Story = { render: () => <Demo pending={[]} loading /> };

export const ErrorState: Story = {
  render: () => <Demo pending={[]} error="Could not load the refill queue." />,
};

export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <Demo />,
};
