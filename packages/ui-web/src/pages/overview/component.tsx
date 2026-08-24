import React, { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { SPEC_GRID } from '../../chart-tokens';
import { cn } from '../../cn';
import { BottomSheet } from '../../components/bottom-sheet';
import { Button } from '../../components/button';
import { ChartLegend } from '../../components/chart-legend';
import type { ChartLegendItem } from '../../components/chart-legend';
import { ConsoleHeader } from '../../components/console-header';
import { ConsoleShell } from '../../components/console-shell';
import { ErrorLine } from '../../components/error-line';
import { fieldControlVariants, fieldLabelClassName } from '../../components/field/cva';
import { InlineStatus } from '../../components/inline-status';
import { LatencyRidgeline } from '../../components/latency-ridgeline';
import { Meter } from '../../components/meter';
import { NavSpine } from '../../components/nav-spine';
import { RailPanel } from '../../components/rail-panel';
import { SkeletonMetric } from '../../components/skeleton-metric';
import { Sparkline } from '../../components/sparkline';
import { SpendSeriesChart } from '../../components/spend-series-chart';
import { BudgetHero } from '../../components/budget-hero';
import { StatCard } from '../../components/stat-card';
import { formatMoneyOf } from '../../lib/money';
import type {
  OverviewPageProps,
  OverviewSelectField,
  OverviewStatCardIcon,
} from './types';

const SECTION_LABEL = 'font-mono text-[10px] uppercase tracking-[.09em] text-subtle';
const DASHBOARD_LABEL = 'font-mono text-[11px] uppercase tracking-[.09em] text-subtle';

// 12px structural line glyphs (console-ui skill: "structural, not decorative"). One per
// `OverviewStatCardIcon` -- kept out of `fixtures.ts` so that file stays plain data.
const STAT_ICONS: Record<OverviewStatCardIcon, ReactNode> = {
  spend: (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M1 11 L5 3 L9 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  projects: (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <rect x="1.5" y="1.5" width="9" height="9" rx="1" />
    </svg>
  ),
  keys: (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M1 7 h6 M5 7 a3 3 0 1 0 0 -0.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  requests: (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M1 8 l2 -5 l2 4 l2 -6 l2 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// A controlled native `<select>` styled to the `Field` control treatment (README §4 lists no
// dedicated "Select" primitive -- `ScopeSelect` follows the same native-select-plus-styling
// pattern for its own two dropdowns).
function RailSelect({ label, value, options, onChange }: OverviewSelectField) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={fieldLabelClassName}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            fieldControlVariants({ error: false, multiline: false }),
            'appearance-none pr-7',
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 8 8"
          className="pointer-events-none absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 stroke-subtle"
          fill="none"
          strokeWidth="1.4"
        >
          <path d="M1 3l3 3 3-3" />
        </svg>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-[2px] bg-surface p-4" role="presentation" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <span className="h-3 w-3 rounded-[1px] bg-raised" />
          <span className="h-[10px] w-24 rounded-[2px] bg-raised" />
        </div>
        <span className="h-[20px] w-20 rounded-[2px] bg-raised" />
      </div>
      <div className="mt-3">
        <SkeletonMetric width={72} />
      </div>
      <div className="mt-2 h-[10px] w-28 rounded-[2px] bg-raised" />
    </div>
  );
}

// Loading-skeleton geometry for the SPEND chart, matching the exact frame the chart itself
// computes: `DEFAULT_CHART_MARGIN` overridden with `left: 52` (`SpendSeriesChart`'s own margin),
// documented as this page's job in `spend-series-chart`'s own `LoadingSkeletonGeometryNote` story.
function SpendChartSkeleton({ width, height }: { width: number; height: number }) {
  const margin = { top: 12, right: 12, bottom: 28, left: 52 };
  const plotWidth = Math.max(width - margin.left - margin.right, 0);
  const plotHeight = Math.max(height - margin.top - margin.bottom, 0);
  const barCount = 8;
  const gap = 14;
  const barWidth = (plotWidth - gap * (barCount - 1)) / barCount;
  return (
    <svg width={width} height={height} role="presentation" aria-hidden="true">
      {Array.from({ length: barCount }, (_, index) => {
        const barHeight = plotHeight * (0.35 + 0.5 * ((index % 3) / 2));
        return (
          <rect
            key={index}
            x={margin.left + index * (barWidth + gap)}
            y={margin.top + plotHeight - barHeight}
            width={Math.max(barWidth, 1)}
            height={barHeight}
            rx={2}
            fill={SPEC_GRID}
          />
        );
      })}
    </svg>
  );
}

// Loading-skeleton geometry for the LATENCY ridgeline, matching `LatencyRidgeline`'s own margin
// (`left: 108` for the row labels), documented in that chart's own `LoadingSkeletonGeometryNote`.
function LatencyChartSkeleton({ width, height }: { width: number; height: number }) {
  const margin = { top: 16, right: 12, bottom: 28, left: 108 };
  const plotWidth = Math.max(width - margin.left - margin.right, 0);
  const plotHeight = Math.max(height - margin.top - margin.bottom, 0);
  const rowCount = 4;
  const rowHeight = plotHeight / rowCount;
  return (
    <svg width={width} height={height} role="presentation" aria-hidden="true">
      {Array.from({ length: rowCount }, (_, index) => (
        <rect
          key={index}
          x={margin.left}
          y={margin.top + index * rowHeight + 6}
          width={plotWidth}
          height={Math.max(rowHeight - 12, 0)}
          rx={2}
          fill={SPEC_GRID}
        />
      ))}
    </svg>
  );
}

// Contract: docs/design/console-redesign/README.md §5.1 (Overview) + console-ui skill "Page
// views" section -- a pure presentational full screen. All data arrives via typed props, every
// interaction is a callback prop; no fetching, no routing (apps/console wires data in later).
export function OverviewPage({
  tier,
  logoSrc,
  logoAlt,
  wordmark,
  orgName,
  userEmail,
  userInitials,
  navItems,
  adminNavItems,
  showAdmin,
  scopeAccountLabel,
  scopeProjectLabel,
  pageTitle = 'Overview',
  scopeSubline,
  emptyMessage,
  statCards,
  statCardsLoading = false,
  spendSeries,
  spendChartWidth,
  spendChartHeight,
  spendStatus = 'ready',
  spendErrorMessage,
  onRetrySpend,
  selectedSeriesKey = null,
  onSelectSeries,
  formatSpendLegendValue,
  formatSpendXTick,
  formatSpendYTick,
  formatSpendTooltipValue,
  latencySeries,
  latencyChartWidth,
  latencyChartHeight,
  latencyStatus = 'ready',
  latencyErrorMessage,
  onRetryLatency,
  onSelectLatencySeries,
  formatLatencyXTick,
  budget,
  needsAttentionProject,
  onRequestRefill,
  refillRequestStatus,
  onReviewInAdmin,
  rangeField,
  bucketField,
  groupByField,
  accountFilterField,
  projectFilterField,
  modelFilterField,
  onExportView,
  exportLabel,
  exportCaption,
  className,
}: OverviewPageProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const isFull = tier === 'full';

  const seriesLegendItems: ChartLegendItem[] = useMemo(
    () =>
      spendSeries.map((series) => ({
        key: series.key,
        label: series.label,
        value: formatSpendLegendValue?.(series),
        breached: series.breached,
      })),
    [spendSeries, formatSpendLegendValue],
  );

  const header = (
    <ConsoleHeader
      logoSrc={logoSrc}
      logoAlt={logoAlt}
      wordmark={wordmark}
      orgSwitcher={<span className="font-mono text-xs text-soft">{orgName}</span>}
      identity={
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-subtle">{userEmail}</span>
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[2px] bg-raised font-mono text-[10px] text-soft">
            {userInitials}
          </span>
        </div>
      }
    />
  );

  const leftRail = (
    <>
      <RailPanel>
        <NavSpine items={navItems} adminItems={adminNavItems} showAdmin={showAdmin} />
      </RailPanel>
      <RailPanel label="SCOPE">
        <div className="space-y-3">
          <div>
            <div className="font-mono text-[10px] text-subtle">Account</div>
            <div className="font-mono text-xs text-ink">{scopeAccountLabel}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-subtle">Project</div>
            <div className="font-mono text-xs text-ink">{scopeProjectLabel}</div>
          </div>
        </div>
      </RailPanel>
    </>
  );

  const rightRailBody = (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4" aria-label="View">
        <div className={SECTION_LABEL}>VIEW</div>
        <RailSelect {...rangeField} />
        <RailSelect {...bucketField} />
        <RailSelect {...groupByField} />
      </section>

      <div aria-hidden="true" className="border-t border-border" />

      <section className="flex flex-col gap-4" aria-label="Filters">
        <div className={SECTION_LABEL}>FILTERS</div>
        <RailSelect {...accountFilterField} />
        <RailSelect {...projectFilterField} />
        <RailSelect {...modelFilterField} />
      </section>

      <div aria-hidden="true" className="border-t border-border" />

      <section className="flex flex-col gap-3" aria-label="Series">
        <div className={SECTION_LABEL}>SERIES</div>
        <ChartLegend items={seriesLegendItems} selectedKey={selectedSeriesKey} onSelectKey={onSelectSeries} />
      </section>

      <div aria-hidden="true" className="border-t border-border" />

      <section className="flex flex-col gap-2" aria-label="Export">
        <div className={SECTION_LABEL}>EXPORT</div>
        <Button type="button" variant="secondary" className="w-full" onClick={onExportView}>
          {exportLabel ?? 'Export current view · CSV'}
        </Button>
        {exportCaption ? <p className="font-sans text-[10px] text-subtle">{exportCaption}</p> : null}
      </section>
    </div>
  );

  const rangeOptionLabel = rangeField.options.find((o) => o.value === rangeField.value)?.label ?? rangeField.value;
  const bucketOptionLabel = bucketField.options.find((o) => o.value === bucketField.value)?.label ?? bucketField.value;
  const groupByOptionLabel =
    groupByField.options.find((o) => o.value === groupByField.value)?.label ?? groupByField.value;

  return (
    <div className="relative">
      <ConsoleShell
        tier={tier}
        header={header}
        leftRail={leftRail}
        rightRail={<RailPanel>{rightRailBody}</RailPanel>}
        className={className}
      >
        <div className={cn('flex flex-col gap-8', !isFull && 'pb-44')}>
          <div>
            <h1 className="font-mono text-[22px] leading-[1.25] text-ink">{pageTitle}</h1>
            <p className="mt-1 font-sans text-[11px] text-subtle">{scopeSubline}</p>
          </div>

          {emptyMessage ? <InlineStatus>{emptyMessage}</InlineStatus> : null}

          <div className={isFull ? 'flex gap-3' : 'grid grid-cols-2 gap-3'}>
            {statCardsLoading
              ? Array.from({ length: statCards.length || 4 }, (_, index) => <StatCardSkeleton key={index} />)
              : statCards.map((card) => (
                  <StatCard
                    key={card.key}
                    icon={card.icon ? STAT_ICONS[card.icon] : undefined}
                    label={card.label}
                    metric={card.metric}
                    delta={card.delta}
                    sparkline={<Sparkline data={card.sparklineData} />}
                    className={isFull ? 'w-[209px] shrink-0' : 'w-full'}
                  />
                ))}
          </div>

          <div>
            <div className={DASHBOARD_LABEL}>SPEND — BY PROJECT AND MODEL</div>
            <div className="mt-4">
              {spendStatus === 'error' ? (
                <ErrorLine
                  message={spendErrorMessage ?? 'Failed to load spend data.'}
                  onRetry={onRetrySpend}
                />
              ) : spendStatus === 'loading' ? (
                <div className="flex flex-col gap-2">
                  <SpendChartSkeleton width={spendChartWidth} height={spendChartHeight} />
                  <p className="font-mono text-[10px] text-subtle">Querying usage…</p>
                </div>
              ) : (
                <SpendSeriesChart
                  series={spendSeries}
                  width={spendChartWidth}
                  height={spendChartHeight}
                  formatXTick={formatSpendXTick}
                  formatYTick={formatSpendYTick}
                  formatTooltipValue={formatSpendTooltipValue}
                  formatLegendValue={formatSpendLegendValue}
                  onSelectSeries={onSelectSeries}
                />
              )}
            </div>
          </div>

          <div className={isFull ? 'flex gap-6' : 'flex flex-col gap-8'}>
            <div className={isFull ? 'w-[528px] shrink-0' : 'w-full'}>
              <div className={DASHBOARD_LABEL}>LATENCY DISTRIBUTION — p95 BY MODEL</div>
              <div className="mt-4">
                {latencyStatus === 'error' ? (
                  <ErrorLine
                    message={latencyErrorMessage ?? 'Failed to load latency data.'}
                    onRetry={onRetryLatency}
                  />
                ) : latencyStatus === 'loading' ? (
                  <div className="flex flex-col gap-2">
                    <LatencyChartSkeleton width={latencyChartWidth} height={latencyChartHeight} />
                    <p className="font-mono text-[10px] text-subtle">Querying usage…</p>
                  </div>
                ) : (
                  <LatencyRidgeline
                    series={latencySeries}
                    width={latencyChartWidth}
                    height={latencyChartHeight}
                    formatXTick={formatLatencyXTick}
                    onSelectSeries={onSelectLatencySeries}
                  />
                )}
              </div>
            </div>

            <div className={isFull ? 'w-[320px] shrink-0' : 'w-full'}>
              <div className={DASHBOARD_LABEL}>BUDGET — CONSUMPTION VS CEILING</div>
              <div className="mt-4">
                <BudgetHero
                  value={budget.value}
                  ceiling={budget.ceiling}
                  threshold={budget.threshold}
                  caption={budget.caption}
                />

                {needsAttentionProject ? (
                  <>
                    <div aria-hidden="true" className="my-5 border-t border-border" />
                    <div className={SECTION_LABEL}>NEEDS ATTENTION</div>
                    <div className="mt-3 flex items-baseline justify-between gap-3">
                      <span className="font-mono text-xs text-ink">{needsAttentionProject.name}</span>
                      <span className="font-mono text-[11px] text-soft">
                        {formatMoneyOf(needsAttentionProject.value, needsAttentionProject.ceiling)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Meter
                        value={needsAttentionProject.value}
                        ceiling={needsAttentionProject.ceiling}
                        threshold={needsAttentionProject.threshold}
                        showCaption={false}
                        label={`${needsAttentionProject.name} consumption`}
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button type="button" variant="primary" size="sm" onClick={onRequestRefill}>
                        {needsAttentionProject.refillActionLabel ?? 'Request refill'}
                      </Button>
                      <span className="font-sans text-[10px] text-subtle">{needsAttentionProject.caption}</span>
                    </div>
                  </>
                ) : null}

                {refillRequestStatus ? (
                  <>
                    <div aria-hidden="true" className="my-5 border-t border-border" />
                    <div className={SECTION_LABEL}>REFILL REQUESTS</div>
                    <p className="mt-3 font-mono text-[11px] text-soft">
                      {refillRequestStatus.pendingCount} pending · {refillRequestStatus.submittedLabel}
                    </p>
                    <button
                      type="button"
                      onClick={onReviewInAdmin}
                      className="mt-1 font-mono text-[11px] text-soft underline-offset-2 hover:text-ink hover:underline"
                    >
                      Review in Admin →
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </ConsoleShell>

      {!isFull ? (
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="VIEW & FILTERS"
          peek={
            <span className="font-mono text-[10px] text-subtle">
              {rangeOptionLabel} · {bucketOptionLabel} · {groupByOptionLabel}
            </span>
          }
        >
          {rightRailBody}
        </BottomSheet>
      ) : null}
    </div>
  );
}
