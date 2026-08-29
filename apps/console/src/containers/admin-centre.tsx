'use client';

import { SelectionSheet } from '@lightbridge/ui-web/src/components/selection-sheet';
import { DecisionsLedger } from '@lightbridge/ui-web/src/sections/decisions-ledger';
import {
  REVIEW_DETAIL_RAIL_LABEL,
  ReviewDetailRail,
} from '@lightbridge/ui-web/src/sections/review-detail-rail';
import { ReviewQueue } from '@lightbridge/ui-web/src/sections/review-queue';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';

import { useAdminSectionParam } from '../client/url-state';
import { AdminOverviewCentre } from './admin-overview-centre';
import { useAdminScreen } from './use-admin-screen';

/**
 * `/admin` — the centre column. The shell is mounted once, in `app/(console)/layout.tsx`.
 *
 * `/admin` is one route with two sections rather than two nav entries (see `admin-sub-nav.tsx`):
 * the operator's dashboard is the LANDING section, and the budget refill queue below is the other.
 * Which one renders is `?section=`, the same param the sub-nav writes and the shell layout reads
 * to decide whether this route gets a right rail at all — the review queue is selection-driven and
 * earns one, the dashboard is not and does not.
 */
export function AdminCentre() {
  const [section] = useAdminSectionParam();

  if (section === 'overview') return <AdminOverviewCentre />;
  return <AdminReviewCentre />;
}

/** `/admin?section=refills` — the budget refill review queue and its selection-driven rail. */
function AdminReviewCentre() {
  const screen = useAdminScreen();

  return (
    <>
      <div className="flex flex-col gap-6">
        <ScreenHeading
          title="Budget refill review"
          subline={`${screen.pendingCount} request${screen.pendingCount === 1 ? '' : 's'} awaiting a decision${
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

      {/* Review detail has no trigger of its own — it is selection-driven. Keyed the same way as
          `admin-rail.tsx` — see that file's comment: converse-frontends#322's decline-note
          validation is local state scoped to the selected request. */}
      <SelectionSheet selectionKey={screen.selectedRequestId} label={REVIEW_DETAIL_RAIL_LABEL}>
        <ReviewDetailRail key={screen.selectedRequestId ?? 'none'} detail={screen.reviewDetail} />
      </SelectionSheet>
    </>
  );
}
