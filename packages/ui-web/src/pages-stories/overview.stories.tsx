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
} from '../sections/budget-panel/fixtures';
import { LatencyDashboard } from '../sections/latency-dashboard';
import {
  formatOverviewLatencyXTick,
  overviewLatencySeries,
} from '../sections/latency-dashboard/fixtures';
import {
  OVERVIEW_EXPORT_RAIL_LABEL,
  OverviewExportRail,
} from '../sections/overview-export-rail';
import { overviewExportCaption } from '../sections/overview-export-rail/fixtures';
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
} from '../sections/overview-stat-row/fixtures';
import { OVERVIEW_VIEW_RAIL_LABEL, OverviewViewRail } from '../sections/overview-view-rail';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  RANGE_OPTIONS,
} from '../sections/overview-view-rail/fixtures';
import { SCOPE_RAIL_LABEL, ScopeRail } from '../sections/scope-rail';
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
  latencySeries?: LatencyRidgelineSeries[];
  latencyStatus?: DashboardStatus;
  latencyErrorMessage?: string;
  budget?: BudgetSummary;
  needsAttention?: typeof overviewNeedsAttentionProject | undefined;
  refillRequestStatus?: typeof overviewRefillRequestStatus | undefined;
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
  latencySeries = overviewLatencySeries,
  latencyStatus = 'ready',
  latencyErrorMessage,
  budget = overviewBudget,
  needsAttention = overviewNeedsAttentionProject,
  refillRequestStatus = overviewRefillRequestStatus,
}: OverviewScreenProps) {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);

  const rangeField = useSelectField('last-30', RANGE_OPTIONS, 'Range');
  const bucketField = useSelectField('daily', BUCKET_OPTIONS, 'Bucket');
  const groupByField = useSelectField('project-model', GROUP_BY_OPTIONS, 'Group by');
  const accountField = useSelectField('adorsys-gis', ACCOUNT_FILTER_OPTIONS, 'Account');
  const projectField = useSelectField('all', PROJECT_FILTER_OPTIONS, 'Project');
  const modelField = useSelectField('all', MODEL_FILTER_OPTIONS, 'Model');

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
  const exportRail = <OverviewExportRail onExport={() => {}} caption={overviewExportCaption} />;

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

// README §6: axes/structure stay rendered, an InlineStatus banner carries the "nothing yet" copy.
export const Empty: Story = {
  render: () => (
    <OverviewScreen
      emptyMessage="No usage yet. Usage appears here once your first request is billed."
      statCards={overviewEmptyStatCards}
      spendSeries={[]}
      latencySeries={[]}
      budget={overviewEmptyBudget}
      needsAttention={undefined}
      refillRequestStatus={undefined}
    />
  ),
};

// README §6 loading rules: `raised` skeleton blocks matching final geometry, no spinner/shimmer.
export const Loading: Story = {
  render: () => <OverviewScreen statCardsLoading spendStatus="loading" latencyStatus="loading" />,
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
