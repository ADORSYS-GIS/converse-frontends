'use client';

import { BottomSheet } from '@lightbridge/ui-web/src/components/bottom-sheet';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ReviewDetailPanel } from '@lightbridge/ui-web/src/components/review-detail-panel';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ReviewQueue } from '@lightbridge/ui-web/src/sections/review-queue';

import { useRefillsQueueScreen } from './use-refills-queue-screen';

/**
 * `/admin/refills-queue` — the centre column, and the WHOLE of this route: the budget refill
 * review queue, reached from the account-area Operator group's "Refill requests" item (into
 * `/admin/overview`, one click from here), the admin area's own "Refills queue" nav entry, or the
 * Overview REFILL REQUESTS card's own `Review` link.
 *
 * This screen has moved twice: `/admin` (pre-IA-v3) -> `/settings/refills-queue` (IA v3 phase 2,
 * `git mv`) -> `/admin/refills-queue` here (ADR 0013's same-day "the admin area" amendment,
 * another `git mv`) — same component, same data adapter (`use-refills-queue-screen.ts`), same
 * server-side role gate (`admin/refills-queue/page.tsx`) across both moves.
 *
 * The shell is NOT here — it is mounted once by `app/(console)/layout.tsx`.
 *
 * Phase 6 (admin/settings revamp): the queue lives in a `Card` — the same split
 * `ProjectsLedger`/`projects-centre.tsx` established (the section supplies the toolbar/table/
 * pager, this file supplies the card) — with no Pending/Decided tab and no RECENT DECISIONS
 * ledger below it. Neither was backed by a real listing: `listPendingAugmentation
 * Requests` is a PENDING-only read path, so "Decided" was always built from leftover rows in that
 * same fetch (see `use-refills-queue-screen.ts`'s own doc comment).
 *
 * Picking a pending request shows `ReviewDetailPanel` — it already owns its whole decision
 * surface (including its own Approve/Decline actions, which stay in ITS internal foot, not a
 * sheet chrome footer — Addition E's carve-out for content that genuinely belongs there), so it
 * needs no rail section of its own. `BottomSheet` is the review surface at EVERY tier, not only
 * below `lg` — no viewport-gated portal class: neither `/admin/*` nor `/settings/*` carries a
 * right rail at any tier (ADR 0013 D2/phase E deleted the console's whole rail wiring —
 * `containers/inspector-rail.tsx` and `client/use-rail-width.ts` are gone, not merely unused), so
 * there is no `lg`+ surface left to hand this off to.
 */
export function RefillsQueueCentre() {
  const screen = useRefillsQueueScreen();

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
            requesterStatus={screen.requesterStatus}
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
        subtitle={screen.reviewDetail?.accountLabel}>
        {screen.reviewDetail ? (
          <ReviewDetailPanel key={screen.selectedRequestId} {...screen.reviewDetail} />
        ) : null}
      </BottomSheet>
    </>
  );
}
