'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { DateRangeField } from '@lightbridge/ui-web/src/components/date-range-field';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SelectField } from '@lightbridge/ui-web/src/components/select-field';
import { formatUsd, formatUsdAxis } from '@lightbridge/ui-web/src/lib/money';
import { ZoneHeading } from '@lightbridge/ui-web/src/lib/zone-heading';
import { ApiKeysHygieneNotes } from '@lightbridge/ui-web/src/sections/api-keys-hygiene-notes';
import { BudgetPressure } from '@lightbridge/ui-web/src/sections/budget-pressure';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { SpendDashboard } from '@lightbridge/ui-web/src/sections/spend-dashboard';
import { RankedSeriesRows } from '@lightbridge/ui-web/src/sections/ranked-series-rows';
import { LatencyStatCards } from '@lightbridge/ui-web/src/sections/latency-stat-cards';
import { OverviewStatRow } from '@lightbridge/ui-web/src/sections/overview-stat-row';

import { USAGE_QUERY_LIMIT } from './overview-usage';
import { useSettingsOverviewScreen, type SettingsOverviewLens } from './use-settings-overview-screen';

/**
 * The shared composition behind all three `/settings/overview/{account,project,user}` lenses (IA
 * v3 phase 4, build brief §3) — `use-settings-overview-screen.ts`'s own doc comment explains what
 * "scope-parameterized" means; this container renders whatever that hook resolves for the given
 * `lens`, and is otherwise the only place these three routes' pages need to differ from each
 * other (they each pass a different literal).
 *
 * Zone order: `PageHeader` (range + the project lens' own picker) → the money-first stat row →
 * SPEND OVER TIME (bars, day-bucketed — build brief §3's "sparse data ... columns, gaps honest")
 * → SPEND BY MODEL (`RankedSeriesRows`) → the lens' own secondary breakdown (by project for the
 * account lens, by API key for the project lens, omitted for the user lens) → LATENCY BY MODEL →
 * account lens only: the cumulative budget burn-down; then, ADMIN-ONLY and purely additive:
 * project lens → BUDGET PRESSURE, account lens → KEY HYGIENE. Both MOVED here verbatim from `/`
 * (`overview-centre.tsx`, build brief §7 — "`/` becomes purely the account-scoped user
 * dashboard"): the queries behind them now live in `use-settings-overview-screen.ts`, gated
 * `lens === '<their lens>' && isAdmin`, firing no extra request for a non-admin or the wrong lens.
 */
function skeletonRows(count: number) {
  return (
    <div className="mt-4 flex flex-col gap-1">
      {Array.from({ length: count }, (_, row) => (
        <div key={row} className="skeleton h-[28px]" />
      ))}
    </div>
  );
}

