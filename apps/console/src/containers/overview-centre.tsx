'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { ReportExportDialog } from '@lightbridge/ui-web/src/components/report-export-dialog';
import { BudgetPanel } from '@lightbridge/ui-web/src/sections/budget-panel';
import { MultiSeriesSpendBoard } from '@lightbridge/ui-web/src/sections/multi-series-spend-board';
import { OverviewControls } from '@lightbridge/ui-web/src/sections/overview-controls';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { SpendShareSection } from '@lightbridge/ui-web/src/sections/spend-share';

import { USAGE_QUERY_LIMIT } from './overview-usage';
import { OverviewScopeSlot } from './overview-scope-slot';
import { useOverviewScreen } from './use-overview-screen';

/**
 * `/` — the account-scoped user dashboard (IA v3 phase 4, build brief §7: "`/` becomes purely the
 * account-scoped user dashboard — that is the point of the phase"). This route supplies no
 * `@rail`/`@scope` slot at any tier — the shell is mounted once by `app/(console)/layout.tsx`.
 *
 * Composition, top to bottom: `PageHeader` (controls + the `Export` action) → the money-first stat
 * row → SPEND OVER TIME → SPEND BY PROJECT → SPEND BY MODEL → BUDGET — real for every signed-in
 * user, admin or not.
 *
 * **SPEND OVER TIME plots the account's UNGROUPED total** (2026-08-31 owner-round parity fix,
 * finding #1 — "why is the 'Spend over time' in the settings and on the home page different?...
 * They should normally be exactly the same, right?"): it used to plot one line PER PROJECT while
 * silently dropping every unassigned-spend point (often 88-99% of real spend), drawing a
 * completely different curve than the estate overview's own summed total for the same account.
 * `screen.spendSeries` is now `[account total, dashed previous period]` — the SAME summing
 * semantics `/settings/overview/usage` already uses — and the per-project/model split lives on in
 * SPEND BY PROJECT alone (`screen.spendSegments`, its own independently-queried `spendShareStatus`
 * now that chart and share bar no longer share one grouped query). **No admin-only zone renders here any more**: BUDGET PRESSURE moved to
 * `/settings/overview/project` and KEY HYGIENE to `/settings/overview/account`
 * (`settings-overview-centre.tsx`, `use-settings-overview-screen.ts`'s own `adminPressure`/
 * `adminHygiene`) — the pending-refill count that used to sit beside them is gone outright, not
 * moved, since it already lives in the settings nav's own numeral. `/admin` was already, before
 * this move, just the refill-review queue.
 *
 * LATENCY is gone (phase 9.2, 2026-08-30 owner directive): the usage backend's events are
 * aggregate metric signals with no per-request duration, so that panel could never fill. SPEND BY
 * MODEL replaces it — a second, model-grouped consumption query scoped identically to SPEND above
 * (`use-overview-screen.ts`'s `modelSpendSeries`), for every user, not admin-gated.
 *
 * **SPEND BY MODEL renders through `MultiSeriesSpendBoard`/`MultiSeriesSpendChart` now**
 * (2026-08-31, owner ruling — see that component's own doc comment): one line per model,
 * superposed on shared axes, defaulting to a LOG scale (`screen.modelSpendScale`'s own default —
 * the owner's real account data is one ~100%-share model beside several sub-1%-share ones, and log
 * was the reviewed recommendation for that shape). It had briefly rendered through
 * `RankedSeriesRows` (IA v3 phase 4, build brief §7) before that, replacing `SpendShareSection`/
 * `ShareBar`'s flat share-of-total reading, which the phase's own measurement found breaks down
 * the moment one series dominates — `RankedSeriesRows`'s dominance-threshold share-bar suppression
 * addressed the same problem `MultiSeriesSpendChart`'s `log`/`indexed` scales now address more
 * directly, by keeping every series visibly plotted rather than suppressing a bar. SPEND BY
 * PROJECT keeps `SpendShareSection` (a project split reads fine as a flat share) and drops any
 * NULL-project bucket in favour of `spendUnassignedCaption` rather than rendering an "Unassigned"
 * segment.
 *
 * `Card` wraps every zone below the stat row (phase 4 supersedes the earlier "render uncontained
 * on the floor" reading for these dashboard zones specifically — see `Card`'s own doc comment for
 * the precedent). Several sections already render their own tracked heading (`SpendDashboard`,
 * `SpendShareSection`, `BudgetPanel`, `MultiSeriesSpendBoard` all default their own `label`); those
 * `Card`s carry no `title` of their own; only the section's `label` is overridden to the name this
 * composition wants, so each zone has exactly ONE heading, never two stacked.
 *
 * **BUDGET carries no refill entry point of any kind here any more** (owner review round 2,
 * 2026-08-31, converse-frontends#368 finding #3, verbatim): "Remove the 'request refill' from
 * overview at /accounts/<account-id>/overview and keep it ONLY inside
 * /settings/accounts/<account-id>." Both the standing header "Request refill…" action
 * (`BudgetPanel.actions`) and the breach-only inline CTA beside the numeral
 * (`BudgetPanel.heroAction`) are gone — `BudgetPanel` renders with `budget` alone. The one
 * remaining entry point is `/settings/accounts/<id>/request-refill`
 * (`settings-accounts.stories.tsx`/`account-detail-centre.tsx`), which already had it. Everything
 * that only existed to compute an href/CTA for this screen (`refillHref`, `refillAction`, the
 * breach ladder lookup) is deleted from `use-overview-screen.ts` along with it — see that module's
 * own doc comment.
 */
