'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { LatencyDashboard } from '@lightbridge/ui-web/src/sections/latency-dashboard';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { OverviewToolbar } from '@lightbridge/ui-web/src/sections/overview-toolbar';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { SpendShareSection } from '@lightbridge/ui-web/src/sections/spend-share';

import { OVERVIEW_EXPORT_UNAVAILABLE_CAPTION, useOverviewScreen } from './use-overview-screen';

/**
 * `/` — the Overview centre column, which since the owner review of 2026-08-29 is the WHOLE
 * screen: this route supplies no `@rail` and no `@scope` slot content at any tier.
 *
 * The shell is NOT here: it is mounted once by `app/(console)/layout.tsx`. This composes the
 * centre's sections and the one `OverviewToolbar` that carries every parameter the screen has.
 *
 * There is no longer a rail/sheet pair to keep in sync — the controls are mounted once, visible at
 * every tier — but the values still live in the query string (ADR 0011), so a configured dashboard
 * stays a link you can send.
 */
export function OverviewCentre() {
  const screen = useOverviewScreen();


  return (
    <div className="flex flex-col gap-8">
      <ScreenHeading title="Overview" subline={screen.subline} />

      {/* #305/#307 — this no longer claims SPEND/SPEND SHARE/BUDGET are unwired: only LATENCY
          stays honestly blocked (contract has no latency/percentile field, Epic 6/#294). */}
      <InlineStatus>{screen.emptyMessage}</InlineStatus>

      {/* Every parameter this screen has, in one always-visible strip — no rail at any tier, no
          section sheets, no `lg`-only composition (owner review 2026-08-29). */}
      <OverviewToolbar
        rangeField={screen.rangeField}
        bucketField={screen.bucketField}
        groupByField={screen.groupByField}
        projectField={screen.projectField}
        modelField={screen.modelField}
        // No handler: the CSV export route does not exist yet (#308). The action renders disabled
        // WITH its reason rather than silently no-opping (console-ui#324).
        exportDisabledReason={OVERVIEW_EXPORT_UNAVAILABLE_CAPTION}
      />

      <OverviewStatRow cards={screen.statCards} loading={screen.statCardsLoading} />

      <SpendDashboard
        series={screen.spendSeries}
        status={screen.spendStatus}
        errorMessage={screen.spendErrorMessage}
        onRetry={screen.spendRetry}
        fallbackWidth={840}
        height={220}
        onSelectSeries={screen.setSelectedSeriesKey}
      />

      {/* Placement: directly below the SPEND time series, above the LATENCY/BUDGET row -- see
          `pages-stories/overview.stories.tsx`'s equivalent comment for the full reasoning. Fed
          from the SAME usage query as `SpendDashboard` above -- one failed/loading query takes
          both down together, honestly, rather than one section looking wired and its sibling not. */}
      <SpendShareSection
        segments={screen.spendSegments}
        status={screen.spendStatus}
        errorMessage={screen.spendErrorMessage}
        onRetry={screen.spendRetry}
        selectedKey={screen.selectedSeriesKey}
        onSelectSegment={screen.setSelectedSeriesKey}
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
        />
      </div>
      {screen.refillErrorMessage ? (
        <ErrorLine message={`Refill request failed: ${screen.refillErrorMessage}`} />
      ) : null}
    </div>
  );
}
