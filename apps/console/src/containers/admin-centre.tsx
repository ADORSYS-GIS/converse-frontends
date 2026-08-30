'use client';

import { cn } from '@lightbridge/ui-web/src/cn';
import { SelectionSheet } from '@lightbridge/ui-web/src/components/selection-sheet';
import { DecisionsLedger } from '@lightbridge/ui-web/src/sections/decisions-ledger';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import {
  REVIEW_DETAIL_RAIL_LABEL,
  ReviewDetailRail,
} from '@lightbridge/ui-web/src/sections/review-detail-rail';
import { ReviewQueue } from '@lightbridge/ui-web/src/sections/review-queue';

import { useAdminSectionParam } from '../client/url-state';
import { AdminOverviewCentre } from './admin-overview-centre';
import { AdminRail } from './admin-rail';
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
 * Shell revamp phase 2: the review queue's right-hand review-detail panel (`AdminRail`, refills
 * section only) used to render through the deleted `@rail` parallel-route slot; it now renders
 * inline as a right-hand `<aside>` at `lg`. `// phase-3 removes` — a real right-rail replacement
 * is designed in phase 3. Below `lg` it stays reachable through the existing
 * `SelectionSheet`, unaffected by the shell's own rail slot removal.
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

/** `/admin?section=refills` — the budget refill review queue and its selection-driven aside. */
function AdminReviewCentre({ screen }: { screen: ReturnType<typeof useAdminScreen> }) {
  return (
    <>
      <div className="flex gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
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

        {/* phase-3 removes */}
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <AdminRail />
        </aside>
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
