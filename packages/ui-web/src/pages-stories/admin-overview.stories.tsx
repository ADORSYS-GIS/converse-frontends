// Page-level acceptance story for the ADMIN OVERVIEW — the operator's dashboard, as distinct from
// `Pages/Overview`, which is the dashboard per user.
//
// Both pages exist because they answer different questions. `/` is what one person spends and
// holds; latency was deliberately removed from it (owner, 2026-08-29 — per-bucket p95 by model is
// an operator's metric nobody reading their own spend is asking for), and `LatencyDashboard` was
// kept in the library precisely so THIS screen could take it. Reading the two stories side by side
// is the check that the split held.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { InlineStatus } from '../components/inline-status';
import { SubNav } from '../components/sub-nav';
import { presetRange } from '../components/date-range-field';
import type { SelectFieldProps } from '../components/select-field';
import type { LatencyRidgelineSeries } from '../components/latency-ridgeline';
import type { ShareBarSegment } from '../components/share-bar';
import type { SpendSeriesSeries } from '../components/spend-series-chart';
import { formatMsAxis } from '../lib/duration';
import { formatUsd, formatUsdAxis } from '../lib/money';
import { LABEL_CLASS } from '../lib/type-roles';
import { ApiKeysHygieneNotes } from '../sections/api-keys-hygiene-notes';
import { apiKeysHygiene } from '../sections/api-keys-hygiene-notes/fixtures';
import { BudgetPanel } from '../sections/budget-panel';
import type { BudgetSummary } from '../sections/budget-panel';
import { BudgetPressure } from '../sections/budget-pressure';
import type { BudgetPressureProject, BudgetPressureStatus } from '../sections/budget-pressure';
import {
  ADMIN_BUDGET_PRESSURE_NOTE,
  ADMIN_CEILING,
  ADMIN_SPEND_THIS_PERIOD,
  adminBudgetPressureProjects,
} from '../sections/budget-pressure/fixtures';
import { LatencyDashboard } from '../sections/latency-dashboard';
import {
  overviewLatencySeries,
  partiallyReportedLatencySeries,
} from '../sections/latency-dashboard/fixtures';
import { OverviewControls } from '../sections/overview-controls';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  RANGE_PRESETS,
} from '../sections/overview-controls/fixtures';
import { OverviewStatRow } from '../sections/overview-stat-row';
import type { OverviewStatCardData } from '../sections/overview-stat-row';
import { PageHeader } from '../sections/page-header';
import { SpendDashboard } from '../sections/spend-dashboard';
import type { DashboardStatus } from '../sections/spend-dashboard';
import {
  formatOverviewSpendLegendValue,
  formatOverviewSpendTooltipValue,
  formatOverviewSpendXTick,
  overviewSpendSeries,
} from '../sections/spend-dashboard/fixtures';
import { SpendShareSection } from '../sections/spend-share';
import { overviewSpendShareSegments } from '../sections/spend-share/fixtures';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));

/**
 * Operator-scale tiles: the account's projects and keys, the review queue's depth, and the one
 * number the ceiling is judged against.
 *
 * The spend tile, the BUDGET hero and the BUDGET PRESSURE rows are all the same period figure seen
 * three ways — the tile as a total, the hero against the ceiling, the rows decomposed by project —
 * so they are all derived from `ADMIN_SPEND_THIS_PERIOD` rather than typed independently. A page
 * story whose three renderings of one number disagree is worse than no story.
 */
const adminStatCards: OverviewStatCardData[] = [
  { key: 'projects', icon: 'projects', label: 'Projects', metric: '24' },
  { key: 'keys', icon: 'keys', label: 'API keys', metric: '61' },
  { key: 'requests', icon: 'requests', label: 'Refills awaiting review', metric: '4' },
  {
    key: 'spend',
    icon: 'spend',
    label: 'Spend this period',
    metric: formatUsd(ADMIN_SPEND_THIS_PERIOD),
  },
];

const adminBudget: BudgetSummary = {
  value: ADMIN_SPEND_THIS_PERIOD,
  ceiling: ADMIN_CEILING,
  caption: `account ceiling · ${Math.round((ADMIN_SPEND_THIS_PERIOD / ADMIN_CEILING) * 100)}% used this period`,
};

function useSelectField(
  initial: string,
  options: SelectFieldProps['options'],
  label: string
): SelectFieldProps {
  const [value, setValue] = useState(initial);
  return { label, value, options, onChange: setValue };
}

