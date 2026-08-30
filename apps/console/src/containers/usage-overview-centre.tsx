'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SegmentedControl } from '@lightbridge/ui-web/src/components/segmented-control';
import { ShareBar } from '@lightbridge/ui-web/src/components/share-bar';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { DATA_INK_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { ZoneHeading } from '@lightbridge/ui-web/src/lib/zone-heading';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { RankedSeriesRows } from '@lightbridge/ui-web/src/sections/ranked-series-rows';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';

import { useUsageOverviewScreen } from './use-usage-overview-screen';

/**
 * `/settings/overview/usage` — the owner's cross-account estate overview (IA v3 phase 4, build
 * brief §4), the landing lens under "Overview." `use-usage-overview-screen.ts`'s own doc comment
 * covers the fan-out/ranking design and the filed backend gap behind the account cap.
 *
 * Zone order: `PageHeader` (range only — this screen has no project/user picker, it IS the
 * cross-account view) → stat row → SPEND OVER TIME (a `line` chart — dense, estate-wide data is
 * the one place a line reads honestly, per build brief §4) with the dashed previous-period
 * comparison → SPEND BY ACCOUNT (`RankedSeriesRows`, with the value/delta sort toggle) → SPEND BY
 * MODEL (`ShareBar` — the one place this primitive stays, per build brief §4: "the global split
 * 58/11/9/8/4 reads").
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
      </Card>

      <Card>
        <ZoneHeading
          label="Spend by account"
          actions={
            <SegmentedControl
              aria-label="Sort accounts by"
              options={[
                { value: 'value', label: 'By spend' },
                { value: 'delta', label: 'By change' },
              ]}
              value={screen.accountRowsSortMode}
              onChange={screen.setAccountRowsSortMode}
            />
          }
        />
        {screen.status === 'error' ? (
          <div className="mt-4">
            <ErrorLine
              message={screen.errorMessage ?? 'Failed to load spend by account.'}
              onRetry={screen.onRetry}
            />
          </div>
        ) : screen.status === 'loading' ? (
          <div className="mt-4 flex flex-col gap-1">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="skeleton h-[28px]" />
            ))}
          </div>
        ) : (
          <RankedSeriesRows
            className="mt-4"
            rows={screen.accountRows}
            sortMode={screen.accountRowsSortMode}
            selectedKey={screen.selectedSeriesKey}
            onSelect={screen.setSelectedSeriesKey}
            otherLabel={(count) => `Other (${count} accounts)`}
            emptyMessage="No usage in this range."
          />
        )}
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
