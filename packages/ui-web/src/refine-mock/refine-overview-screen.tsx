// Refine-driven container for the OVERVIEW screen — `useCustom({ url: 'overview' })` against the
// mock provider's aggregation endpoint (console-ui skill "Refine-driven mock screens").
//
// The sections stay pure — this container only adapts hook state (`query.isLoading` → skeleton
// props, `query.isError` → error props, `result.data` → stat cards / chart series / budget) into
// section props, exactly the way `apps/console`'s route does.
//
// Overview supplies NO rail slot at all any more (owner review 2026-08-29) — its parameters are
// an always-visible `OverviewToolbar` in the centre column, so there is no `@rail/page.tsx`
// counterpart for this screen to mirror.

import React, { useState } from 'react';
import { useCustom } from '@refinedev/core';

import { InlineStatus } from '../components/inline-status';
import type { SelectFieldProps } from '../components/select-field';
import { BudgetPanel } from '../sections/budget-panel';
import { LatencyDashboard } from '../sections/latency-dashboard';
import { formatOverviewLatencyXTick } from '../sections/latency-dashboard/fixtures';
import { OverviewStatRow } from '../sections/overview-stat-row';
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
  options: SelectFieldProps['options'],
  label: string
): Omit<SelectFieldProps, 'layout'> {
  const [value, setValue] = useState(initial);
  return { label, value, options, onChange: setValue };
}

export function RefineOverviewScreen() {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);

  const rangeField = useSelectField('last-30', RANGE_OPTIONS, 'Range');
  const bucketField = useSelectField('daily', BUCKET_OPTIONS, 'Bucket');
  const groupByField = useSelectField('project-model', GROUP_BY_OPTIONS, 'Group by');
  const projectField = useSelectField('all', PROJECT_FILTER_OPTIONS, 'Project');
  const modelField = useSelectField('all', MODEL_FILTER_OPTIONS, 'Model');

  const overviewQuery = useCustom<OverviewSnapshot>({ url: 'overview', method: 'get' });

  const loading = overviewQuery.query.isLoading;
  const isError = overviewQuery.query.isError;
  const errorMessage = isError ? overviewQuery.query.error?.message : undefined;
  const snapshot = overviewQuery.result.data;

  const status = loading ? 'loading' : isError ? 'error' : 'ready';
  const spendSeries = snapshot?.spendSeries ?? [];


  return (
    // No rails on this screen at any tier (owner review 2026-08-29) — the parameters live in the
    // always-visible `OverviewToolbar` below the heading.
    <RefineMockShell active="overview">
      <div className="flex flex-col gap-8">
        <ScreenHeading title="Overview" subline="Last 30 days · UTC" />

        {isError ? <InlineStatus>{errorMessage}</InlineStatus> : null}

        <OverviewToolbar
          rangeField={rangeField}
          bucketField={bucketField}
          groupByField={groupByField}
          projectField={projectField}
          modelField={modelField}
          onExport={() => {}}
        />

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
          />
        </div>
      </div>
    </RefineMockShell>
  );
}
