'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { formatMsAxis } from '@lightbridge/ui-web/src/lib/duration';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
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
/**
 * Every spend figure the Overview charts render is USD, and every one of them goes through the
 * adaptive-precision ladder in `@lightbridge/ui-web/src/lib/money`.
 *
 * These were previously not passed at all, so both charts fell back to their unit-agnostic
 * defaults -- `String(Math.round(v))` for the time series, the same for the donut. Against real
 * production spend (an account at $0.006338 of a $12.00 ceiling) that labels every y-axis tick
 * and every tooltip `0`: no currency sign, no magnitude, no information. The chart primitives are
 * deliberately unit-blind (`LatencyDashboard` renders `ms` through the same props), so the fix
 * belongs here, at the one place that knows these particular series are money.
 */
const formatSpendTooltip = (value: number) => formatUsd(value);
const formatSpendSliceValue = (slice: { value: number }, percent: number) =>
  `${formatUsd(slice.value)} · ${percent.toFixed(0)}%`;

export function OverviewCentre() {
  const screen = useOverviewScreen();

  const spendTotal = screen.spendSlices.reduce((sum, slice) => sum + slice.value, 0);

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

      <OverviewStatRow cards={screen.statCards} loading={screen.statCardsLoading} />

      <SpendDashboard
        series={screen.spendSeries}
        status={screen.spendStatus}
        errorMessage={screen.spendErrorMessage}
        onRetry={screen.spendRetry}
        fallbackWidth={840}
        height={220}
        formatYTick={formatUsdAxis}
        formatTooltipValue={formatSpendTooltip}
        formatLegendValue={(series) =>
          formatUsd(series.points.reduce((sum, point) => sum + point.y, 0))
        }
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
        centreMetric={
          screen.spendStatus === 'ready' && spendTotal > 0 ? formatUsd(spendTotal) : undefined
        }
        centreLabel={screen.spendStatus === 'ready' && spendTotal > 0 ? 'TOTAL' : undefined}
        formatTooltipValue={formatSpendSliceValue}
        formatLegendValue={formatSpendSliceValue}
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
        {/* Wired off the SAME usageQuery SpendDashboard/SpendShareSection above already run — see
            `use-overview-screen.ts`'s doc comment. `latencyFootnote` carries the per-series
            honesty: `undefined` when every group reported real latency, otherwise naming exactly
            which group(s) (or the whole range) reported none — never a chart-wide "unwired"
            claim now that a real usage-backend query client exists and ran. */}
        <LatencyDashboard
          className="w-full lg:min-w-0 lg:flex-1 lg:basis-[528px]"
          series={screen.latencySeries}
          status={screen.latencyStatus}
          errorMessage={screen.latencyErrorMessage}
          onRetry={screen.latencyRetry}
          footnote={screen.latencyFootnote}
          fallbackWidth={840}
          height={200}
          formatXTick={formatMsAxis}
          onSelectSeries={screen.setSelectedSeriesKey}
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
