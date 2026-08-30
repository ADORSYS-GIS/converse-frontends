'use client';

import { BottomSheet } from '@lightbridge/ui-web/src/components/bottom-sheet';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ReviewDetailPanel } from '@lightbridge/ui-web/src/components/review-detail-panel';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ReviewQueue } from '@lightbridge/ui-web/src/sections/review-queue';

import { useAdminScreen } from './use-admin-screen';

/**
 * `/admin` — the centre column, and (shell revamp phase 4, 2026-08-30) the WHOLE of `/admin`: the
 * budget refill review queue, reached from the sidebar's "Refill requests" item or the Overview
 * REFILL REQUESTS card's own `Review` link.
 *
 * The shell is NOT here — it is mounted once by `app/(console)/layout.tsx`.
 *
 * Phase 6 (admin/settings revamp): the queue now lives in a `Card` — the same split
 * `ProjectsLedger`/`projects-centre.tsx` established (the section supplies the toolbar/table/
 * pager, this file supplies the card) — and the Pending/Decided tab plus the RECENT DECISIONS
 * ledger below it are both gone. Neither was backed by a real listing: `listPendingAugmentation
 * Requests` is a PENDING-only read path, so "Decided" was always built from leftover rows in that
 * same fetch (see `use-admin-screen.ts`'s own doc comment).
 *
 * Picking a pending request shows `ReviewDetailPanel` — it already owns its whole decision
 * surface (including its own Approve/Decline actions, which stay in ITS internal foot, not a
 * sheet chrome footer — Addition E's carve-out for content that genuinely belongs there), so it
 * needs no rail section of its own. At `lg`+ the inspector rail is the surface for it
 * (`containers/inspector-rail.tsx`); below `lg`, where the rail is absent, the SAME selection
 * opens a `BottomSheet` instead (`portalClassName="lg:hidden"` — owner's locked layout contract,
 * 2026-08-30 restatement: "Right rail on large screens, bottom sheet on medium and small").
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

        <Card>
          <ReviewQueue
            pending={screen.pending}
            loading={screen.loading}
            loadingRowCount={6}
            error={screen.errorMessage}
            onRetry={screen.retry}
            sort={screen.sort}
            onSortChange={screen.setSort}
            selectedRequestId={screen.selectedRequestId}
            onSelectRequest={screen.selectRequest}
            pagination={screen.pagination}
          />
        </Card>
      </div>

      {/* Review detail has no trigger of its own — it is selection-driven. `ReviewDetailPanel` is
          keyed by request id: converse-frontends#322's decline-note validation is local state
          scoped to the selected request, and a `key` forces a fresh instance on every new
          selection instead of carrying a stale validation flag onto a different request. */}
      <BottomSheet
        open={screen.selectedRequestId !== null}
        onOpenChange={(open) => {
          if (!open) screen.clearSelection();
        }}
        title={screen.reviewDetail?.projectLabel ?? ''}
        subtitle={screen.reviewDetail?.accountLabel}
        portalClassName="lg:hidden">
        {screen.reviewDetail ? (
          <ReviewDetailPanel key={screen.selectedRequestId} {...screen.reviewDetail} />
        ) : null}
      </BottomSheet>
    </>
  );
}
