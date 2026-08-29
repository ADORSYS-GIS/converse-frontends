// Page-level acceptance story for OVERVIEW — console-ui skill "Composition": full-page
// compositions exist in exactly two places, Storybook and `apps/console`'s routes. This is the
// Storybook one: sections composed inside `ConsoleShell` with the section fixtures, so a whole
// screen can be checked without starting the app.
//
// **This screen has no right rail at any tier** (owner review 2026-08-29). Its parameters live in
// one always-visible `OverviewToolbar` above the dashboards, so there is no `RailPanel`/
// `SectionSheetTrigger` pair to keep in sync, no `md`-vs-`lg` composition split, and the centre
// column is ~280px wider than it was. See `sections/overview-toolbar/component.tsx` for why.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsoleShell } from '../components/console-shell';
import type { SelectFieldProps } from '../components/select-field';
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
  formatOverviewLatencyXTick,
  overviewLatencySeries,
} from '../sections/latency-dashboard/fixtures';
import { OverviewStatRow } from '../sections/overview-stat-row';
import {
  overviewEmptyStatCards,
  overviewStatCards,
  overviewUnwiredStatCards,
} from '../sections/overview-stat-row/fixtures';
import { OverviewToolbar } from '../sections/overview-toolbar';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  MODEL_FILTER_OPTIONS,
  PROJECT_FILTER_OPTIONS,
  RANGE_OPTIONS,
} from '../sections/overview-toolbar/fixtures';
import { ScreenHeading } from '../sections/screen-heading';
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
import { overviewSpendShareSegments } from '../sections/spend-share/fixtures';
import { formatMoney } from '../lib/money';
import type { ShareBarSegment } from '../components/share-bar';
import type { SpendSeriesSeries } from '../components/spend-series-chart';
import type { LatencyRidgelineSeries } from '../components/latency-ridgeline';
import type { OverviewStatCardData } from '../sections/overview-stat-row';
import type { BudgetSummary } from '../sections/budget-panel';
import { storyAdminNavItems, storyHeader, storyNavItems } from './shell-fixtures';

function useSelectField(
  initial: string,
  options: SelectFieldProps['options'],
  label: string,
): Omit<SelectFieldProps, 'layout'> {
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
  spendShareSegments?: ShareBarSegment[];
  spendShareStatus?: DashboardStatus;
  latencySeries?: LatencyRidgelineSeries[];
  latencyStatus?: DashboardStatus;
  latencyErrorMessage?: string;
  /** Overrides `UNWIRED_CHART_MESSAGE` for `latencyStatus="unwired"` — see `LatencyBlocked`. */
  latencyUnwiredMessage?: string;
  budget?: BudgetSummary;
  needsAttention?: typeof overviewNeedsAttentionProject | undefined;
  refillRequestStatus?: typeof overviewRefillRequestStatus | undefined;
  exportDisabledReason?: string;
}

