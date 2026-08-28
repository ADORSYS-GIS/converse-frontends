'use client';

import { SelectionSheet } from '@lightbridge/ui-web/src/components/selection-sheet';
import { DecisionsLedger } from '@lightbridge/ui-web/src/sections/decisions-ledger';
import {
  REVIEW_DETAIL_RAIL_LABEL,
  ReviewDetailRail,
} from '@lightbridge/ui-web/src/sections/review-detail-rail';
import { ReviewQueue } from '@lightbridge/ui-web/src/sections/review-queue';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';

import { useAdminScreen } from './use-admin-screen';

/** `/admin` — the centre column. The shell is mounted once, in `app/(console)/layout.tsx`. */
export function AdminCentre() {
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

      {/* Review detail has no trigger of its own — it is selection-driven. */}
      <SelectionSheet selectionKey={screen.selectedRequestId} label={REVIEW_DETAIL_RAIL_LABEL}>
        <ReviewDetailRail detail={screen.reviewDetail} />
      </SelectionSheet>
    </>
  );
}
