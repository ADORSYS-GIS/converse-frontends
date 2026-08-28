'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { LatencyDashboard } from '@lightbridge/ui-web/src/sections/latency-dashboard';
import {
  OVERVIEW_EXPORT_RAIL_LABEL,
  OverviewExportRail,
} from '@lightbridge/ui-web/src/sections/overview-export-rail';
import {
  OVERVIEW_FILTERS_RAIL_LABEL,
  OverviewFiltersRail,
} from '@lightbridge/ui-web/src/sections/overview-filters-rail';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import {
  OVERVIEW_VIEW_RAIL_LABEL,
  OverviewViewRail,
} from '@lightbridge/ui-web/src/sections/overview-view-rail';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { SpendShareSection } from '@lightbridge/ui-web/src/sections/spend-share';

import { UrlSectionSheetTrigger } from './url-section-sheet-trigger';
import { OVERVIEW_EXPORT_UNAVAILABLE_CAPTION, useOverviewScreen } from './use-overview-screen';

/**
 * `/` — the Overview centre column.
 *
 * The shell is NOT here: it is mounted once by `app/(console)/layout.tsx`. This composes only the
 * centre's sections, plus the compact-tier section-sheet triggers that give the right rail's
 * sections a home below `lg` (where the rail is not rendered at all). Each trigger renders the
 * SAME rail section component the `@rail` route mounts, driven by the same query params — so there
 * is one source of truth for the values, mounted in two places, and it is the URL (ADR 0011).
 */
export function OverviewCentre() {
  const screen = useOverviewScreen();

  const viewRail = (
    <OverviewViewRail
      rangeField={screen.rangeField}
      bucketField={screen.bucketField}
      groupByField={screen.groupByField}
    />
  );
  const filtersRail = (
    <OverviewFiltersRail
      accountField={screen.accountField}
      projectField={screen.projectField}
      modelField={screen.modelField}
    />
  );
  // CSV export route doesn't exist yet (#308) — disabled with the reason stated beside it,
  // never a button that silently no-ops on press (console-ui#324). Same treatment as `OverviewRail`
  // (they share `OVERVIEW_EXPORT_UNAVAILABLE_CAPTION`) so the persistent rail and this compact-tier
  // sheet can never disagree.
  const exportRail = <OverviewExportRail disabled caption={OVERVIEW_EXPORT_UNAVAILABLE_CAPTION} />;

  return (
    <div className="flex flex-col gap-8">
      <ScreenHeading title="Overview" subline={screen.subline} />

      {/* #305/#307 — this no longer claims SPEND/SPEND SHARE/BUDGET are unwired: only LATENCY
          stays honestly blocked (contract has no latency/percentile field, Epic 6/#294). */}
      <InlineStatus>{screen.emptyMessage}</InlineStatus>

      <OverviewStatRow cards={screen.statCards} loading={screen.statCardsLoading} />

      <SpendDashboard
        series={screen.spendSeries}
        status={screen.spendStatus}
        errorMessage={screen.spendErrorMessage}
        onRetry={screen.spendRetry}
        fallbackWidth={840}
        height={220}
        onSelectSeries={screen.setSelectedSeriesKey}
        actions={
          <>
            <UrlSectionSheetTrigger
              id="view"
              icon="view"
              triggerLabel="Open view options"
              label={OVERVIEW_VIEW_RAIL_LABEL}>
              {viewRail}
            </UrlSectionSheetTrigger>
            <UrlSectionSheetTrigger
              id="filters"
              icon="filter"
              triggerLabel="Open filters"
              label={OVERVIEW_FILTERS_RAIL_LABEL}>
              {filtersRail}
            </UrlSectionSheetTrigger>
          </>
        }
      />

      {/* Placement: directly below the SPEND time series, above the LATENCY/BUDGET row -- see
          `pages-stories/overview.stories.tsx`'s equivalent comment for the full reasoning. Fed
          from the SAME usage query as `SpendDashboard` above -- one failed/loading query takes
          both down together, honestly, rather than one section looking wired and its sibling not. */}
      <SpendShareSection
        slices={screen.spendSlices}
        status={screen.spendStatus}
        errorMessage={screen.spendErrorMessage}
        onRetry={screen.spendRetry}
        size={200}
        selectedKey={screen.selectedSeriesKey}
        onSelectSlice={screen.setSelectedSeriesKey}
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
        <LatencyDashboard
          className="w-full lg:min-w-0 lg:flex-1 lg:basis-[528px]"
          series={[]}
          // #307 — this is a PERMANENT, contract-level block, not "not wired yet": the usage API's
          // documented `UsageSeriesPoint` shape carries no latency/percentile field at all, tracked
          // as Epic 6 / #294 (ADR 0008 Decision 7 status note). Reusing `status="unwired"` (rather
          // than inventing a second vocabulary) with an overridden message, per this epic's own
          // instruction to reuse the existing vocabulary for what stays unwired.
          status="unwired"
          unwiredMessage={screen.latencyMessage}
          fallbackWidth={840}
          height={200}
        />
        <BudgetPanel
          className="w-full lg:min-w-0 lg:flex-1 lg:basis-[320px]"
          budget={screen.budget}
          heroAction={
            screen.refillAction ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={screen.refillAction.pending}
                onClick={screen.refillAction.onClick}>
                {screen.refillAction.label}
              </Button>
            ) : undefined
          }
          actions={
            <UrlSectionSheetTrigger
              id="export"
              icon="export"
              triggerLabel="Open export"
              label={OVERVIEW_EXPORT_RAIL_LABEL}>
              {exportRail}
            </UrlSectionSheetTrigger>
          }
        />
      </div>
      {screen.refillErrorMessage ? (
        <ErrorLine message={`Refill request failed: ${screen.refillErrorMessage}`} />
      ) : null}
    </div>
  );
}
