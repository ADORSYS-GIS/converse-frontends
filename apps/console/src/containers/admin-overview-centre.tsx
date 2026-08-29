'use client';

import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { formatMsAxis } from '@lightbridge/ui-web/src/lib/duration';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { LABEL_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { ApiKeysHygieneNotes } from '@lightbridge/ui-web/src/sections/api-keys-hygiene-notes';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { BudgetPressure } from '@lightbridge/ui-web/src/sections/budget-pressure';
import { LatencyDashboard } from '@lightbridge/ui-web/src/sections/latency-dashboard';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { SpendShareSection } from '@lightbridge/ui-web/src/sections/spend-share';

import { useAdminSectionParam } from '../client/url-state';
import { useAdminOverviewScreen } from './use-admin-overview-screen';

/**
 * `/admin?section=overview` — the admin overview's centre column: the operator's dashboard for the
 * whole account, as opposed to `/`, which is a dashboard per user.
 *
 * The shell is NOT here — it is mounted once by `app/(console)/layout.tsx`. This composes sections
 * that already exist (`OverviewStatRow`, `SpendDashboard`, `SpendShareSection`,
 * `LatencyDashboard`, `BudgetPanel`, `ApiKeysHygieneNotes`); the only new one is `BudgetPressure`,
 * because ranking projects by their draw on the account ceiling had no section to reuse.
 *
 * **This screen has no right rail**, and the layout is told so: its content does not retarget on a
 * selection, so by the console-ui rail rule its parameters belong in the left rail's secondary
 * section (`admin-sub-nav.tsx`), beside the sub-nav that switches to the review queue.
 */

// Every spend figure here is USD and goes through `lib/money`'s adaptive-precision ladder — the
// chart primitives are deliberately unit-blind (the same `LatencyDashboard` below renders `ms`
// through the same props), so the unit is supplied at the one place that knows these series are
// money. Same three formatters `OverviewCentre` passes, for the same reason.
const formatSpendTooltip = (value: number) => formatUsd(value);

export function AdminOverviewCentre() {
  const screen = useAdminOverviewScreen();
  const [, setSection] = useAdminSectionParam();

  return (
    <div className="flex flex-col gap-8">
      <ScreenHeading title="Admin overview" subline={screen.subline} />

      <OverviewStatRow cards={screen.statCards} loading={screen.statCardsLoading} />

      {/* Spend across EVERY project, never only the scoped one — the account-wide query in
          `use-admin-overview-screen.ts` passes `projectId: null` by construction. */}
      <SpendDashboard
        label={screen.spendLabel}
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
      />

      <SpendShareSection
        label={screen.spendShareLabel}
        segments={screen.spendSegments}
        status={screen.spendStatus}
        errorMessage={screen.spendErrorMessage}
        onRetry={screen.spendRetry}
        selectedKey={screen.selectedSeriesKey}
        onSelectSegment={screen.setSelectedSeriesKey}
        total={screen.spendTotal}
      />

      {/* Latency lives HERE, not on `/` (owner, 2026-08-29): per-bucket p95 by model is an
          operator's metric. It runs off the same usage query the two spend sections above use —
          never a third request — so a failed query takes all three down together rather than
          leaving one looking wired and its siblings not. `latencyFootnote` is the per-series
          honesty contract: a group that reported no samples stays in the ridgeline and is NAMED
          below it, rather than being dropped or given a fabricated shape. */}
      <LatencyDashboard
        series={screen.latencySeries}
        status={screen.latencyStatus}
        errorMessage={screen.latencyErrorMessage}
        onRetry={screen.latencyRetry}
        footnote={screen.latencyFootnote}
        fallbackWidth={840}
        height={310}
        formatXTick={formatMsAxis}
      />

      {/* `lg:basis-*` are the 1440-reference widths (528 + 320 + 24px gap = the centre's 872px);
          `lg:flex-1 lg:min-w-0` lets both columns scale down together instead of overflowing. */}
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
        <BudgetPressure
          className="w-full lg:min-w-0 lg:flex-1 lg:basis-[528px]"
          projects={screen.pressure.projects}
          ceiling={screen.pressure.ceiling}
          status={screen.pressure.status}
          errorMessage={screen.pressure.errorMessage}
          onRetry={screen.pressure.onRetry}
          note={screen.pressure.note}
        />
        <BudgetPanel
          className="w-full lg:min-w-0 lg:flex-1 lg:basis-[320px]"
          budget={screen.budget}
          // No `needsAttentionProject`: that slot carries a project-scoped `Request refill`
          // control, and an operator reviewing an account is not the principal who would request
          // one. The per-project picture is `BudgetPressure` beside it, which has no dead control.
          refillRequestStatus={screen.refillRequestStatus}
          onReviewInAdmin={() => void setSection('refills')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={LABEL_CLASS}>Key hygiene — every project in this account</span>
        <InlineStatus>{screen.hygieneSummary}</InlineStatus>
        <ApiKeysHygieneNotes hygiene={screen.hygiene} />
        {/* A partial count says so rather than reading as a complete one. */}
        {screen.hygieneCaveat ? <InlineStatus>{screen.hygieneCaveat}</InlineStatus> : null}
      </div>
    </div>
  );
}
