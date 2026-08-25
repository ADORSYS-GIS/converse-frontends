'use client';

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
import { useOverviewScreen } from './use-overview-screen';

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
  const exportRail = <OverviewExportRail onExport={() => {}} />;

  return (
    <div className="flex flex-col gap-8">
      <ScreenHeading title="Overview" subline={screen.subline} />

      <InlineStatus>{screen.emptyMessage}</InlineStatus>

      <OverviewStatRow cards={screen.statCards} loading={screen.statCardsLoading} />

      <SpendDashboard
        series={[]}
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
          from the same (currently honestly-empty) source as `SpendDashboard` above: neither has a
          live usage-backend query client yet (`screen.emptyMessage`). */}
      <SpendShareSection
        slices={[]}
        size={200}
        selectedKey={screen.selectedSeriesKey}
        onSelectSlice={screen.setSelectedSeriesKey}
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
        <LatencyDashboard
          className="w-full lg:min-w-0 lg:flex-1 lg:basis-[528px]"
          series={[]}
          fallbackWidth={840}
          height={200}
        />
        <BudgetPanel
          className="w-full lg:min-w-0 lg:flex-1 lg:basis-[320px]"
          budget={{
            value: 0,
            ceiling: 0,
            caption: 'Budget figures arrive with the budget query wiring.',
          }}
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
    </div>
  );
}
