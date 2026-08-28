// Page-level acceptance story for ADMIN BUDGET REVIEW — sections composed inside `ConsoleShell`
// with the section fixtures, 1:1 against docs/design/console-redesign/admin-budget-review.svg.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { ConsoleShell } from '../components/console-shell';
import { RailPanel } from '../components/rail-panel';
import type { ReviewDecision } from '../components/review-detail-panel';
import { SelectionSheet } from '../components/selection-sheet';
import { SubNav } from '../components/sub-nav';
import { DecisionsLedger } from '../sections/decisions-ledger';
import { recentDecisionsFixture } from '../sections/decisions-ledger/fixtures';
import { REVIEW_DETAIL_RAIL_LABEL, ReviewDetailRail } from '../sections/review-detail-rail';
import { gatewayProdHistory } from '../sections/review-detail-rail/fixtures';
import { ReviewQueue } from '../sections/review-queue';
import { pendingRequestsFixture } from '../sections/review-queue/fixtures';
import type { AdminReviewTab, RefillRequestRow } from '../sections/review-queue';
import { ScreenHeading } from '../sections/screen-heading';
import { adminSubNavItems, storyAdminNavItems, storyHeader, storyNavItems } from './shell-fixtures';

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
  const [tab, setTab] = useState<AdminReviewTab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [note, setNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [decisions, setDecisions] = useState(recentDecisionsFixture);
  const [pendingRows, setPendingRows] = useState(pending);

  const selected = pendingRows.find((row) => row.id === selectedId) ?? null;

  function handleDecide(decision: ReviewDecision) {
    if (!selected) return;
    setDeciding(true);
    setTimeout(() => {
      setDeciding(false);
      setDecisions((prev) => [
        {
          id: `decision-${selected.id}`,
          date: '2026-02-24',
          project: selected.project,
          account: selected.account,
          amount: selected.requestedAmount,
          decision: decision === 'approve' ? 'approved' : 'declined',
          decidedBy: 'sam',
        },
        ...prev,
      ]);
      setPendingRows((prev) => prev.filter((row) => row.id !== selected.id));
      setSelectedId(null);
      setNote('');
    }, 300);
  }

  const reviewRail = (
    <ReviewDetailRail
      detail={
        selected
          ? {
              subject: selected.project,
              requesterEmail: selected.requesterEmail,
              submittedAt: selected.submittedAgo,
              consumedAmount: selected.consumed ?? undefined,
              ceilingAmount: selected.ceiling ?? undefined,
              requestedAmount: selected.requestedAmount,
              requesterNote:
                'Q1 catalogue re-index lands this week; expect roughly $180 of extra spend before the period resets on 01 Mar.',
              history: gatewayProdHistory,
              note,
              onNoteChange: setNote,
              onDecide: (decision) => handleDecide(decision),
              deciding,
            }
          : null
      }
    />
  );

  return (
    <ConsoleShell
      header={storyHeader}
      nav={{
        items: storyNavItems('admin'),
        adminItems: storyAdminNavItems('admin'),
        showAdmin: true,
      }}
      leftSecondary={
        <RailPanel label="ADMIN">
          <SubNav items={adminSubNavItems} />
        </RailPanel>
      }
      leftSecondaryLabel="Admin"
      rightRail={<RailPanel>{reviewRail}</RailPanel>}>
      <div className="flex flex-col gap-6">
        <ScreenHeading
          title="Budget refill review"
          subline={`${pendingRows.length} request${pendingRows.length === 1 ? '' : 's'} awaiting a decision${
            pendingRows.length > 0 ? ` · oldest submitted ${pendingRows[0]?.submittedAgo}` : ''
          }`}
        />

        <ReviewQueue
          activeTab={tab}
          onTabChange={setTab}
          pendingCount={pendingRows.length}
          decidedCount={26}
          pending={pendingRows}
          loading={loading}
          error={error}
          onRetry={() => {}}
          selectedRequestId={selectedId}
          onSelectRequest={(row) => setSelectedId(row.id)}
        />

        <DecisionsLedger
          decisions={decisions}
          pagination={{ shown: decisions.length, total: 26, hasPrev: false, hasNext: true }}
        />
      </div>

      {/* REVIEW has no trigger of its own — it is selection-driven. */}
      <SelectionSheet selectionKey={selectedId} label={REVIEW_DETAIL_RAIL_LABEL}>
        {reviewRail}
      </SelectionSheet>
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
// right rail showing its review detail.
export const Populated: Story = {
  render: () => <AdminBudgetReviewScreen initialSelectedId="gateway-prod" />,
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Populated`.
export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <AdminBudgetReviewScreen initialSelectedId="gateway-prod" />,
  globals: { theme: 'wireframe' },
};

// A different request selected — confirms the right rail retargets per row.
export const RequestSelected: Story = {
  render: () => <AdminBudgetReviewScreen initialSelectedId="agent-sandbox" />,
};

// §6 — "Nothing awaiting a decision." queue-empty state; RECENT DECISIONS fills the screen.
export const QueueEmpty: Story = { render: () => <AdminBudgetReviewScreen pending={[]} /> };

export const Loading: Story = { render: () => <AdminBudgetReviewScreen pending={[]} loading /> };

export const ErrorState: Story = {
  render: () => <AdminBudgetReviewScreen pending={[]} error="Failed to load the review queue." />,
};

// `md` tier (600–1024) — ADMIN sub-nav stays inline; the right rail has no persistent
// footer/peek bar. REVIEW has no trigger of its own: it is selection-driven, and a request is
// pre-selected here, so the sheet opens itself on mount.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <AdminBudgetReviewScreen initialSelectedId="gateway-prod" />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole('dialog', { name: 'REVIEW' })).toBeInTheDocument());
  },
};

// Base tier (<600): single column, Pending/Decided tabs above a horizontally-scrollable queue,
// nav docked as a fixed bottom navigation bar, REVIEW opens itself the same selection-driven way.
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
