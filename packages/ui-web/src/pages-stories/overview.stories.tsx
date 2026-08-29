// Page-level acceptance story for OVERVIEW — console-ui skill "Composition": full-page
// compositions exist in exactly two places, Storybook and `apps/console`'s routes. This is the
// Storybook one: sections composed inside `ConsoleShell` with the section fixtures, 1:1 against
// docs/design/console-redesign/overview.svg, so a whole screen can be checked without starting
// the app.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ConsoleShell } from '../components/console-shell';
import { RailPanel } from '../components/rail-panel';
import type { RailSelectProps } from '../components/rail-select';
import { SectionSheetTrigger } from '../components/section-sheet-trigger';
import { InlineStatus } from '../components/inline-status';
import { BudgetPanel } from '../sections/budget-panel';
import {
  overviewBudget,
  overviewEmptyBudget,
  overviewNeedsAttentionProject,
  overviewRefillRequestStatus,
  overviewUnwiredBudget,
} from '../sections/budget-panel/fixtures';
import { LatencyDashboard } from '../sections/latency-dashboard';
import {
  overviewLatencySeries,
  partiallyReportedLatencySeries,
} from '../sections/latency-dashboard/fixtures';
import { OVERVIEW_EXPORT_RAIL_LABEL, OverviewExportRail } from '../sections/overview-export-rail';
import { overviewExportUnavailableCaption } from '../sections/overview-export-rail/fixtures';
import {
  OVERVIEW_FILTERS_RAIL_LABEL,
  OverviewFiltersRail,
} from '../sections/overview-filters-rail';
import {
  ACCOUNT_FILTER_OPTIONS,
  MODEL_FILTER_OPTIONS,
  PROJECT_FILTER_OPTIONS,
} from '../sections/overview-filters-rail/fixtures';
import { OVERVIEW_SERIES_RAIL_LABEL, OverviewSeriesRail } from '../sections/overview-series-rail';
import { OverviewStatRow } from '../sections/overview-stat-row';
import {
  overviewEmptyStatCards,
  overviewStatCards,
  overviewUnwiredStatCards,
} from '../sections/overview-stat-row/fixtures';
import { OVERVIEW_VIEW_RAIL_LABEL, OverviewViewRail } from '../sections/overview-view-rail';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  RANGE_OPTIONS,
} from '../sections/overview-view-rail/fixtures';
import { SCOPE_RAIL_LABEL, ScopeRail } from '../sections/scope-rail';
import { ScreenHeading } from '../sections/screen-heading';
import { UNWIRED_CHART_MESSAGE } from '../sections/dashboard-label';
import { SpendDashboard } from '../sections/spend-dashboard';
import type { DashboardStatus } from '../sections/spend-dashboard';
import {
  formatOverviewSpendLegendValue,
  formatOverviewSpendTooltipValue,
  formatOverviewSpendXTick,
  formatOverviewSpendYTick,
  overviewSpendSeries,
} from '../sections/spend-dashboard/fixtures';
import { SpendShareSection } from '../sections/spend-share';
import {
  formatOverviewSpendShareValue,
  overviewSpendShareSlices,
} from '../sections/spend-share/fixtures';
import { formatMsAxis } from '../lib/duration';
import { formatUsd } from '../lib/money';
import type { DonutSlice } from '../components/donut-chart';
import type { SpendSeriesSeries } from '../components/spend-series-chart';
import type { LatencyRidgelineSeries } from '../components/latency-ridgeline';
import type { OverviewStatCardData } from '../sections/overview-stat-row';
import type { BudgetSummary } from '../sections/budget-panel';
import { storyAdminNavItems, storyHeader, storyNavItems } from './shell-fixtures';

function useSelectField(
  initial: string,
  options: RailSelectProps['options'],
  label: string
): RailSelectProps {
  const [value, setValue] = useState(initial);
  return { label, value, options, onChange: setValue };
}

