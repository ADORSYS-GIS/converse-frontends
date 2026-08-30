'use client';

import { DetailSheet } from '@lightbridge/ui-web/src/components/detail-sheet';
import { ReviewDetailPanel } from '@lightbridge/ui-web/src/components/review-detail-panel';
import { DecisionsLedger } from '@lightbridge/ui-web/src/sections/decisions-ledger';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ReviewQueue } from '@lightbridge/ui-web/src/sections/review-queue';

import { useAdminScreen } from './use-admin-screen';

/**
 * `/admin` — the centre column, and (shell revamp phase 4, 2026-08-30) the WHOLE of `/admin`: the
 * operator's dashboard that used to live behind `?section=overview` moved to `/` itself, gated by
 * `session.isAdmin` (`use-overview-screen.ts`'s admin-only block) — one dashboard, parameterised
 * by role, rather than two screens that could (and did) drift. `/admin` is now exactly what its
 * name plus this queue always meant: the budget refill review queue, reached from the sidebar's
 * "Refill requests" item or the Overview REFILL REQUESTS card's own `Review` link.
 *
 * The shell is NOT here — it is mounted once by `app/(console)/layout.tsx`.
 *
 * Shell revamp phase 3 (right rail out): the review queue's right-hand review-detail panel (the
 * temporary `AdminRail` aside, phase 2) is gone. Picking a pending request opens `DetailSheet`
 * hosting `ReviewDetailPanel` directly — it already owns its whole decision surface, so it needs
 * no rail section of its own — at every tier, the same way.
 */
export function AdminCentre() {
  const screen = useAdminScreen();

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Budget refill review"
          subtitle={`${screen.pendingCount} request${screen.pendingCount === 1 ? '' : 's'} awaiting a decision${
            screen.pending.length > 0
              ? ` · oldest submitted ${screen.pending[0]?.submittedAgo}`
              : ''
          }`}
        />

        <ReviewQueue
          activeTab={screen.activeTab}
          onTabChange={screen.setActiveTab}
          pendingCount={screen.pendingCount}
          decidedCount={screen.decidedCount}
          pending={screen.pending}
          loading={screen.loading}
          loadingRowCount={6}
          error={screen.errorMessage}
          onRetry={screen.retry}
          emptyPendingMessage={screen.emptyPendingMessage}
          selectedRequestId={screen.selectedRequestId}
          onSelectRequest={screen.selectRequest}
        />

        <DecisionsLedger
          decisions={screen.decisions}
          pagination={screen.pagination}
          sourceCaveat={screen.decidedSourceCaveat}
        />
      </div>

      {/* Review detail has no trigger of its own — it is selection-driven. `ReviewDetailPanel` is
          keyed by request id: converse-frontends#322's decline-note validation is local state
          scoped to the selected request, and a `key` forces a fresh instance on every new
          selection instead of carrying a stale validation flag onto a different request. */}
      <DetailSheet
        open={screen.selectedRequestId !== null}
        onOpenChange={(open) => {
          if (!open) screen.clearSelection();
        }}
        title={screen.reviewDetail?.subject ?? ''}>
        {screen.reviewDetail ? (
          <ReviewDetailPanel key={screen.selectedRequestId} {...screen.reviewDetail} />
        ) : null}
      </DetailSheet>
    </>
  );
}
