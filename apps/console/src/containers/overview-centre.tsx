'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { ReportExportDialog } from '@lightbridge/ui-web/src/components/report-export-dialog';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { OverviewControls } from '@lightbridge/ui-web/src/sections/overview-controls';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { RankedSeriesRows } from '@lightbridge/ui-web/src/sections/ranked-series-rows';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { SpendShareSection } from '@lightbridge/ui-web/src/sections/spend-share';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { ZoneHeading } from '@lightbridge/ui-web/src/lib/zone-heading';
import Link from 'next/link';

import { OverviewScopeSlot } from './overview-scope-slot';
import { useOverviewScreen } from './use-overview-screen';

/**
 * `/` — the account-scoped user dashboard (IA v3 phase 4, build brief §7: "`/` becomes purely the
 * account-scoped user dashboard — that is the point of the phase"). This route supplies no
 * `@rail`/`@scope` slot at any tier — the shell is mounted once by `app/(console)/layout.tsx`.
 *
 * Composition, top to bottom: `PageHeader` (controls + the `Export` action) → the money-first stat
 * row → SPEND OVER TIME → SPEND BY PROJECT → SPEND BY MODEL → BUDGET — real for every signed-in
 * user, admin or not. **No admin-only zone renders here any more**: BUDGET PRESSURE moved to
 * `/settings/overview/project` and KEY HYGIENE to `/settings/overview/account`
 * (`settings-overview-centre.tsx`, `use-settings-overview-screen.ts`'s own `adminPressure`/
 * `adminHygiene`) — the pending-refill count that used to sit beside them is gone outright, not
 * moved, since it already lives in the settings nav's own numeral. `/admin` was already, before
 * this move, just the refill-review queue.
 *
 * LATENCY is gone (phase 9.2, 2026-08-30 owner directive): the usage backend's events are
 * aggregate metric signals with no per-request duration, so that panel could never fill. SPEND BY
 * MODEL replaces it — a second, model-grouped consumption query scoped identically to SPEND above
 * (`use-overview-screen.ts`'s `modelSpendRows`), for every user, not admin-gated.
 *
 * IA v3 phase 4 (build brief §7): SPEND BY MODEL renders through `RankedSeriesRows`, not
 * `SpendShareSection`/`ShareBar` — the phase's own measurement found `ShareBar`'s flat
 * share-of-total reading breaks down the moment one series dominates (a single model handling
 * ~all of an account's traffic is the common case), which `RankedSeriesRows` handles by
 * suppressing the share bar past a dominance threshold. SPEND BY PROJECT keeps `SpendShareSection`
 * (a project split reads fine as a flat share) and drops any NULL-project bucket in favour of
 * `spendUnassignedCaption` rather than rendering an "Unassigned" segment.
 *
 * `Card` wraps every zone below the stat row (phase 4 supersedes the earlier "render uncontained
 * on the floor" reading for these dashboard zones specifically — see `Card`'s own doc comment for
 * the precedent). Several sections already render their own tracked heading (`SpendDashboard`,
 * `SpendShareSection`, `BudgetPanel` all default their own `label`); those `Card`s carry no
 * `title` of their own; only the section's `label` is overridden to the name this composition
 * wants, so each zone has exactly ONE heading, never two stacked.
 */
const formatSpendTooltip = (value: number) => formatUsd(value);

export function OverviewCentre() {
  const screen = useOverviewScreen(<OverviewScopeSlot />);

  const spendTotal = screen.spendSegments.reduce(
    (sum: number, segment) => sum + segment.value,
    0
  );
  const subtitle = screen.scopeAccountLabel
    ? `${screen.scopeAccountLabel} · ${screen.scopeProjectLabel} · ${screen.subline}`
    : undefined;
  // Narrowed to a local so the `render` prop below doesn't lose `screen.refillAction`'s
  // definedness across the closure boundary (TypeScript's property-access narrowing does not
  // survive into a nested function).
  const refillAction = screen.refillAction;

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
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => screen.report.onOpenChange(true)}>
            Export
          </Button>
        }
      />

      <OverviewStatRow cards={screen.statCards} loading={screen.statCardsLoading} />

      <ReportExportDialog {...screen.report} />

      <Card>
        <SpendDashboard
          label="Spend over time"
          series={screen.spendSeries}
          status={screen.spendStatus}
          errorMessage={screen.spendErrorMessage}
          onRetry={screen.spendRetry}
          degenerateMessage={screen.spendDegenerateMessage}
          fallbackWidth={840}
          height={220}
          formatYTick={formatUsdAxis}
          formatTooltipValue={formatSpendTooltip}
          formatLegendValue={(series) =>
            formatUsd(series.points.reduce((sum, point) => sum + point.y, 0))
          }
          onSelectSeries={screen.setSelectedSeriesKey}
        />
      </Card>

      <Card>
        <SpendShareSection
          label="Spend by project"
          segments={screen.spendSegments}
          status={screen.spendStatus}
          errorMessage={screen.spendErrorMessage}
          onRetry={screen.spendRetry}
          selectedKey={screen.selectedSeriesKey}
          onSelectSegment={screen.setSelectedSeriesKey}
          total={spendTotal > 0 ? formatUsd(spendTotal) : undefined}
        />
        {screen.spendUnassignedCaption ? (
          <InlineStatus className="mt-2">{screen.spendUnassignedCaption}</InlineStatus>
        ) : null}
      </Card>

      <Card>
        <ZoneHeading label="Spend by model" />
        {screen.modelSpendStatus === 'error' ? (
          <div className="mt-4">
            <ErrorLine
              message={screen.modelSpendErrorMessage ?? 'Failed to load spend by model.'}
              onRetry={screen.modelSpendRetry}
            />
          </div>
        ) : screen.modelSpendStatus === 'loading' ? (
          <div className="mt-4 flex flex-col gap-1">
            {[0, 1, 2].map((row) => (
              <div key={row} className="skeleton h-[28px]" />
            ))}
          </div>
        ) : (
          <RankedSeriesRows
            className="mt-4"
            rows={screen.modelSpendRows}
            selectedKey={screen.selectedSeriesKey}
            onSelect={screen.setSelectedSeriesKey}
            otherLabel={(count) => `Other (${count} models)`}
            emptyMessage="No usage in this range."
          />
        )}
      </Card>

      <Card>
        <BudgetPanel
          className="w-full"
          label="Budget"
          budget={screen.budget}
          actions={
            <Button
              variant="secondary"
              size="sm"
              nativeButton={false}
              render={<Link href={screen.refillHref} />}>
              Request refill…
            </Button>
          }
          heroAction={
            refillAction ? (
              <Button
                variant="primary"
                size="sm"
                nativeButton={false}
                render={<Link href={refillAction.href} />}>
                {refillAction.label}
              </Button>
            ) : undefined
          }
        />
      </Card>
    </div>
  );
}
