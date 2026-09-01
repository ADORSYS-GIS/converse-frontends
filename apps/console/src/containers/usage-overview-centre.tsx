'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { ShareBar } from '@lightbridge/ui-web/src/components/share-bar';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { DATA_INK_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { ZoneHeading } from '@lightbridge/ui-web/src/lib/zone-heading';
import { MultiSeriesSpendBoard } from '@lightbridge/ui-web/src/sections/multi-series-spend-board';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';

import { USAGE_QUERY_LIMIT } from './overview-usage';
import { useUsageOverviewScreen } from './use-usage-overview-screen';

/**
 * `/settings/overview/usage` — the owner's cross-account estate overview (IA v3 phase 4, build
 * brief §4), the landing lens under "Overview." `use-usage-overview-screen.ts`'s own doc comment
 * covers the fan-out/ranking design and the filed backend gap behind the account cap.
 *
 * Zone order: `PageHeader` (range only — this screen has no project/user picker, it IS the
 * cross-account view) → stat row → SPEND OVER TIME (a `line` chart — dense, estate-wide data is
 * the one place a line reads honestly, per build brief §4) with the dashed previous-period
 * comparison → SPEND BY ACCOUNT → SPEND BY MODEL (`ShareBar` — the one place this primitive
 * stays, per build brief §4: "the global split 58/11/9/8/4 reads").
 *
 * **SPEND BY ACCOUNT renders through `MultiSeriesSpendBoard`/`MultiSeriesSpendChart` now**
 * (2026-08-31, owner ruling — see that component's own doc comment): one line per account, real
 * per-day points (`combineAccountModelResponses`'s own `accountSeries`, not just each account's
 * summed total), defaulting to a LINEAR scale. It had briefly rendered through `RankedSeriesRows`
 * with a value/delta sort toggle before that; the toggle is gone with it — a chart's rank/colour
 * order is always by total descending, never caller-sortable, so "sort by change" has no surface
 * left to render into. The board's own scale toggle (`linear`/`log`/`indexed`) replaced it on the
 * same heading row.
 */
export function UsageOverviewCentre() {
  const screen = useUsageOverviewScreen();

  const modelTotal = screen.modelSegments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Usage overview"
        subtitle={`Cross-account usage · ${screen.subtitle}`}
        controls={<DateRangeField {...screen.rangeField} layout="inline" hideLabel />}
      />

      {screen.truncationCaption ? <InlineStatus>{screen.truncationCaption}</InlineStatus> : null}

      <OverviewStatRow cards={screen.statCards} loading={screen.statCardsLoading} />

      <Card>
        {screen.status === 'error' ? (
          <ErrorLine
            message={screen.errorMessage ?? 'Failed to load the estate overview.'}
            onRetry={screen.onRetry}
          />
        ) : (
          <SpendDashboard
            label="Spend over time"
            series={screen.spendSeries}
            status={screen.spendStatus}
            fallbackWidth={840}
            height={220}
            formatYTick={formatUsdAxis}
            formatTooltipValue={formatUsd}
            formatLegendValue={(series) =>
              formatUsd(series.points.reduce((sum, point) => sum + point.y, 0))
            }
            onSelectSeries={screen.setSelectedSeriesKey}
          />
        )}
        {screen.spendTruncated ? (
          <InlineStatus className="mt-2">
            {`This range returned more points than one query can carry — showing the first ${USAGE_QUERY_LIMIT.toLocaleString()}.`}
          </InlineStatus>
        ) : null}
      </Card>

      <Card>
        <MultiSeriesSpendBoard
          label="Spend by account"
          series={screen.accountSeries}
          scale={screen.accountScale}
          onScaleChange={screen.setAccountScale}
          fallbackWidth={840}
          height={220}
          status={screen.status}
          errorMessage={screen.errorMessage ?? 'Failed to load spend by account.'}
          onRetry={screen.onRetry}
          onSelectSeries={screen.setSelectedSeriesKey}
          emptyMessage="No usage in this range."
        />
      </Card>

      <Card>
        <ZoneHeading
          label="Spend by model"
          trailing={
            modelTotal > 0 && screen.status === 'ready' ? (
              <span className={DATA_INK_CLASS}>{formatUsd(modelTotal)}</span>
            ) : undefined
          }
        />
        <ShareBar className="mt-4" segments={screen.status === 'ready' ? screen.modelSegments : []} />
      </Card>
    </div>
  );
}