interface OverviewScreenProps {
  showAdmin?: boolean;
  emptyMessage?: string;
  statCards?: OverviewStatCardData[];
  statCardsLoading?: boolean;
  spendSeries?: SpendSeriesSeries[];
  spendStatus?: DashboardStatus;
  spendShareSlices?: DonutSlice[];
  spendShareStatus?: DashboardStatus;
  latencySeries?: LatencyRidgelineSeries[];
  latencyStatus?: DashboardStatus;
  latencyErrorMessage?: string;
  /** Overrides LatencyDashboard's default `UNWIRED_CHART_MESSAGE` — see `Unwired` above, the
   *  reference story for what "no usage-backend query client at all" looked like before #304. */
  latencyUnwiredMessage?: string;
  /** The per-series honesty line below the ridgeline — see `LatencyPartiallyReported` below, the
   *  story for the "some models reported nothing" case `use-overview-screen.ts`'s real
   *  `latencyFootnote` derives. */
  latencyFootnote?: string;
  budget?: BudgetSummary;
  needsAttention?: typeof overviewNeedsAttentionProject | undefined;
  refillRequestStatus?: typeof overviewRefillRequestStatus | undefined;
  /** Overrides `OverviewSeriesRail`'s own generic "No series to show." default — see `Unwired` below. */
  seriesEmptyMessage?: string;
}

