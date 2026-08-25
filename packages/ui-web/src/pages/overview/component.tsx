import React, { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { SPEC_GRID } from '../../chart-tokens';
import { cn } from '../../cn';
import { AccountMenu } from '../../components/account-menu';
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
import { RailPanel } from '../../components/rail-panel';
import { SectionSheet } from '../../components/section-sheet';
import { SkeletonMetric } from '../../components/skeleton-metric';
import { Sparkline } from '../../components/sparkline';
import { SpendSeriesChart } from '../../components/spend-series-chart';
import { BudgetHero } from '../../components/budget-hero';
import { StatCard } from '../../components/stat-card';
import { useResizeObserver } from '../../lib/use-resize-observer';
import { formatMoneyOf } from '../../lib/money';
import type { OverviewPageProps, OverviewSelectField, OverviewStatCardIcon } from './types';

const SECTION_LABEL = 'font-mono text-[10px] uppercase tracking-[.09em] text-subtle';
const DASHBOARD_LABEL = 'font-mono text-[11px] uppercase tracking-[.09em] text-subtle';

// Compact-tier (below `lg`) contextual sheet triggers — console-ui skill "Shape and layout"
// (owner revision 2026-08-25): no persistent right-rail footer/peek bar below `lg`; each rail
// section is reached through a 30×30 ghost icon-button trigger placed next to the on-page
// element it configures, opening only that section as a `SectionSheet`. 12px line glyphs, same
// treatment as `STAT_ICONS` below — structural, not decorative.
function ViewIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M1 3.5h10M1 8.5h10" strokeLinecap="round" />
      <circle cx="4" cy="3.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M1.5 2h9M3.5 6h5M5 10h2" strokeLinecap="round" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M6 1.2v6.4M3.2 5l2.8 2.8L8.8 5M1.5 10.3h9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionTriggerButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={label} onClick={onClick} className="lg:hidden">
      {icon}
    </Button>
  );
}

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
            'appearance-none pr-7'
          )}>
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
          strokeWidth="1.4">
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
  logoSrc,
  logoAlt,
  wordmark,
  orgName,
  userName,
  userEmail,
  userInitials,
  onSignOut,
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
  // Contract: console-ui skill "No overflow, ever" — charts measure their container rather
  // than forcing a width. `measuredSpendWidth`/`measuredLatencyWidth` fall back to the caller's
  // static prop only until the first `ResizeObserver` report lands; the container div also
  // carries `overflow-x-auto` as a second, independent line of defence, so a chart never blows
  // the page open even during that brief unmeasured window (or on the rare host where
  // `ResizeObserver` is unavailable/delayed) — the SVG itself never learns to shrink on its
  // own, only the surrounding container's own scroll makes that safe.
  const spendContainer = useResizeObserver<HTMLDivElement>();
  const latencyContainer = useResizeObserver<HTMLDivElement>();
  const measuredSpendWidth = spendContainer.size.width || spendChartWidth;
  const measuredLatencyWidth = latencyContainer.size.width || latencyChartWidth;

  // Compact-tier (below `lg`) sheet state — the page owns this now, not `ConsoleShell` (owner
  // revision 2026-08-25, console-ui skill "Shape and layout"). SERIES has no trigger of its own:
  // the chart itself already exposes series selection directly via `onSelectSeries` on click, so
  // its rail legend is a convenience echo, not the only path to that interaction.
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);

  const seriesLegendItems: ChartLegendItem[] = useMemo(
    () =>
      spendSeries.map((series) => ({
        key: series.key,
        label: series.label,
        value: formatSpendLegendValue?.(series),
        breached: series.breached,
      })),
    [spendSeries, formatSpendLegendValue]
  );

  const header = (
    <ConsoleHeader
      logoSrc={logoSrc}
      logoAlt={logoAlt}
      wordmark={wordmark}
      orgSwitcher={<span className="font-mono text-xs text-soft">{orgName}</span>}
      identity={
        <AccountMenu
          name={userName}
          email={userEmail}
          initials={userInitials}
          onSignOut={onSignOut}
        />
      }
    />
  );

  const leftSecondary = (
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
  );

  // Section content, factored out so each renders twice: once inline inside a `RailPanel` (the
  // persistent `lg` rail) and once bare inside a `SectionSheet` (the compact-tier trigger target
  // — `SectionSheet`'s own header already supplies the heading, so no second `RailPanel` label).
  const viewFields = (
    <section className="flex flex-col gap-4" aria-label="View">
      <RailSelect {...rangeField} />
      <RailSelect {...bucketField} />
      <RailSelect {...groupByField} />
    </section>
  );

  const filterFields = (
    <section className="flex flex-col gap-4" aria-label="Filters">
      <RailSelect {...accountFilterField} />
      <RailSelect {...projectFilterField} />
      <RailSelect {...modelFilterField} />
    </section>
  );

  const exportFields = (
    <section className="flex flex-col gap-2" aria-label="Export">
      <Button type="button" variant="secondary" className="w-full" onClick={onExportView}>
        {exportLabel ?? 'Export current view · CSV'}
      </Button>
      {exportCaption ? <p className="font-sans text-[10px] text-subtle">{exportCaption}</p> : null}
    </section>
  );

  // Four rail *sections* (owner revision 2026-08-25, console-ui skill "Rails are flush, aligned,
  // full-height columns"), rendered as direct children of the right-rail column so its own
  // `divide-y divide-raised` puts one hairline between each — no per-section `border-t` divider,
  // no wrapping `gap-6` div. Each `RailPanel`'s `label` prop supplies the uppercase heading
  // (identical styling to `SECTION_LABEL`); the inner `<section aria-label>` is kept purely for
  // the a11y region landmark the SERIES panel's tests rely on (`getByRole('region', ...)`). Only
  // rendered inline at `lg` — below that, the same content is reachable via the VIEW/FILTERS/
  // EXPORT triggers placed in context further down the centre column.
  const rightRail = (
    <>
      <RailPanel label="VIEW">{viewFields}</RailPanel>
      <RailPanel label="FILTERS">{filterFields}</RailPanel>
      <RailPanel label="SERIES">
        <section className="flex flex-col gap-3" aria-label="Series">
          <ChartLegend
            items={seriesLegendItems}
            selectedKey={selectedSeriesKey}
            onSelectKey={onSelectSeries}
          />
        </section>
      </RailPanel>
      <RailPanel label="EXPORT">{exportFields}</RailPanel>
    </>
  );

  return (
    <ConsoleShell
      header={header}
      nav={{ items: navItems, adminItems: adminNavItems, showAdmin }}
      leftSecondary={leftSecondary}
      leftSecondaryLabel="Scope"
      rightRail={rightRail}
      className={className}
    >
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-mono text-[22px] leading-[1.25] text-ink">{pageTitle}</h1>
          <p className="mt-1 font-sans text-[11px] text-subtle">{scopeSubline}</p>
        </div>

        {emptyMessage ? <InlineStatus>{emptyMessage}</InlineStatus> : null}

        {/* `lg:basis-[209px]` is the 1440-reference size (4 × 209 + 3 × 12px gaps = 872px, the
            spec's exact centre width at 1440 — README §3) — `lg:flex-1 lg:min-w-0` (not
            `shrink-0`) let the cards scale down together below that reference instead of forcing
            the page to overflow (console-ui skill "No overflow, ever" / "Fluid always"). */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:flex">
          {statCardsLoading
            ? Array.from({ length: statCards.length || 4 }, (_, index) => (
                <StatCardSkeleton key={index} />
              ))
            : statCards.map((card) => (
                <StatCard
                  key={card.key}
                  icon={card.icon ? STAT_ICONS[card.icon] : undefined}
                  label={card.label}
                  metric={card.metric}
                  delta={card.delta}
                  sparkline={<Sparkline data={card.sparklineData} />}
                  className="w-full lg:min-w-0 lg:flex-1 lg:basis-[209px]"
                />
              ))}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <div className={DASHBOARD_LABEL}>SPEND — BY PROJECT AND MODEL</div>
            <div className="flex items-center gap-1">
              <SectionTriggerButton label="Open view options" icon={<ViewIcon />} onClick={() => setViewSheetOpen(true)} />
              <SectionTriggerButton label="Open filters" icon={<FilterIcon />} onClick={() => setFiltersSheetOpen(true)} />
            </div>
          </div>
          <div ref={spendContainer.ref} className="mt-4 w-full overflow-x-auto">
            {spendStatus === 'error' ? (
              <ErrorLine
                message={spendErrorMessage ?? 'Failed to load spend data.'}
                onRetry={onRetrySpend}
              />
            ) : spendStatus === 'loading' ? (
              <div className="flex flex-col gap-2">
                <SpendChartSkeleton width={measuredSpendWidth} height={spendChartHeight} />
                <p className="font-mono text-[10px] text-subtle">Querying usage…</p>
              </div>
            ) : (
              <SpendSeriesChart
                series={spendSeries}
                width={measuredSpendWidth}
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

        {/* Same fluid-basis fix as the stat-card row just above: `lg:basis-[528px]` /
            `lg:basis-[320px]` are the 1440-reference widths (528 + 320 + 24px gap = 872px, the
            centre's exact width at 1440) — `lg:flex-1 lg:min-w-0` (not `shrink-0`) let both
            columns scale down together instead of overflowing the page below that reference. */}
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
          <div className="w-full lg:min-w-0 lg:flex-1 lg:basis-[528px]">
            <div className={DASHBOARD_LABEL}>LATENCY DISTRIBUTION — p95 BY MODEL</div>
            <div ref={latencyContainer.ref} className="mt-4 w-full overflow-x-auto">
              {latencyStatus === 'error' ? (
                <ErrorLine
                  message={latencyErrorMessage ?? 'Failed to load latency data.'}
                  onRetry={onRetryLatency}
                />
              ) : latencyStatus === 'loading' ? (
                <div className="flex flex-col gap-2">
                  <LatencyChartSkeleton width={measuredLatencyWidth} height={latencyChartHeight} />
                  <p className="font-mono text-[10px] text-subtle">Querying usage…</p>
                </div>
              ) : (
                <LatencyRidgeline
                  series={latencySeries}
                  width={measuredLatencyWidth}
                  height={latencyChartHeight}
                  formatXTick={formatLatencyXTick}
                  onSelectSeries={onSelectLatencySeries}
                />
              )}
            </div>
          </div>

          <div className="w-full lg:min-w-0 lg:flex-1 lg:basis-[320px]">
            <div className="flex items-center justify-between gap-2">
              <div className={DASHBOARD_LABEL}>BUDGET — CONSUMPTION VS CEILING</div>
              <SectionTriggerButton label="Open export" icon={<ExportIcon />} onClick={() => setExportSheetOpen(true)} />
            </div>
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
                    <span className="font-sans text-[10px] text-subtle">
                      {needsAttentionProject.caption}
                    </span>
                  </div>
                </>
              ) : null}

              {refillRequestStatus ? (
                <>
                  <div aria-hidden="true" className="my-5 border-t border-border" />
                  <div className={SECTION_LABEL}>REFILL REQUESTS</div>
                  <p className="mt-3 font-mono text-[11px] text-soft">
                    {refillRequestStatus.pendingCount} pending ·{' '}
                    {refillRequestStatus.submittedLabel}
                  </p>
                  <button
                    type="button"
                    onClick={onReviewInAdmin}
                    className="mt-1 font-mono text-[11px] text-soft underline-offset-2 hover:text-ink hover:underline">
                    Review in Admin →
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <SectionSheet open={viewSheetOpen} onOpenChange={setViewSheetOpen} label="VIEW">
        {viewFields}
      </SectionSheet>
      <SectionSheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen} label="FILTERS">
        {filterFields}
      </SectionSheet>
      <SectionSheet open={exportSheetOpen} onOpenChange={setExportSheetOpen} label="EXPORT">
        {exportFields}
      </SectionSheet>
    </ConsoleShell>
  );
}
