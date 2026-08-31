// Page-level acceptance story for OVERVIEW (`/`) — console-ui skill "Composition": full-page
// compositions exist in exactly two places, Storybook and `apps/console`'s routes. This is the
// Storybook one, rewritten (IA v3 Phase 5) to match the SHIPPED composition
// (`apps/console/src/containers/overview-centre.tsx`) 1:1 rather than the pre-phase-4 mockup this
// file used to track:
//
//  - `PageHeader` (inline `OverviewControls` + the `Export` action) → the money-first stat row →
//    SPEND OVER TIME (`SpendDashboard`, line) → SPEND BY PROJECT (`SpendShareSection`) → SPEND BY
//    MODEL (`RankedSeriesRows`, NOT `SpendShareSection`/`ShareBar` — phase 4 build brief §7) →
//    BUDGET (`BudgetPanel`, `actions`/`heroAction` — IA v3 phase 3's "refill as a page" shape).
//  - **NO admin-only zone renders on this page any more.** Budget pressure and key hygiene moved
//    to `/settings/overview/project` and `/settings/overview/account` respectively — see
//    `pages-stories/settings-overview.stories.tsx` for those. The old `adminExtras` block (Budget
//    pressure / Key hygiene / Refill requests cards) is deleted here, not just hidden — rendering
//    it would misrepresent what `/` actually shows an admin today.
//  - Default range is **`mtd`** ("This month") — IA v3 phase 5: the budget resets monthly, so the
//    dashboard defaults to the billing window, not a rolling 30-day span. The old
//    `subtitle="Last 30 days · UTC"` literal is gone with it.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { presetRange } from '../components/date-range-field';
import { ErrorLine } from '../components/error-line';
import { InlineStatus } from '../components/inline-status';
import { ReportExportDialog } from '../components/report-export-dialog';
import type { ReportExportFormat, ReportIncludeToggle } from '../components/report-export-panel';
import { ScopeSelect } from '../components/scope-select';
import { scopeAccounts, scopeProjects, scopeSelectValue } from '../components/scope-select/fixtures';
import type { SelectFieldProps } from '../components/select-field';
import type { ShareBarSegment } from '../components/share-bar';
import type { SpendSeriesSeries } from '../components/spend-series-chart';
import { formatUsd, formatUsdAxis } from '../lib/money';
import { ZoneHeading } from '../lib/zone-heading';
import { BudgetPanel } from '../sections/budget-panel';
import type { BudgetSummary } from '../sections/budget-panel';
import {
  overviewBudget,
  overviewEmptyBudget,
  overviewErrorBudget,
  overviewLoadingBudget,
  overviewUnwiredBudget,
} from '../sections/budget-panel/fixtures';
import { OverviewControls } from '../sections/overview-controls';
import {
  BUCKET_OPTIONS,
  PROJECT_FILTER_OPTIONS,
  RANGE_PRESETS,
} from '../sections/overview-controls/fixtures';
import { OverviewStatRow } from '../sections/overview-stat-row';
import type { OverviewStatCardData } from '../sections/overview-stat-row';
import {
  overviewEmptyStatCards,
  overviewStatCards,
} from '../sections/overview-stat-row/fixtures';
import { PageHeader } from '../sections/page-header';
import { RankedSeriesRows } from '../sections/ranked-series-rows';
import type { RankedSeriesRow } from '../sections/ranked-series-rows';
import { rankedRowsDominantModel, rankedRowsEmpty } from '../sections/ranked-series-rows/fixtures';
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
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));

// Every choice OverviewControls has offered the toolbar since IA v3 phase 4's "By project"/"By
// model"/"By user"/"By API key" vocabulary widening (`use-overview-screen.ts`'s own
// `GROUP_BY_OPTIONS`) — mirrored here rather than re-imported since `url-state.ts` is `apps/
// console`-only.
const GROUP_BY_OPTIONS: SelectFieldProps['options'] = [
  { value: 'project_id', label: 'By project' },
  { value: 'model', label: 'By model' },
  { value: 'user_id', label: 'By user' },
  { value: 'api_key_id', label: 'By API key' },
];

const REPORT_GROUP_BY_OPTIONS: SelectFieldProps['options'] = [
  { value: 'project_id', label: 'Project' },
  { value: 'model', label: 'Model' },
  { value: 'user_id', label: 'User' },
  { value: 'api_key_id', label: 'API key' },
];

function useSelectField(
  initial: string,
  options: SelectFieldProps['options'],
  label: string
): SelectFieldProps {
  const [value, setValue] = useState(initial);
  return { label, value, options, onChange: setValue };
}