interface AdminOverviewScreenProps {
  statCards?: OverviewStatCardData[];
  spendSeries?: SpendSeriesSeries[];
  spendShareSegments?: ShareBarSegment[];
  spendStatus?: DashboardStatus;
  spendErrorMessage?: string;
  latencySeries?: LatencyRidgelineSeries[];
  latencyStatus?: DashboardStatus;
  latencyFootnote?: string;
  budget?: BudgetSummary;
  pressureProjects?: BudgetPressureProject[];
  pressureCeiling?: number | null;
  pressureStatus?: BudgetPressureStatus;
  hygieneCaveat?: string;
}

// The composition `apps/console`'s `(console)` layout + `/admin?section=overview` perform for
// real: the shell once, sections inside it, the sub-nav and the view controls in the LEFT rail,
// and **no right rail** — nothing on this screen retargets on a selection, so by the console-ui
// rail rule it is a toolbar screen, not a rail screen.
function AdminOverviewScreen({
  statCards = adminStatCards,
  spendSeries = overviewSpendSeries,
  spendShareSegments = overviewSpendShareSegments,
  spendStatus = 'ready',
  spendErrorMessage,
  latencySeries = overviewLatencySeries,
  latencyStatus = 'ready',
  latencyFootnote,
  budget = adminBudget,
  pressureProjects = adminBudgetPressureProjects,
  pressureCeiling = ADMIN_CEILING,
  pressureStatus = 'ready',
  hygieneCaveat,
}: AdminOverviewScreenProps) {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);

  // Storybook-only local state standing in for the page's nuqs URL params (ADR 0011).
  const [rangePreset, setRangePreset] = useState<string | null>('30d');
  const [range, setRange] = useState(presetRange(30, STORY_TODAY));
  const bucketField = useSelectField('daily', BUCKET_OPTIONS, 'Bucket');
  const groupByField = useSelectField('project-model', GROUP_BY_OPTIONS, 'Group by');

  const spendTotal = useMemo(
    () => spendShareSegments.reduce((sum, segment) => sum + segment.value, 0),
    [spendShareSegments]
  );

  return (
    <ConsoleShell sidebar={storySidebar('admin', { isAdmin: true })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* The former `leftSecondary` ADMIN sub-nav — a plain `Card`, visible from `md`, the tier
            the old rail persisted at (shell brief 2026-08-30 dropped the shell's own rail slot;
            this screen has no sheet-trigger equivalent, so it simply doesn't render below `md`,
            same as before). */}
        <div className="hidden w-[208px] flex-none flex-col gap-4 md:flex">
          <Card title="Admin">
            {/* Two sections, one nav entry: `/admin` lands on this dashboard and `?section=refills`
                switches to the review queue. Buttons, not links — the switch is a query-string
                write, not a route change. */}
            <SubNav
              items={[
                { key: 'overview', label: 'Overview', active: true },
                { key: 'refills', label: 'Refill requests', count: 4 },
              ]}
            />
          </Card>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <PageHeader
            title="Admin overview"
            subtitle="Last 30 days · every project in this account · UTC"
            controls={
              // No project or model picker: this screen is account-wide by definition, so a
              // narrowing control it would refuse to apply is omitted, never rendered disabled.
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
              />
            }
          />

          <OverviewStatRow cards={statCards} />

          <SpendDashboard
            label="Spend — every project in this account"
            series={spendSeries}
            status={spendStatus}
            errorMessage={spendErrorMessage}
            fallbackWidth={872}
            height={220}
            onSelectSeries={setSelectedSeriesKey}
            formatXTick={formatOverviewSpendXTick}
            formatYTick={formatUsdAxis}
            formatTooltipValue={formatOverviewSpendTooltipValue}
            formatLegendValue={formatOverviewSpendLegendValue}
          />

          <SpendShareSection
            segments={spendShareSegments}
            status={spendStatus}
            errorMessage={spendErrorMessage}
            selectedKey={selectedSeriesKey}
            onSelectSegment={setSelectedSeriesKey}
            total={spendTotal > 0 ? formatUsd(spendTotal) : undefined}
          />

          {/* Latency, full width — the section `/` gave up. Same usage query as the two spend
            sections above, so they resolve together or fail together. */}
          <LatencyDashboard
            series={latencySeries}
            status={latencyStatus}
            footnote={latencyFootnote}
            fallbackWidth={872}
            height={310}
            formatXTick={formatMsAxis}
          />

          <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
            <BudgetPressure
              className="w-full lg:min-w-0 lg:flex-1 lg:basis-[528px]"
              projects={pressureProjects}
              ceiling={pressureCeiling}
              status={pressureStatus}
              note={ADMIN_BUDGET_PRESSURE_NOTE}
            />
            <BudgetPanel
              className="w-full lg:min-w-0 lg:flex-1 lg:basis-[320px]"
              budget={budget}
              refillRequestStatus={{
                pendingCount: 4,
                submittedLabel: 'oldest submitted 2 days ago',
              }}
              onReviewInAdmin={() => {}}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className={LABEL_CLASS}>Key hygiene — every project in this account</span>
            <InlineStatus>52 active · 7 revoked · 2 expiring within 30 days</InlineStatus>
            <ApiKeysHygieneNotes hygiene={apiKeysHygiene} />
            {hygieneCaveat ? <InlineStatus>{hygieneCaveat}</InlineStatus> : null}
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}