export function SettingsOverviewCentre({ lens }: { lens: SettingsOverviewLens }) {
  const screen = useSettingsOverviewScreen(lens);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={screen.title}
        subtitle={screen.subtitle}
        controls={
          <div className="flex flex-wrap items-end gap-3">
            <DateRangeField {...screen.rangeField} layout="inline" hideLabel />
            {screen.projectField ? (
              <SelectField {...screen.projectField} layout="inline" hideLabel />
            ) : null}
          </div>
        }
      />

      {!screen.ready ? (
        <InlineStatus>
          {lens === 'project'
            ? 'Select a project above to see its usage.'
            : 'Resolving your identity…'}
        </InlineStatus>
      ) : (
        <>
          <OverviewStatRow cards={screen.statCards} loading={screen.statCardsLoading} />

          <Card>
            <SpendDashboard
              label="Spend over time"
              series={screen.spendSeries}
              status={screen.spendStatus}
              errorMessage={screen.spendErrorMessage}
              onRetry={screen.spendRetry}
              variant="bars"
              fallbackWidth={840}
              height={200}
              formatYTick={formatUsdAxis}
              formatTooltipValue={formatUsd}
              onSelectSeries={screen.setSelectedSeriesKey}
            />
            {screen.spendTruncated ? (
              <InlineStatus className="mt-2">
                {`This range returned more points than one query can carry — showing the first ${USAGE_QUERY_LIMIT.toLocaleString()}.`}
              </InlineStatus>
            ) : null}
          </Card>

          <Card>
            <ZoneHeading label="Spend by model" />
            {screen.modelRowsStatus === 'error' ? (
              <div className="mt-4">
                <ErrorLine
                  message={screen.modelRowsErrorMessage ?? 'Failed to load spend by model.'}
                  onRetry={screen.modelRowsRetry}
                />
              </div>
            ) : screen.modelRowsStatus === 'loading' ? (
              skeletonRows(4)
            ) : (
              <RankedSeriesRows
                className="mt-4"
                rows={screen.modelRows}
                selectedKey={screen.selectedSeriesKey}
                onSelect={screen.setSelectedSeriesKey}
                otherLabel={(count) => `Other (${count} models)`}
                emptyMessage="No usage in this range."
              />
            )}
          </Card>

          {screen.secondary ? (
            <Card>
              <ZoneHeading label={screen.secondary.label} />
              {screen.secondary.status === 'error' ? (
                <div className="mt-4">
                  <ErrorLine
                    message={screen.secondary.errorMessage ?? 'Failed to load this breakdown.'}
                    onRetry={screen.secondary.onRetry}
                  />
                </div>
              ) : screen.secondary.status === 'loading' ? (
                skeletonRows(3)
              ) : screen.secondary.gatedMessage ? (
                <InlineStatus className="mt-4">{screen.secondary.gatedMessage}</InlineStatus>
              ) : (
                <>
                  <RankedSeriesRows
                    className="mt-4"
                    rows={screen.secondary.rows}
                    otherLabel={(count) =>
                      `Other (${count} ${lens === 'account' ? 'projects' : 'keys'})`
                    }
                    emptyMessage="No usage in this range."
                  />
                  {screen.secondary.unassignedCaption ? (
                    <InlineStatus className="mt-2">{screen.secondary.unassignedCaption}</InlineStatus>
                  ) : null}
                </>
              )}
            </Card>
          ) : null}

          <Card title="Latency by model">
            {screen.latencyStatus === 'error' ? (
              <ErrorLine message="Failed to load latency." />
            ) : screen.latencyStatus === 'loading' ? (
              skeletonRows(4)
            ) : (
              <LatencyStatCards rows={screen.latencyRows} />
            )}
          </Card>

          {screen.burnDown ? (
            <Card>
              <SpendDashboard
                label="Budget burn-down this period"
                series={screen.burnDown.series}
                status={screen.burnDown.status}
                cumulative
                ceiling={screen.burnDown.ceiling ?? undefined}
                fallbackWidth={840}
                height={200}
                formatYTick={formatUsdAxis}
                formatTooltipValue={formatUsd}
              />
            </Card>
          ) : null}

          {/* ── admin-only, purely additive — MOVED from `/` (see this file's own doc comment) ── */}
          {screen.adminPressure ? (
            <Card>
              <BudgetPressure
                label="Budget pressure"
                projects={screen.adminPressure.projects}
                ceiling={screen.adminPressure.ceiling}
                status={screen.adminPressure.status}
                errorMessage={screen.adminPressure.errorMessage}
                onRetry={screen.adminPressure.onRetry}
                note={screen.adminPressure.note}
              />
            </Card>
          ) : null}

          {screen.adminHygiene ? (
            <Card title="Key hygiene">
              <InlineStatus>{screen.adminHygiene.summary}</InlineStatus>
              <ApiKeysHygieneNotes className="mt-3" hygiene={screen.adminHygiene.hygiene} />
              {screen.adminHygiene.caveat ? (
                <InlineStatus className="mt-2">{screen.adminHygiene.caveat}</InlineStatus>
              ) : null}
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