const formatSpendTooltip = (value: number) => formatUsd(value);

export function OverviewCentre() {
  const screen = useOverviewScreen(<OverviewScopeSlot />);

  const spendTotal = screen.spendSegments.reduce((sum: number, segment) => sum + segment.value, 0);
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
          fallbackWidth={840}
          height={220}
          formatYTick={formatUsdAxis}
          formatTooltipValue={formatSpendTooltip}
          formatLegendValue={(series) =>
            formatUsd(series.points.reduce((sum, point) => sum + point.y, 0))
          }
          onSelectSeries={screen.setSelectedSeriesKey}
        />
        {screen.spendTruncated ? (
          <InlineStatus className="mt-2">
            {`This range returned more points than one query can carry — showing the first ${USAGE_QUERY_LIMIT.toLocaleString()}.`}
          </InlineStatus>
        ) : null}
      </Card>

      <Card>
        <SpendShareSection
          label="Spend by project"
          segments={screen.spendSegments}
          status={screen.spendShareStatus}
          errorMessage={screen.spendShareErrorMessage}
          onRetry={screen.spendShareRetry}
          selectedKey={screen.selectedSeriesKey}
          onSelectSegment={screen.setSelectedSeriesKey}
          total={spendTotal > 0 ? formatUsd(spendTotal) : undefined}
          degenerateMessage={screen.spendDegenerateMessage}
        />
        {screen.spendUnassignedCaption ? (
          <InlineStatus className="mt-2">{screen.spendUnassignedCaption}</InlineStatus>
        ) : null}
      </Card>

      <Card>
        <MultiSeriesSpendBoard
          label="Spend by model"
          series={screen.modelSpendSeries}
          scale={screen.modelSpendScale}
          onScaleChange={screen.setModelSpendScale}
          fallbackWidth={840}
          height={220}
          status={screen.modelSpendStatus}
          errorMessage={screen.modelSpendErrorMessage}
          onRetry={screen.modelSpendRetry}
          onSelectSeries={screen.setSelectedSeriesKey}
          emptyMessage="No usage in this range."
        />
      </Card>

      <Card>
        <BudgetPanel
          className="w-full"
          label="Budget"
          budget={screen.budget}
          nextReset={screen.nextReset}
        />
      </Card>
    </div>
  );
}
