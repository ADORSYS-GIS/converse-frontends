// Page-level acceptance story for ADMIN BUDGET REVIEW — sections composed inside `ConsoleShell`
// with the section fixtures, 1:1 against docs/design/console-redesign/admin-budget-review.svg.
//
// Phase 6 (admin/settings revamp): the Pending/Decided tab and the RECENT DECISIONS ledger below
// it are both gone — `listPendingAugmentationRequests` is a PENDING-only read path, so "Decided"
// was always built from leftover rows in that same fetch. The queue now lives in a `Card`, the
// same split `ProjectsLedger`/`projects-centre.tsx` established. The review detail is a
// `DetailSheet` that opens on row pick and hosts `ReviewDetailPanel` directly.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Card } from '../components/card';
import type { LedgerSort } from '../components/ledger-table';
import { ConsoleShell } from '../components/console-shell';
import { DetailSheet } from '../components/detail-sheet';
import { ReviewDetailPanel } from '../components/review-detail-panel';
import type { ReviewDecision } from '../components/review-detail-panel';
import { ReviewQueue } from '../sections/review-queue';
import { pendingRequestsFixture } from '../sections/review-queue/fixtures';
import type { RefillRequestRow } from '../sections/review-queue';
import { PageHeader } from '../sections/page-header';
import { storySidebar, storyTopBar } from './shell-fixtures';

interface AdminScreenProps {
  pending?: RefillRequestRow[];
  loading?: boolean;
  error?: string;
  initialSelectedId?: string | null;
}

// The composition `apps/console`'s `(console)` layout + `/admin` route perform for real.
function AdminBudgetReviewScreen({
  pending = pendingRequestsFixture,
  loading = false,
  error,
  initialSelectedId = null,
}: AdminScreenProps) {
  const [sort, setSort] = useState<LedgerSort>({ key: 'submitted', direction: 'asc' });
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [note, setNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [pendingRows, setPendingRows] = useState(pending);

  const selected = pendingRows.find((row) => row.id === selectedId) ?? null;

  function handleDecide(decision: ReviewDecision) {
    if (!selected) return;
    setDeciding(true);
    setTimeout(() => {
      setDeciding(false);
      setPendingRows((prev) => prev.filter((row) => row.id !== selected.id));
      setSelectedId(null);
      setNote('');
    }, 300);
  }

  return (
    <ConsoleShell sidebar={storySidebar('admin', { isAdmin: true })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Budget refill review"
          subtitle={`${pendingRows.length} request${pendingRows.length === 1 ? '' : 's'} awaiting a decision${
            pendingRows.length > 0 ? ` · oldest submitted ${pendingRows[0]?.submittedAgo}` : ''
          }`}
        />

        <Card>
          <ReviewQueue
            pending={pendingRows}
            loading={loading}
            error={error}
            onRetry={() => {}}
            sort={sort}
            onSortChange={setSort}
            selectedRequestId={selectedId}
            onSelectRequest={(row) => setSelectedId(row.id)}
          />
        </Card>
      </div>

      <DetailSheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        title={selected?.project ?? ''}>
        {selected ? (
          <ReviewDetailPanel
            key={selected.id}
            projectLabel={selected.project}
            accountLabel={selected.account}
            submittedAt={selected.submittedAgo}
            requestedAmount={selected.requestedAmount}
            requesterNote="Q1 catalogue re-index lands this week; expect roughly $180 of extra spend before the period resets on 01 Mar."
            note={note}
            onNoteChange={setNote}
            onDecide={(decision) => handleDecide(decision)}
            deciding={deciding}
          />
        ) : null}
      </DetailSheet>
    </ConsoleShell>
  );
}

const meta: Meta<typeof AdminBudgetReviewScreen> = {
  title: 'Pages/AdminBudgetReview',
  component: AdminBudgetReviewScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AdminBudgetReviewScreen>;

// Full page, populated 1:1 against admin-budget-review.svg — first pending row pre-selected,
// `DetailSheet` showing its review detail.
export const Populated: Story = {
  render: () => <AdminBudgetReviewScreen initialSelectedId="gateway-prod" />,
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Populated`.
export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <AdminBudgetReviewScreen initialSelectedId="gateway-prod" />,
  globals: { theme: 'wireframe' },
};

// A different request selected — confirms the sheet retargets per row.
export const RequestSelected: Story = {
  render: () => <AdminBudgetReviewScreen initialSelectedId="agent-sandbox" />,
};

// §6 — the honest "No requests awaiting a decision" `EmptyState`, replacing the table outright.
export const QueueEmpty: Story = { render: () => <AdminBudgetReviewScreen pending={[]} /> };

export const Loading: Story = { render: () => <AdminBudgetReviewScreen pending={[]} loading /> };

export const ErrorState: Story = {
  render: () => <AdminBudgetReviewScreen pending={[]} error="Failed to load the review queue." />,
};

// `md` tier (600–1024) — the same `DetailSheet`, opened by the same row pick, as `lg`.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <AdminBudgetReviewScreen initialSelectedId="gateway-prod" />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(body.getByRole('dialog', { name: 'gateway-prod' })).toBeInTheDocument()
    );
  },
};

// Base tier (<600): single column, no tabs above the queue any more, nav docked as a fixed
// bottom navigation bar, the same selection-driven `DetailSheet`.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <AdminBudgetReviewScreen initialSelectedId="gateway-prod" />,
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `MobileBaseTier`.
export const MobileBaseTierLight: Story = {
  name: 'Mobile Base Tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <AdminBudgetReviewScreen initialSelectedId="gateway-prod" />,
};
