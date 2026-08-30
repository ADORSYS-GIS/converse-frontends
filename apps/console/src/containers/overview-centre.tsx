'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { OverviewControls } from '@lightbridge/ui-web/src/sections/overview-controls';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { SpendShareSection } from '@lightbridge/ui-web/src/sections/spend-share';

import { useOverviewScreen } from './use-overview-screen';

/**
 * `/` — the Overview centre column, which since the owner review of 2026-08-29 is the WHOLE
 * screen: this route supplies no `@rail` and no `@scope` slot content at any tier.
 *
 * The shell is NOT here: it is mounted once by `app/(console)/layout.tsx`. This composes the
 * centre's sections. The screen's parameters live in the LEFT rail (`@scope`).
 *
 * There is no longer a rail/sheet pair to keep in sync — the controls are mounted once, visible at
 * every tier — but the values still live in the query string (ADR 0011), so a configured dashboard
 * stays a link you can send.
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

  const spendTotal = screen.spendSegments.reduce((sum, segment) => sum + segment.value, 0);
  const subtitle = screen.scopeAccountLabel
    ? `${screen.scopeAccountLabel} · ${screen.scopeProjectLabel} · ${screen.subline}`
    : undefined;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        subtitle={subtitle}
        controls={
          <OverviewControls
            rangeField={screen.rangeField}
            bucketField={screen.bucketField}
            groupByField={screen.groupByField}
            projectField={screen.projectField}
          />
        }
      />

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
        total={spendTotal > 0 ? formatUsd(spendTotal) : undefined}
      />

      {/* Latency is gone from Overview (owner, 2026-08-29): this is a per-USER dashboard — what
          I spend, what I have left, what keys I hold. Per-bucket p95 by model is an operator's
          metric; it answers a question nobody reading this screen is asking. `LatencyDashboard`
          and `LatencyRidgeline` stay in the library for a future ops screen. */}
      <BudgetPanel
        className="w-full"
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
      {screen.refillErrorMessage ? (
        <ErrorLine message={`Refill request failed: ${screen.refillErrorMessage}`} />
      ) : null}
    </div>
  );
}