// The composition `apps/console`'s `(console)` layout + `/` route perform for real — the shell
// once, sections inside it, with the right rail's sections mounted twice (persistent `RailPanel`
// at `lg`, `SectionSheetTrigger` sheet below it) from ONE piece of state.
function OverviewScreen({
  showAdmin = false,
  emptyMessage,
  statCards = overviewStatCards,
  statCardsLoading = false,
  spendSeries = overviewSpendSeries,
  spendStatus = 'ready',
  spendShareSlices = overviewSpendShareSlices,
  spendShareStatus = 'ready',
  latencySeries = overviewLatencySeries,
  latencyStatus = 'ready',
  latencyErrorMessage,
  latencyUnwiredMessage,
  latencyFootnote,
  budget = overviewBudget,
  needsAttention = overviewNeedsAttentionProject,
  refillRequestStatus = overviewRefillRequestStatus,
  seriesEmptyMessage,
}: OverviewScreenProps) {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);

  const rangeField = useSelectField('last-30', RANGE_OPTIONS, 'Range');
  const bucketField = useSelectField('daily', BUCKET_OPTIONS, 'Bucket');
  const groupByField = useSelectField('project-model', GROUP_BY_OPTIONS, 'Group by');
  const accountField = useSelectField('adorsys-gis', ACCOUNT_FILTER_OPTIONS, 'Account');
  const projectField = useSelectField('all', PROJECT_FILTER_OPTIONS, 'Project');
  const modelField = useSelectField('all', MODEL_FILTER_OPTIONS, 'Model');

  const spendShareTotal = useMemo(
    () => spendShareSlices.reduce((sum, slice) => sum + slice.value, 0),
    [spendShareSlices]
  );

  const legendItems = useMemo(
    () =>
      spendSeries.map((series) => ({
        key: series.key,
        label: series.label,
        value: formatOverviewSpendLegendValue(series),
        breached: series.breached,
      })),
    [spendSeries]
  );

  const viewRail = (
    <OverviewViewRail
      rangeField={rangeField}
      bucketField={bucketField}
      groupByField={groupByField}
    />
  );
  const filtersRail = (
    <OverviewFiltersRail
      accountField={accountField}
      projectField={projectField}
      modelField={modelField}
    />
  );
  // Matches `apps/console`'s real state (console-ui#324): the CSV export route doesn't exist
  // yet, so the control is disabled with the reason stated beside it rather than a button that
  // silently does nothing on press.
  const exportRail = <OverviewExportRail disabled caption={overviewExportUnavailableCaption} />;

  return (
    <ConsoleShell
      header={storyHeader}
      nav={{
        items: storyNavItems('overview'),
        adminItems: storyAdminNavItems('overview'),
        showAdmin,
      }}
      leftSecondary={
        <RailPanel label={SCOPE_RAIL_LABEL}>
          <ScopeRail accountLabel="adorsys-gis" projectLabel="all projects" />
        </RailPanel>
      }
      leftSecondaryLabel="Scope"
      rightRail={
        // A Fragment, not a wrapping `<div>`: the rail column applies `bg-surface divide-y
        // divide-raised` to its DIRECT children, so each section must be a direct DOM child for
        // the hairlines to land between sections rather than around one box.
        <>
          <RailPanel label={OVERVIEW_VIEW_RAIL_LABEL}>{viewRail}</RailPanel>
          <RailPanel label={OVERVIEW_FILTERS_RAIL_LABEL}>{filtersRail}</RailPanel>
          <RailPanel label={OVERVIEW_SERIES_RAIL_LABEL}>
            <OverviewSeriesRail
              items={legendItems}
              emptyMessage={seriesEmptyMessage}
              selectedKey={selectedSeriesKey}
              onSelectKey={setSelectedSeriesKey}
            />
          </RailPanel>
          <RailPanel label={OVERVIEW_EXPORT_RAIL_LABEL}>{exportRail}</RailPanel>
        </>
      }>
      <div className="flex flex-col gap-8">
        <ScreenHeading title="Overview" subline="adorsys-gis · last 30 days · UTC" />

        {emptyMessage ? <InlineStatus>{emptyMessage}</InlineStatus> : null}

        <OverviewStatRow cards={statCards} loading={statCardsLoading} />

        <SpendDashboard
          series={spendSeries}
          fallbackWidth={872}
          height={176}
          status={spendStatus}
          onSelectSeries={setSelectedSeriesKey}
          formatXTick={formatOverviewSpendXTick}
          formatYTick={formatOverviewSpendYTick}
          formatTooltipValue={formatOverviewSpendTooltipValue}
          formatLegendValue={formatOverviewSpendLegendValue}
          actions={
            <>
              <SectionSheetTrigger
                icon="view"
                triggerLabel="Open view options"
                label={OVERVIEW_VIEW_RAIL_LABEL}>
                {viewRail}
              </SectionSheetTrigger>
              <SectionSheetTrigger
                icon="filter"
                triggerLabel="Open filters"
                label={OVERVIEW_FILTERS_RAIL_LABEL}>
                {filtersRail}
              </SectionSheetTrigger>
            </>
          }
        />

        {/* Placement: directly below the SPEND time series, above the LATENCY/BUDGET row --
            reading order stays tiles -> trend -> share -> detail. Its own dashboard row (not
            folded into the LATENCY/BUDGET row) because a donut is a fixed-size widget, unlike
            those two `lg:basis-*` columns that scale to fill the centre; giving it a full-width
            row lets it stay centered rather than stretching or crowding a third column into 872px. */}
        <SpendShareSection
          slices={spendShareSlices}
          size={200}
          status={spendShareStatus}
          onRetry={() => {}}
          selectedKey={selectedSeriesKey}
          onSelectSlice={setSelectedSeriesKey}
          centreMetric={spendShareTotal > 0 ? formatUsd(spendShareTotal) : undefined}
          centreLabel={spendShareTotal > 0 ? 'TOTAL' : undefined}
          formatTooltipValue={formatOverviewSpendShareValue}
          formatLegendValue={formatOverviewSpendShareValue}
        />

        {/* `lg:basis-[528px]` / `lg:basis-[320px]` are the 1440-reference widths (528 + 320 + 24px
            gap = 872px, the centre's exact width at 1440) — `lg:flex-1 lg:min-w-0` (not
            `shrink-0`) lets both columns scale down together instead of overflowing. */}
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
          <LatencyDashboard
            className="w-full lg:min-w-0 lg:flex-1 lg:basis-[528px]"
            series={latencySeries}
            fallbackWidth={528}
            height={310}
            status={latencyStatus}
            errorMessage={latencyErrorMessage}
            unwiredMessage={latencyUnwiredMessage}
            footnote={latencyFootnote}
            onRetry={() => {}}
            formatXTick={formatMsAxis}
          />
          <BudgetPanel
            className="w-full lg:min-w-0 lg:flex-1 lg:basis-[320px]"
            budget={budget}
            needsAttentionProject={needsAttention}
            onRequestRefill={() => {}}
            refillRequestStatus={refillRequestStatus}
            onReviewInAdmin={() => {}}
            actions={
              <SectionSheetTrigger
                icon="export"
                triggerLabel="Open export"
                label={OVERVIEW_EXPORT_RAIL_LABEL}>
                {exportRail}
              </SectionSheetTrigger>
            }
          />
        </div>
      </div>
    </ConsoleShell>
  );
}

