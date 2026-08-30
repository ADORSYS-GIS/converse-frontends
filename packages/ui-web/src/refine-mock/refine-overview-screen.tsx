// Refine-driven container for the OVERVIEW screen — `useCustom({ url: 'overview' })` against the
// mock provider's aggregation endpoint (console-ui skill "Refine-driven mock screens").
//
// The sections stay pure — this container only adapts hook state (`query.isLoading` → skeleton
// props, `query.isError` → error props, `result.data` → stat cards / chart series / budget) into
// section props, and hands the shell its centre and its rail exactly the way `apps/console`'s
// route + `@rail/page.tsx` pair does.
//
// Kept in step with `/`'s real composition (`apps/console/src/containers/overview-centre.tsx`,
// IA v3 phase 4) — brought current 2026-08-31 after drifting behind two real changes: SPEND BY
// MODEL renders through `RankedSeriesRows` now, not the deleted `SpendShareSection` usage here
// (build brief §7), and `/` renders NO admin-only zone at all any more (BUDGET PRESSURE moved to
// `/settings/overview/project`, KEY HYGIENE to `/settings/overview/account` — this mock harness
// has no session/role concept and never rendered them anyway, but the comment claiming they were
// merely "gated off" was itself stale: there is nothing left on `/` to gate). `BudgetPanel`'s own
// props followed suit — `actions`/`heroAction` (IA v3 phase 3, "refill as a page") replace the
// older `needsAttentionProject`/`onRequestRefill`/`refillRequestStatus`/`onReviewInAdmin` shape,
// which `/` stopped passing before this mock was last touched.

import React, { useMemo, useState } from 'react';
import { useCustom } from '@refinedev/core';

import { Card } from '../components/card';
import { InlineStatus } from '../components/inline-status';
import type { SelectFieldProps } from '../components/select-field';
import { Button } from '../components/button';
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
import { RankedSeriesRows } from '../sections/ranked-series-rows';
import { SpendDashboard } from '../sections/spend-dashboard';
import {
  formatOverviewSpendLegendValue,
  formatOverviewSpendTooltipValue,
  formatOverviewSpendXTick,
  formatOverviewSpendYTick,
} from '../sections/spend-dashboard/fixtures';
import { ZoneHeading } from '../lib/zone-heading';
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
  const modelSpendRows = useMemo(() => snapshot?.modelSpendRows ?? [], [snapshot]);

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
            stacked on top of it. `/` renders NO admin-only zone at all (IA v3 phase 4 — see this
            file's own doc comment), so there is nothing to gate here either. */}
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

        {/* Phase 9.2 — "Spend by model" replaces the deleted LATENCY panel, for every user (never
            admin-gated): a second, model-grouped view of the same period `SpendDashboard` above
            plots. Renders through `RankedSeriesRows` (build brief §7), not the deleted
            `SpendShareSection` usage this mock carried before. */}
        <Card>
          <ZoneHeading label="Spend by model" />
          {status === 'error' ? (
            <InlineStatus className="mt-4">{errorMessage}</InlineStatus>
          ) : status === 'loading' ? (
            <div className="mt-4 flex flex-col gap-1">
              {[0, 1, 2].map((row) => (
                <div key={row} className="skeleton h-[28px]" />
              ))}
            </div>
          ) : (
            <RankedSeriesRows
              className="mt-4"
              rows={modelSpendRows}
              selectedKey={selectedSeriesKey}
              onSelect={setSelectedSeriesKey}
              otherLabel={(count) => `Other (${count} models)`}
              emptyMessage="No usage in this range."
            />
          )}
        </Card>

        <Card>
          <BudgetPanel
            className="w-full"
            label="Budget"
            budget={snapshot?.budget ?? { value: 0, ceiling: 0, caption: '' }}
            actions={
              <Button variant="secondary" size="sm" type="button">
                Request refill…
              </Button>
            }
          />
        </Card>
      </div>
    </RefineMockShell>
  );
}