// The composition `apps/console`'s `(console)` layout + `/` route perform for real: the shell
// once, sections inside it, and — unlike before — exactly ONE arrangement of the parameters.
function OverviewScreen({
  showAdmin = false,
  emptyMessage,
  statCards = overviewStatCards,
  statCardsLoading = false,
  spendSeries = overviewSpendSeries,
  spendStatus = 'ready',
  spendShareSegments = overviewSpendShareSegments,
  spendShareStatus = 'ready',
  latencySeries = overviewLatencySeries,
  latencyStatus = 'ready',
  latencyErrorMessage,
  latencyUnwiredMessage,
  budget = overviewBudget,
  needsAttention = overviewNeedsAttentionProject,
  refillRequestStatus = overviewRefillRequestStatus,
  exportDisabledReason,
}: OverviewScreenProps) {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);

  const rangeField = useSelectField('last-30', RANGE_OPTIONS, 'Range');
  const bucketField = useSelectField('daily', BUCKET_OPTIONS, 'Bucket');
  const groupByField = useSelectField('project-model', GROUP_BY_OPTIONS, 'Group by');
  const projectField = useSelectField('all', PROJECT_FILTER_OPTIONS, 'Project');
  const modelField = useSelectField('all', MODEL_FILTER_OPTIONS, 'Model');

  const spendShareTotal = useMemo(
    () => spendShareSegments.reduce((sum, segment) => sum + segment.value, 0),
    [spendShareSegments],
  );

  return (
    <ConsoleShell
      header={storyHeader}
      nav={{
        items: storyNavItems('overview'),
        adminItems: storyAdminNavItems('overview'),
        showAdmin,
      }}>
      {/* No `leftSecondary`: the left rail's `Scope` echo is gone. It restated the account and
          project the header already names and the toolbar already filters — three copies of one
          fact, of which this was the least useful (read-only, and furthest from both). The rail
          is navigation again, nothing else. */}
      <div className="flex flex-col gap-8">
        <ScreenHeading title="Overview" subline="Last 30 days · UTC" />

        {/* Subline no longer repeats the account id — the header carries it, once. */}

        {emptyMessage ? <InlineStatus>{emptyMessage}</InlineStatus> : null}

        <OverviewToolbar
          rangeField={rangeField}
          bucketField={bucketField}
          groupByField={groupByField}
          projectField={projectField}
          modelField={modelField}
          onExport={exportDisabledReason ? undefined : () => {}}
          exportDisabledReason={exportDisabledReason}
        />

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
        />

        {/* Directly below the time series: reading order stays tiles → trend → share → detail.
            Now ~90px rather than ~330 (the donut it replaced), which is why LATENCY and BUDGET
            are visible without scrolling at the `lg` reference height. */}
        <SpendShareSection
          segments={spendShareSegments}
          total={spendShareTotal > 0 ? formatMoney(spendShareTotal) : undefined}
          status={spendShareStatus}
          onRetry={() => {}}
          selectedKey={selectedSeriesKey}
          onSelectSegment={setSelectedSeriesKey}
        />

        {/* `lg:basis-[528px]` / `lg:basis-[320px]` were the 1440-reference widths back when the
            centre was 872px wide. With the right rail gone the centre is ~1152px at the same
            reference, so these are now proportions rather than pixel targets — `lg:flex-1
            lg:min-w-0` lets both columns scale together instead of overflowing. */}
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
          <LatencyDashboard
            className="w-full lg:min-w-0 lg:flex-1 lg:basis-[528px]"
            series={latencySeries}
            fallbackWidth={528}
            height={310}
            status={latencyStatus}
            errorMessage={latencyErrorMessage}
            unwiredMessage={latencyUnwiredMessage}
            onRetry={() => {}}
            formatXTick={formatOverviewLatencyXTick}
          />
          <BudgetPanel
            className="w-full lg:min-w-0 lg:flex-1 lg:basis-[320px]"
            budget={budget}
            needsAttentionProject={needsAttention}
            onRequestRefill={() => {}}
            refillRequestStatus={refillRequestStatus}
            onReviewInAdmin={() => {}}
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

// `lg` (≥1024, the default story viewport — see .storybook/preview.tsx). Fluid (console-ui skill
// "Fluid always") — the page follows the iframe's real width rather than a fixed 1440 wrapper.
export const Populated: Story = { render: () => <OverviewScreen /> };

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Populated`, same fixtures.
export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <OverviewScreen />,
  globals: { theme: 'wireframe' },
};

// README §6: axes/structure stay rendered, an InlineStatus banner carries the "nothing yet" copy.
export const Empty: Story = {
  render: () => (
    <OverviewScreen
      emptyMessage="No usage yet. Usage appears here once your first request is billed."
      statCards={overviewEmptyStatCards}
      spendSeries={[]}
      spendShareSegments={[]}
      latencySeries={[]}
      budget={overviewEmptyBudget}
      needsAttention={undefined}
      refillRequestStatus={undefined}
    />
  ),
};

// #263/#272/#273 — Overview's state BEFORE #304-#307 (Epic 4 Story 4.2): PROJECTS/API KEYS counts
// were live (via refine), everything usage- and budget-shaped had never been queried at all. Every
// zone renders `'unwired'` rather than defaulting to `'ready'` with fabricated empty/zero data.
//
// Kept as a Storybook variant (not deleted) because the `'unwired'` vocabulary is still live —
// `LatencyBlocked` below exercises it for real — and this remains the reference for what "no
// usage-backend query client exists at all" looks like across every zone at once.
export const Unwired: Story = {
  render: () => (
    <OverviewScreen
      emptyMessage="Usage and budget dashboards are unwired: no usage-backend query client yet. Project and key counts below are live."
      statCards={overviewUnwiredStatCards}
      spendSeries={[]}
      spendStatus="unwired"
      spendShareSegments={[]}
      spendShareStatus="unwired"
      latencySeries={[]}
      latencyStatus="unwired"
      budget={overviewUnwiredBudget}
      needsAttention={undefined}
      refillRequestStatus={undefined}
      exportDisabledReason="Export isn't available yet."
    />
  ),
};

export const UnwiredLight: Story = {
  name: 'Unwired — wireframe (light)',
  render: Unwired.render,
  globals: { theme: 'wireframe' },
};

// #307 — console's ACTUAL current state: SPEND/SPEND SHARE/BUDGET are real, and LATENCY alone
// stays `'unwired'` — not because no client exists (one does, as of #304), but because the
// documented usage-API contract has no latency/percentile field to query at all (Epic 6, tracked
// as #294). The banner is `apps/console`'s real, customer-visible `LATENCY_BLOCKED_MESSAGE`
// (`containers/use-overview-screen.ts`) verbatim.
//
// It is also the regression story for the owner-reported clipping bug: that message used to
// render INSIDE the chart's `overflow-x-auto` box and was cut off at both ends. It now sits
// outside that box and wraps to the column.
export const LatencyBlocked: Story = {
  render: () => (
    <OverviewScreen
      emptyMessage="Latency distribution isn't available: the usage API doesn't report latency or percentile data yet. Spend, budget and project/key counts below are live."
      latencySeries={[]}
      latencyStatus="unwired"
      latencyUnwiredMessage="Blocked — the usage API doesn't report latency or percentile data yet."
    />
  ),
};

export const LatencyBlockedLight: Story = {
  name: 'LatencyBlocked — wireframe (light)',
  render: LatencyBlocked.render,
  globals: { theme: 'wireframe' },
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
//
export const DashboardError: Story = {
  render: () => (
    <OverviewScreen latencyStatus="error" latencyErrorMessage="Failed to load latency data." />
  ),
};

/** Production's real state: the usage backend serves no CSV, so export is disabled and says so. */
export const ExportUnavailable: Story = {
  render: () => <OverviewScreen exportDisabledReason="Export isn't available yet." />,
};

export const MemberNav: Story = {
  name: 'Nav — member (no Admin group)',
  render: () => <OverviewScreen showAdmin={false} />,
};

export const AdminNav: Story = {
  name: 'Nav — admin (Admin group visible)',
  render: () => <OverviewScreen showAdmin />,
};

// `md` tier (600–1024): left rail persists inline; the toolbar simply wraps. There is no sheet
// to open and no trigger to find — the reason this tier no longer needs its own story pair.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <OverviewScreen />,
};

// Base tier (<600, a designed target): single column, stacked stat cards, nav docked as a fixed
// bottom navigation bar, toolbar wrapped to several rows.
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
