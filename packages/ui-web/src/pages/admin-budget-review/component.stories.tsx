import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsoleHeader } from '../../components/console-header';
import type { ReviewDecision } from '../../components/review-detail-panel';
import { AdminBudgetReviewPage } from './component';
import {
  adminAdminNavItems,
  adminNavItems,
  adminSubNavItems,
  gatewayProdHistory,
  pendingRequestsFixture,
  recentDecisionsFixture,
} from './fixtures';
import type { AdminReviewTab, RefillRequestRow } from './types';

const identity = (
  <div className="flex items-center gap-3">
    <span className="hidden font-mono text-[11px] text-subtle md:inline">sam@adorsys.com</span>
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[2px] bg-raised font-mono text-[10px] text-soft">
      SL
    </span>
  </div>
);
const orgSwitcher = <span className="font-mono text-xs text-soft">adorsys-gis</span>;
const header = <ConsoleHeader orgSwitcher={orgSwitcher} identity={identity} />;
const nav = { items: adminNavItems, adminItems: adminAdminNavItems, showAdmin: true };

function StatefulAdminBudgetReviewPage({
  pending = pendingRequestsFixture,
  loading = false,
  error,
  initialSelectedId = null,
}: {
  pending?: RefillRequestRow[];
  loading?: boolean;
  error?: string;
  initialSelectedId?: string | null;
}) {
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

  return (
    <AdminBudgetReviewPage
      header={header}
      nav={nav}
      subNav={{ items: adminSubNavItems }}
      activeTab={tab}
      onTabChange={setTab}
      pendingCount={pendingRows.length}
      decidedCount={26}
      pending={pendingRows}
      decisions={decisions}
      loading={loading}
      error={error}
      onRetry={() => {}}
      selectedRequestId={selectedId}
      onSelectRequest={(row) => setSelectedId(row.id)}
      reviewDetail={
        selected
          ? {
              subject: selected.project,
              requesterEmail: selected.requesterEmail,
              submittedAt: selected.submittedAgo,
              consumedAmount: selected.consumed,
              ceilingAmount: selected.ceiling,
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
      pagination={{ shown: 6, total: 26, hasPrev: false, hasNext: true }}
    />
  );
}

const meta: Meta<typeof AdminBudgetReviewPage> = {
  title: 'Pages/AdminBudgetReviewPage',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AdminBudgetReviewPage>;

// Full page, populated 1:1 against docs/design/console-redesign/admin-budget-review.svg — first
// pending row pre-selected, right rail showing its ReviewDetailPanel.
export const Populated: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulAdminBudgetReviewPage initialSelectedId="gateway-prod" />
    </div>
  ),
};

// A different request selected — confirms the right rail retargets per row.
export const RequestSelected: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulAdminBudgetReviewPage initialSelectedId="agent-sandbox" />
    </div>
  ),
};

// §6 — "Nothing awaiting a decision." queue-empty state; the RECENT DECISIONS ledger fills the screen.
export const QueueEmpty: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulAdminBudgetReviewPage pending={[]} />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulAdminBudgetReviewPage pending={[]} loading />
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <div className="w-[1440px]">
      <StatefulAdminBudgetReviewPage pending={[]} error="Failed to load the review queue." />
    </div>
  ),
};

// `md` tier (600–1024) — ADMIN sub-nav stays inline, the ReviewDetailPanel docks as a
// BottomSheet. A real viewport resize is what exercises the `md:` classes now the shell is
// CSS-tiered, not a wrapper `<div>`.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <StatefulAdminBudgetReviewPage initialSelectedId="gateway-prod" />,
};

// Base tier (<600, a designed target — console-ui skill "Shape and layout"): single column,
// Pending/Decided tabs stay reachable above a horizontally-scrollable queue, nav docked as a
// fixed bottom navigation bar, REVIEW reachable via the right rail's BottomSheet peek row,
// ADMIN sub-nav reachable via the header's drawer trigger.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <StatefulAdminBudgetReviewPage initialSelectedId="gateway-prod" />,
};