const meta: Meta<typeof OverviewScreen> = {
  title: 'Pages/Overview',
  component: OverviewScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof OverviewScreen>;

// `lg` (≥1024, the default story viewport — see .storybook/preview.tsx). Visually comparable to
// docs/design/console-redesign/overview.svg. Fluid (console-ui skill "Fluid always") — the page
// follows the iframe's real width rather than a fixed 1440 wrapper.
export const Populated: Story = { render: () => <OverviewScreen /> };

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Populated`, same fixtures — the
// page-level acceptance surface for the light theme at the `lg` reference tier.
export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <OverviewScreen />,
  globals: { theme: 'wireframe' },
};

// README §6: axes/structure stay rendered, an InlineStatus banner carries the "nothing yet" copy.
// A REAL, wired account that genuinely consumed nothing this period — distinct from `Unwired`
// below, where no query has ever run at all.
export const Empty: Story = {
  render: () => (
    <OverviewScreen
      emptyMessage="No usage yet. Usage appears here once your first request is billed."
      statCards={overviewEmptyStatCards}
      spendSeries={[]}
      spendShareSlices={[]}
      latencySeries={[]}
      budget={overviewEmptyBudget}
      needsAttention={undefined}
      refillRequestStatus={undefined}
    />
  ),
};

// #263/#272/#273 — Overview's state BEFORE #304-#307 (Epic 4 Story 4.2): PROJECTS/API KEYS
// counts were live (via refine), everything usage- and budget-shaped had never been queried (no
// usage-backend query client existed at all). Every zone rendered `'unwired'` rather than
// defaulting to `'ready'` with fabricated empty/zero data — the acceptance surface for #272/#273.
//
// Kept as a Storybook variant (not deleted) because the `'unwired'` vocabulary itself is still
// live — `component.stories.tsx`'s own `Unwired` story for `LatencyDashboard` exercises it for
// real — and this remains the reference for what "the usage-backend query client doesn't exist at
// all yet" looks like across every zone at once, which is no longer console's actual state: as of
// the lightbridge-authz `feat/usage-latency-percentiles` contract landing, LATENCY is wired the
// same way SPEND/SPEND SHARE/BUDGET already were (see `LatencyPopulated`/`LatencyPartiallyReported`
// below for what that looks like).
export const Unwired: Story = {
  render: () => (
    <OverviewScreen
      emptyMessage="Usage and budget dashboards are unwired: no usage-backend query client yet. Project and key counts below are live."
      statCards={overviewUnwiredStatCards}
      spendSeries={[]}
      spendStatus="unwired"
      spendShareSlices={[]}
      spendShareStatus="unwired"
      latencySeries={[]}
      latencyStatus="unwired"
      budget={overviewUnwiredBudget}
      needsAttention={undefined}
      refillRequestStatus={undefined}
      seriesEmptyMessage={UNWIRED_CHART_MESSAGE}
    />
  ),
};

export const UnwiredLight: Story = {
  name: 'Unwired — wireframe (light)',
  render: Unwired.render,
  globals: { theme: 'wireframe' },
};

// Console's ACTUAL current state, and the acceptance surface for ADR 0008 Decision 7's amended
// status note: SPEND/SPEND SHARE/BUDGET/LATENCY are all real now (default fixtures,
// `spendStatus`/`spendShareStatus`/`latencyStatus` all default to `'ready'`) — the usage-API
// contract gained `latency_samples`/`latency_p50_ms`/`latency_p95_ms`/`latency_p99_ms` on
// `lightbridge-authz`'s `feat/usage-latency-percentiles` branch, closing the gap the earlier
// `LatencyBlocked` story (removed) exercised. Every model here reported real per-bucket p95
// samples across the whole range, so there is nothing to caveat — no footnote.
export const LatencyPopulated: Story = {
  render: () => <OverviewScreen latencySeries={overviewLatencySeries} latencyStatus="ready" />,
};

// The per-series honesty this feature is actually built around: a query can succeed
// (`latencyStatus="ready"`, never `'unwired'` — that vocabulary is reserved for "never queried at
// all") while one group within it genuinely reported no latency at all, e.g. `signal-summary`
// here, an aggregate metric signal that never carries a per-request duration
// (`openapi/usage.backend.yaml`'s own `latency_samples` doc comment). The gap is named in the
// footnote and in that row's own "no latency reported" value, never silently dropped and never
// fabricated — see `apps/console/src/containers/use-overview-screen.ts`'s `latencyFootnote` for
// the real per-series logic this story's `latencyFootnote` prop mirrors.
export const LatencyPartiallyReported: Story = {
  render: () => (
    <OverviewScreen
      latencySeries={partiallyReportedLatencySeries}
      latencyStatus="ready"
      latencyFootnote="No latency reported for signal-summary — aggregate metric signals carry a bucketed distribution, not a per-request duration."
    />
  ),
};

// README §6 loading rules: `raised` skeleton blocks matching final geometry, no spinner/shimmer.
export const Loading: Story = {
  render: () => (
    <OverviewScreen
      statCardsLoading
      spendStatus="loading"
      spendShareStatus="loading"
      latencyStatus="loading"
    />
  ),
};

// README §6 error rules: section-level ErrorLine + Retry. A failed latency query must not take
// the spend chart down with it, so only LATENCY errors here.
export const DashboardError: Story = {
  render: () => (
    <OverviewScreen latencyStatus="error" latencyErrorMessage="Failed to load latency data." />
  ),
};

export const MemberNav: Story = {
  name: 'Nav — member (no Admin group)',
  render: () => <OverviewScreen showAdmin={false} />,
};

export const AdminNav: Story = {
  name: 'Nav — admin (Admin group visible)',
  render: () => <OverviewScreen showAdmin />,
};

// `md` tier (600–1024): left rail persists inline; the right rail has NO persistent footer/peek
// bar at all (owner revision 2026-08-25). Its sections are reached via contextual triggers
// instead: VIEW and FILTERS beside the SPEND header, EXPORT beside the BUDGET header.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <OverviewScreen />,
};

// Same `md` tier, FILTERS trigger activated — the contextual trigger → `SectionSheet` flow end to
// end: only the FILTERS section (not the whole rail) opens as a transient bottom sheet.
export const MdTierFiltersSheetOpen: Story = {
  name: 'md tier — FILTERS sheet open',
  globals: { viewport: { value: 'md900' } },
  render: () => <OverviewScreen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Open filters' }));

    // The sheet's `Drawer.Portal` renders to `document.body`, outside `canvasElement`.
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getByRole('dialog', { name: 'FILTERS' })).toBeInTheDocument());
  },
};

// Base tier (<600, a designed target): single column, stacked stat cards, nav docked as a fixed
// bottom navigation bar, VIEW/FILTERS/EXPORT via the same contextual triggers as `md`, SCOPE via
// the header's drawer trigger.
export const MobileBaseTier: Story = {
  globals: { viewport: { value: 'base390' } },
  render: () => <OverviewScreen />,
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `MobileBaseTier`.
export const MobileBaseTierLight: Story = {
  name: 'Mobile Base Tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <OverviewScreen />,
};
