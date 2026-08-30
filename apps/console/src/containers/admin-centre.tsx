'use client';

import { cn } from '@lightbridge/ui-web/src/cn';
import { DetailSheet } from '@lightbridge/ui-web/src/components/detail-sheet';
import { ReviewDetailPanel } from '@lightbridge/ui-web/src/components/review-detail-panel';
import { DecisionsLedger } from '@lightbridge/ui-web/src/sections/decisions-ledger';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ReviewQueue } from '@lightbridge/ui-web/src/sections/review-queue';

import { useAdminSectionParam } from '../client/url-state';
import { AdminOverviewCentre } from './admin-overview-centre';
import { useAdminScreen } from './use-admin-screen';
import type { AdminSection } from '../client/url-state';

/**
 * The Admin area's section switch — one route, two sections behind one nav entry, so the switch
 * lives here rather than as a second top-level nav item or a second URL segment.
 *
 * `// phase-4 removes`: this horizontal tab row is the shell revamp's temporary relocation of the
 * deleted `admin-sub-nav.tsx`'s rail sub-nav — it survives until phase 4, which redesigns the
 * Admin area's own navigation properly rather than carrying a rail-shaped switcher into a shell
 * that no longer has a rail for it to live in.
 */
function AdminSectionTabs({
  section,
  pendingCount,
  onSelect,
}: {
  section: AdminSection;
  pendingCount: number;
  onSelect: (section: AdminSection) => void;
}) {
  const tabClass = (active: boolean) =>
    cn('pb-2 font-sans text-[13px]', active ? 'text-ink' : 'text-subtle');

  return (
    <div role="tablist" aria-label="Admin section" className="flex flex-col gap-0">
      <div className="flex items-center gap-6">
        <button
          type="button"
          role="tab"
          aria-selected={section === 'overview'}
          onClick={() => onSelect('overview')}
          className={tabClass(section === 'overview')}>
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'refills'}
          onClick={() => onSelect('refills')}
          className={tabClass(section === 'refills')}>
          Refill requests ({pendingCount})
        </button>
      </div>
      <div className="bg-raised h-px" />
    </div>
  );
}

/**
 * `/admin` — the centre column. The shell is mounted once, in `app/(console)/layout.tsx`.
 *
 * `/admin` is one route with two sections rather than two nav entries (see `AdminSectionTabs`
 * above): the operator's dashboard is the LANDING section, and the budget refill queue below is
 * the other. Which one renders is `?section=`, the same param the tab row writes.
 *
 * Shell revamp phase 3 (right rail out): the review queue's right-hand review-detail panel (the
 * temporary `AdminRail` aside, phase 2) is gone. Picking a pending request now opens `DetailSheet`
 * hosting `ReviewDetailPanel` directly — it already owns its whole decision surface, so it needs
 * no rail section of its own — at every tier, the same way.
 */
export function AdminCentre() {
  const [section, setSection] = useAdminSectionParam();
  // Mounted regardless of section, same as the deleted `admin-sub-nav.tsx` did, so the tab row's
  // own "Refill requests (N)" count is always current even while the overview section is showing.
  const queue = useAdminScreen();

  return (
    <div className="flex flex-col gap-6">
      <AdminSectionTabs section={section} pendingCount={queue.pendingCount} onSelect={setSection} />
      {section === 'overview' ? <AdminOverviewCentre /> : <AdminReviewCentre screen={queue} />}
    </div>
  );
}

/** `/admin?section=refills` — the budget refill review queue and its selection-driven detail. */
function AdminReviewCentre({ screen }: { screen: ReturnType<typeof useAdminScreen> }) {
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
