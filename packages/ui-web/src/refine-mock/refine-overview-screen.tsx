// Refine-driven container for the OVERVIEW screen — `useCustom({ url: 'overview' })` against the
// mock provider's aggregation endpoint (console-ui skill "Refine-driven mock screens").
//
// The sections stay pure — this container only adapts hook state (`query.isLoading` → skeleton
// props, `query.isError` → error props, `result.data` → stat cards / chart series / budget) into
// section props, and hands the shell its centre and its rail exactly the way `apps/console`'s
// route + `@rail/page.tsx` pair does.

import React, { useMemo, useState } from 'react';
import { useCustom } from '@refinedev/core';

import { Card } from '../components/card';
import { InlineStatus } from '../components/inline-status';
import type { SelectFieldProps } from '../components/select-field';
import { BudgetPanel } from '../sections/budget-panel';
import { presetRange } from '../components/date-range-field';
import { OverviewStatRow } from '../sections/overview-stat-row';
import { OverviewControls } from '../sections/overview-controls';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  PROJECT_FILTER_OPTIONS,
  RANGE_PRESETS,
} from '../sections/overview-controls/fixtures';
import { PageHeader } from '../sections/page-header';
import { SpendDashboard } from '../sections/spend-dashboard';
import {
  formatOverviewSpendLegendValue,
  formatOverviewSpendTooltipValue,
  formatOverviewSpendXTick,
  formatOverviewSpendYTick,
} from '../sections/spend-dashboard/fixtures';
import type { OverviewSnapshot } from './mock-data-provider';
import { RefineMockShell } from './shared-chrome';

const MOCK_TODAY = new Date(Date.UTC(2026, 7, 29));

function useSelectField(
  initial: string,
  options: SelectFieldProps['options'],
  label: string
): SelectFieldProps {
  const [value, setValue] = useState(initial);
  return { label, value, options, onChange: setValue };
}

export function RefineOverviewScreen() {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);

  const [rangePreset, setRangePreset] = useState<string | null>('30d');
  const [range, setRange] = useState(presetRange(30, MOCK_TODAY));
  const bucketField = useSelectField('daily', BUCKET_OPTIONS, 'Bucket');
  const groupByField = useSelectField('project-model', GROUP_BY_OPTIONS, 'Group by');
  const projectField = useSelectField('all', PROJECT_FILTER_OPTIONS, 'Project');

  const overviewQuery = useCustom<OverviewSnapshot>({ url: 'overview', method: 'get' });

  const loading = overviewQuery.query.isLoading;
  const isError = overviewQuery.query.isError;
  const errorMessage = isError ? overviewQuery.query.error?.message : undefined;
  const snapshot = overviewQuery.result.data;

  const status = loading ? 'loading' : isError ? 'error' : 'ready';
  const spendSeries = useMemo(() => snapshot?.spendSeries ?? [], [snapshot]);

  return (
    <RefineMockShell active="overview">
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Overview"
          subtitle="Last 30 days · UTC"
          controls={
            <OverviewControls
              rangeField={{
                label: 'Range',
                preset: rangePreset,
                presets: RANGE_PRESETS,
                value: range,
                today: MOCK_TODAY,
                onPresetChange: (next) => {
                  setRangePreset(next);
                  setRange(
                    presetRange(RANGE_PRESETS.find((p) => p.value === next)!.days, MOCK_TODAY)
                  );
                },
                onRangeChange: (next) => {
                  setRangePreset(null);
                  setRange(next);
                },
              }}
              bucketField={bucketField}
              groupByField={groupByField}
              projectField={projectField}
            />
          }
        />

        {isError ? <InlineStatus>{errorMessage}</InlineStatus> : null}

        <OverviewStatRow cards={snapshot?.statCards ?? []} loading={loading} />

        {/* Phase 4 — matches `apps/console/src/containers/overview-centre.tsx`'s own Card
            treatment: each zone below the stat row sits in a `Card`, with its own tracked
            `label` overridden to the composition's name rather than a second `Card.title`
            stacked on top of it. LATENCY moved off this per-user screen in shell revamp phase 4
            (it is now admin-only, gated behind `session.isAdmin` — this mock harness has no
            session/role concept to drive that gate from, so it is left off here rather than
            shown unconditionally, which is what the real container refuses to do too). */}
        <Card>
          <SpendDashboard
            label="Spend over time"
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
        </Card>

        <Card>
          <BudgetPanel
            className="w-full"
            label="Budget"
            budget={snapshot?.budget ?? { value: 0, ceiling: 0, caption: '' }}
            needsAttentionProject={snapshot?.needsAttentionProject}
            onRequestRefill={() => {}}
            refillRequestStatus={snapshot?.refillRequestStatus}
            onReviewInAdmin={() => {}}
          />
        </Card>
      </div>
    </RefineMockShell>
  );
}