interface OverviewScreenProps {
  showAdmin?: boolean;
  statCards?: OverviewStatCardData[];
  statCardsLoading?: boolean;
  spendSeries?: SpendSeriesSeries[];
  spendStatus?: DashboardStatus;
  spendErrorMessage?: string;
  spendDegenerateMessage?: string;
  spendShareSegments?: ShareBarSegment[];
  spendShareStatus?: DashboardStatus;
  spendUnassignedCaption?: string;
  modelSpendRows?: RankedSeriesRow[];
  modelSpendStatus?: DashboardStatus;
  modelSpendErrorMessage?: string;
  budget?: BudgetSummary;
  /** Only present once the account is breached — mirrors `use-overview-screen.ts`'s own
   *  `refillAction`, which `BudgetPanel.heroAction` renders beside the numeral (ADR 0008 D7). */
  refillAction?: { label: string; href: string };
}

// The composition `apps/console`'s `(console)` layout + `/accounts/[accountId]/overview` route
// perform for real (`overview-centre.tsx`) — sections inside `ConsoleShell`, view params inline
// in `PageHeader.controls` (shell revamp — the rail carries no knobs, only selection-driven
// detail/standing account settings).
function OverviewScreen({
  showAdmin = false,
  statCards = overviewStatCards,
  statCardsLoading = false,
  spendSeries = overviewSpendSeries,
  spendStatus = 'ready',
  spendErrorMessage,
  spendDegenerateMessage,
  spendShareSegments = overviewSpendShareSegments,
  spendShareStatus = 'ready',
  spendUnassignedCaption,
  modelSpendRows = rankedRowsDominantModel,
  modelSpendStatus = 'ready',
  modelSpendErrorMessage,
  budget = overviewBudget,
  refillAction,
}: OverviewScreenProps) {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);

  // Storybook-only local state standing in for the page's nuqs URL params (ADR 0011) — 'mtd'
  // ("This month") is the real default range (IA v3 phase 5), not the old '30d'.
  const [rangePreset, setRangePreset] = useState<string | null>('mtd');
  const [range, setRange] = useState(presetRange('mtd', STORY_TODAY));
  const bucketField = useSelectField('daily', BUCKET_OPTIONS, 'Bucket');
  const groupByField = useSelectField('project_id', GROUP_BY_OPTIONS, 'Group by');
  const projectField = useSelectField('all', PROJECT_FILTER_OPTIONS, 'Project');

  // The Export dialog's own demo state — mirrors `use-overview-screen.ts`'s `report`, which reuses
  // the SAME `format`/`include`/`period` parsers `/manage`'s report dialog does (see
  // `url-state.ts`'s own doc comment on why those three are literally shared instances).
  const [reportOpen, setReportOpen] = useState(false);
  const [period, setPeriod] = useState('2026-08');
  const [reportGroupBy, setReportGroupBy] = useState('project_id');
  const [format, setFormat] = useState<ReportExportFormat>('csv');
  const [generating, setGenerating] = useState(false);
  const [includeToggles, setIncludeToggles] = useState<ReportIncludeToggle[]>([
    { id: 'totals', label: 'Totals row', checked: true },
    { id: 'per-model', label: 'Per-model breakdown', checked: false },
  ]);

  const spendShareTotal = spendShareSegments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <ConsoleShell sidebar={storySidebar('overview', { isAdmin: showAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Overview"
          subtitle={`adorsys-gis · All projects · ${
            rangePreset === 'mtd' ? 'This month' : 'Custom range'
          } · UTC`}
          controls={
            <OverviewControls
              rangeField={{
                label: 'Range',
                preset: rangePreset,
                presets: RANGE_PRESETS,
                value: range,
                today: STORY_TODAY,
                onPresetChange: (next) => {
                  setRangePreset(next);
                  setRange(
                    presetRange(RANGE_PRESETS.find((p) => p.value === next)!.days, STORY_TODAY)
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
          action={
            <Button type="button" variant="secondary" onClick={() => setReportOpen(true)}>
              Export
            </Button>
          }
        />

        <OverviewStatRow cards={statCards} loading={statCardsLoading} />

        <ReportExportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          period={period}
          onPeriodChange={setPeriod}
          scopeSlot={
            <ScopeSelect
              accounts={scopeAccounts}
              projects={scopeProjects}
              value={scopeSelectValue}
              onChange={() => {}}
            />
          }
          groupByOptions={REPORT_GROUP_BY_OPTIONS}
          groupBy={reportGroupBy}
          onGroupByChange={setReportGroupBy}
          includeToggles={includeToggles}
          onToggleInclude={(id, checked) =>
            setIncludeToggles((prev) => prev.map((t) => (t.id === id ? { ...t, checked } : t)))
          }
          format={format}
          onFormatChange={setFormat}
          generating={generating}
          onGenerate={() => {
            setGenerating(true);
            setTimeout(() => setGenerating(false), 400);
          }}
        />

        {/* Every zone below the stat row sits in a `Card` (ADR 0012 D3) — a section that already
            renders its own tracked heading (`SpendDashboard`, `SpendShareSection`) gets its
            `label` overridden to the name this composition wants, never a stacked `Card.title`. */}
        <Card>
          <SpendDashboard
            label="Spend over time"
            series={spendSeries}
            status={spendStatus}
            errorMessage={spendErrorMessage}
            onRetry={() => {}}
            degenerateMessage={spendDegenerateMessage}
            fallbackWidth={840}
            height={220}
            formatXTick={formatOverviewSpendXTick}
            formatYTick={formatOverviewSpendYTick}
            formatTooltipValue={formatOverviewSpendTooltipValue}
            formatLegendValue={formatOverviewSpendLegendValue}
            onSelectSeries={setSelectedSeriesKey}
          />
        </Card>

        <Card>
          <SpendShareSection
            label="Spend by project"
            segments={spendShareSegments}
            status={spendShareStatus}
            onRetry={() => {}}
            selectedKey={selectedSeriesKey}
            onSelectSegment={setSelectedSeriesKey}
            total={spendShareTotal > 0 ? formatUsd(spendShareTotal) : undefined}
          />
          {spendUnassignedCaption ? (
            <InlineStatus className="mt-2">{spendUnassignedCaption}</InlineStatus>
          ) : null}
        </Card>

        {/* Phase 4 build brief §7 — SPEND BY MODEL renders through `RankedSeriesRows`, not
            `SpendShareSection`/`ShareBar`: a single model handling ~all of an account's traffic is
            the common case, and `ShareBar`'s flat share-of-total reading breaks down exactly there.
            Replaces the deleted LATENCY panel (phase 9.2 — the usage backend's events are
            aggregate metric signals with no per-request duration, so that panel could never
            honestly fill), for every user, never admin-gated. */}
        <Card>
          <ZoneHeading label="Spend by model" />
          {modelSpendStatus === 'error' ? (
            <div className="mt-4">
              <ErrorLine
                message={modelSpendErrorMessage ?? 'Failed to load spend by model.'}
                onRetry={() => {}}
              />
            </div>
          ) : modelSpendStatus === 'loading' ? (
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
            budget={budget}
            actions={
              <Button type="button" variant="secondary" size="sm" onClick={() => {}}>
                Request refill…
              </Button>
            }
            heroAction={
              refillAction ? (
                <Button type="button" variant="primary" size="sm" onClick={() => {}}>
                  {refillAction.label}
                </Button>
              ) : undefined
            }
          />
        </Card>
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

// README §6: axes/structure stay rendered — each section's own empty-state rendering (`No usage
// in this range.` etc.) carries the "nothing yet" story, never a page-level banner bolted on top.
export const Empty: Story = {
  render: () => (
    <OverviewScreen
      statCards={overviewEmptyStatCards}
      spendSeries={[]}
      spendShareSegments={[]}
      modelSpendRows={rankedRowsEmpty}
      budget={overviewEmptyBudget}
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
      modelSpendStatus="loading"
      budget={overviewLoadingBudget}
    />
  ),
};

// README §6 error rules: section-level ErrorLine + Retry — one dashboard failing must never take
// its neighbours down. Exercises SPEND BY MODEL's own failure path independently of BUDGET's.
export const DashboardError: Story = {
  render: () => (
    <OverviewScreen
      modelSpendStatus="error"
      modelSpendErrorMessage="Failed to load spend by model."
      budget={overviewErrorBudget}
    />
  ),
};

// Build brief finish-item §2 — a single-series SPEND chart states the one series by name rather
// than drawing a flat, misleadingly-singular band.
export const SpendDegenerate: Story = {
  name: 'Spend over time — a single series states itself, not a flat band',
  render: () => (
    <OverviewScreen
      spendSeries={overviewSpendSeries.slice(0, 1)}
      spendDegenerateMessage={`Only one project in this window (${overviewSpendSeries[0].label}).`}
    />
  ),
};

// #306 — the account is past `BUDGET_BREACH_THRESHOLD` (0.9): `BudgetHero`'s own accent kicks in
// and the inline refill control (`heroAction`) appears beside the numeral (ADR 0008 D7), on top of
// the always-visible `actions` "Request refill…" the header row already carries.
export const BudgetBreached: Story = {
  render: () => (
    <OverviewScreen
      budget={{ value: 478.2, ceiling: 500, caption: 'account ceiling · 96% used · resets 01 Sep' }}
      refillAction={{ label: 'Request refill', href: '/accounts/acct_1/refill' }}
    />
  ),
};

// A signed-in non-admin — `/` renders IDENTICAL content either way (no admin-only zone left on
// this page, IA v3 phase 4); this only exercises the sidebar's own Operator nav row.
export const AdminNav: Story = {
  name: 'Nav — admin (Operator group visible)',
  render: () => <OverviewScreen showAdmin />,
};

// `md` tier (600–1024): left rail persists inline; Overview has no right rail at any tier — its
// parameters are `OverviewControls`, inline in `PageHeader.controls`, which simply wraps here.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <OverviewScreen />,
};

// Base tier (<600): single column, stacked stat cards, nav docked as a fixed bottom navigation
// bar, `PageHeader.controls` wraps onto its own rows.
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