const meta: Meta<typeof AdminOverviewScreen> = {
  title: 'Pages/AdminOverview',
  component: AdminOverviewScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AdminOverviewScreen>;

/** `lg` (≥1024, the default story viewport). Fluid — the page follows the iframe's real width. */
export const Populated: Story = { render: () => <AdminOverviewScreen /> };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <AdminOverviewScreen />,
  globals: { theme: 'wireframe' },
};

/**
 * The per-series latency honesty this screen inherits from `/`'s wiring: the query succeeded, and
 * one group within it genuinely reported no samples. It stays in the ridgeline and is NAMED below
 * it — never dropped, never given a fabricated shape, never turned into a panel-wide error.
 */
export const LatencyPartiallyReported: Story = {
  render: () => (
    <AdminOverviewScreen
      latencySeries={partiallyReportedLatencySeries}
      latencyFootnote="No latency reported for signal-summary — aggregate metric signals carry a bucketed distribution, not a per-request duration."
    />
  ),
};

/**
 * No ceiling could be read: the pressure rows keep their real spend and drop their meters, rather
 * than filling a track against a fabricated ceiling.
 */
export const NoCeiling: Story = {
  render: () => (
    <AdminOverviewScreen
      pressureCeiling={null}
      budget={{
        status: 'error',
        errorMessage: 'Failed to load the account budget ceiling.',
        onRetry: () => {},
      }}
    />
  ),
};

/** A real, wired account that genuinely consumed nothing: structure stays, numbers do not appear. */
export const Empty: Story = {
  render: () => (
    <AdminOverviewScreen
      statCards={[
        { key: 'projects', icon: 'projects', label: 'Projects', metric: '3' },
        { key: 'keys', icon: 'keys', label: 'API keys', metric: '2' },
        { key: 'requests', icon: 'requests', label: 'Refills awaiting review', metric: '0' },
        { key: 'spend', icon: 'spend', label: 'Spend this period', metric: '$0.00' },
      ]}
      spendSeries={[]}
      spendShareSegments={[]}
      latencySeries={[]}
      pressureProjects={[]}
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <AdminOverviewScreen
      spendStatus="loading"
      latencyStatus="loading"
      budget={{ status: 'loading' }}
      pressureStatus="loading"
    />
  ),
};

/** The usage query failed. Every zone it feeds says so, together — none falls back to a zero. */
export const Errored: Story = {
  render: () => (
    <AdminOverviewScreen
      spendStatus="error"
      spendErrorMessage="The usage backend is unreachable right now."
      latencyStatus="error"
      budget={{
        status: 'error',
        errorMessage: 'The usage backend is unreachable right now.',
        onRetry: () => {},
      }}
      pressureStatus="error"
    />
  ),
};

/**
 * The account holds more keys than one page, so the hygiene counts are partial — and say so,
 * rather than reading as a complete audit.
 */
export const PartialKeyCount: Story = {
  render: () => (
    <AdminOverviewScreen hygieneCaveat="Counted over the first 100 of 214 keys the listing returned — any of this account’s keys beyond that page are not included." />
  ),
};

/** Base tier (<600), the designed phone target: nothing clips, nothing scrolls sideways. */
export const Mobile: Story = {
  render: () => <AdminOverviewScreen />,
  globals: { viewport: { value: 'base390' } },
};

export const MobileLight: Story = {
  name: 'Mobile — wireframe (light)',
  render: () => <AdminOverviewScreen />,
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};
