// Refine-driven container for the OVERVIEW screen — `useCustom({ url: 'overview' })` against the
// mock provider's aggregation endpoint (console-ui skill "Refine-driven mock screens").
//
// The sections stay pure — this container only adapts hook state (`query.isLoading` → skeleton
// props, `query.isError` → error props, `result.data` → stat cards / chart series / budget) into
// section props, and hands the shell its centre and its rail exactly the way `apps/console`'s
// route + `@rail/page.tsx` pair does.

import React, { useMemo, useState } from 'react';
import { useCustom } from '@refinedev/core';

import { InlineStatus } from '../components/inline-status';
import { RailPanel } from '../components/rail-panel';
import type { RailSelectProps } from '../components/rail-select';
import { SectionSheetTrigger } from '../components/section-sheet-trigger';
import { BudgetPanel } from '../sections/budget-panel';
import { LatencyDashboard } from '../sections/latency-dashboard';
import { formatOverviewLatencyXTick } from '../sections/latency-dashboard/fixtures';
import { OVERVIEW_EXPORT_RAIL_LABEL, OverviewExportRail } from '../sections/overview-export-rail';
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
import { OVERVIEW_VIEW_RAIL_LABEL, OverviewViewRail } from '../sections/overview-view-rail';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  RANGE_OPTIONS,
} from '../sections/overview-view-rail/fixtures';
import { SCOPE_RAIL_LABEL, ScopeRail } from '../sections/scope-rail';
import { ScreenHeading } from '../sections/screen-heading';
import { SpendDashboard } from '../sections/spend-dashboard';
import {
  formatOverviewSpendLegendValue,
  formatOverviewSpendTooltipValue,
  formatOverviewSpendXTick,
  formatOverviewSpendYTick,
} from '../sections/spend-dashboard/fixtures';
import type { OverviewSnapshot } from './mock-data-provider';
import { RefineMockShell } from './shared-chrome';

function useSelectField(
  initial: string,
  options: RailSelectProps['options'],
  label: string
): RailSelectProps {
  const [value, setValue] = useState(initial);
  return { label, value, options, onChange: setValue };
}

export function RefineOverviewScreen() {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);

  const rangeField = useSelectField('last-30', RANGE_OPTIONS, 'Range');
  const bucketField = useSelectField('daily', BUCKET_OPTIONS, 'Bucket');
  const groupByField = useSelectField('project-model', GROUP_BY_OPTIONS, 'Group by');
  const accountField = useSelectField('adorsys-gis', ACCOUNT_FILTER_OPTIONS, 'Account');
  const projectField = useSelectField('all', PROJECT_FILTER_OPTIONS, 'Project');
  const modelField = useSelectField('all', MODEL_FILTER_OPTIONS, 'Model');

  const overviewQuery = useCustom<OverviewSnapshot>({ url: 'overview', method: 'get' });

  const loading = overviewQuery.query.isLoading;
  const isError = overviewQuery.query.isError;
  const errorMessage = isError ? overviewQuery.query.error?.message : undefined;
  const snapshot = overviewQuery.result.data;

  const status = loading ? 'loading' : isError ? 'error' : 'ready';
  const spendSeries = useMemo(() => snapshot?.spendSeries ?? [], [snapshot]);

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
    <RefineMockShell
      active="overview"
      leftSecondary={
        <RailPanel label={SCOPE_RAIL_LABEL}>
          <ScopeRail accountLabel="adorsys-gis" projectLabel="all projects" />
        </RailPanel>
      }
      leftSecondaryLabel="Scope"
      rail={
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

        {isError ? <InlineStatus>{errorMessage}</InlineStatus> : null}

        <OverviewStatRow cards={snapshot?.statCards ?? []} loading={loading} />

        <SpendDashboard
          series={spendSeries}
          fallbackWidth={872}
          height={176}
          status={status}
          errorMessage={errorMessage}
          onRetry={() => overviewQuery.query.refetch()}
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

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
          <LatencyDashboard
            className="w-full lg:min-w-0 lg:flex-1 lg:basis-[528px]"
            series={snapshot?.latencySeries ?? []}
            fallbackWidth={528}
            height={310}
            status={status}
            errorMessage={errorMessage}
            onRetry={() => overviewQuery.query.refetch()}
            formatXTick={formatOverviewLatencyXTick}
          />
          <BudgetPanel
            className="w-full lg:min-w-0 lg:flex-1 lg:basis-[320px]"
            budget={snapshot?.budget ?? { value: 0, ceiling: 0, caption: '' }}
            needsAttentionProject={snapshot?.needsAttentionProject}
            onRequestRefill={() => {}}
            refillRequestStatus={snapshot?.refillRequestStatus}
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
    </RefineMockShell>
  );
}
