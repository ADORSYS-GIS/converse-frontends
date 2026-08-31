// Page-level acceptance story for the FOUR `/settings/overview/*` analytics lenses (IA v3 phase 5)
// — console-ui skill "Composition": full-page compositions exist in exactly two places, Storybook
// and `apps/console`'s routes. This is the Storybook one, matching the shipped compositions 1:1:
//
//  - `account`/`project`/`user` all render through the ONE shared composition
//    (`apps/console/src/containers/settings-overview-centre.tsx`, driven by `lens`): `PageHeader`
//    (range +, project lens only, a project picker) → the money-first stat row → SPEND OVER TIME
//    (`variant="bars"`, day-bucketed, genuinely sparse) → SPEND BY MODEL (`RankedSeriesRows`) →
//    the lens' own secondary breakdown (by project for account, by API key for project, omitted
//    for user) → LATENCY BY MODEL → account lens only: the cumulative budget burn-down → admin-
//    only, purely additive: project lens → BUDGET PRESSURE, account lens → KEY HYGIENE. Both
//    admin cards are OMITTED (not empty-stated) for a non-admin viewer or the wrong lens.
//  - `usage` (`apps/console/src/containers/usage-overview-centre.tsx`) is the cross-account estate
//    overview: `PageHeader` (range only) → stat row → SPEND OVER TIME (`line`, with the dashed
//    previous-period comparison) → SPEND BY ACCOUNT (`RankedSeriesRows`, with the value/delta sort
//    toggle) → SPEND BY MODEL (`ShareBar` — the one place this primitive still appears).
//
// Every lens' `DateRangeField` defaults to the `'mtd'` ("This month") preset — IA v3 phase 5's
// default-range change — not the old rolling `'30d'`. The `account`/`project`/`user` lenses'
// `PageHeader.subtitle` is IDENTITY text (account/project/user name), matching
// `use-settings-overview-screen.ts`'s own `subtitle` `useMemo` verbatim — it is the `usage` lens
// alone whose subtitle states the range (`Cross-account usage · This month · UTC`,
// `use-usage-overview-screen.ts`'s own `subtitle`). See this file's own final report for why the
// other three lenses do NOT carry "This month · UTC" in their subtitle text: the real container
// simply never puts range wording there, only in the `DateRangeField` control itself.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { DateRangeField, presetRange } from '../components/date-range-field';
import { ErrorLine } from '../components/error-line';
import { InlineStatus } from '../components/inline-status';
import { SegmentedControl } from '../components/segmented-control';
import { SelectField } from '../components/select-field';
import type { SelectFieldOption } from '../components/select-field';
import { ShareBar } from '../components/share-bar';
import type { ShareBarSegment } from '../components/share-bar';
import type { SpendSeriesSeries } from '../components/spend-series-chart';
import { formatUsd, formatUsdAxis } from '../lib/money';
import { DATA_INK_CLASS } from '../lib/type-roles';
import { ZoneHeading } from '../lib/zone-heading';
import { ApiKeysHygieneNotes } from '../sections/api-keys-hygiene-notes';
import { apiKeysHygiene } from '../sections/api-keys-hygiene-notes/fixtures';
import { BudgetPressure } from '../sections/budget-pressure';
import type { BudgetPressureStatus } from '../sections/budget-pressure';
import {
  ADMIN_BUDGET_PRESSURE_NOTE,
  ADMIN_CEILING,
  adminBudgetPressureProjects,
} from '../sections/budget-pressure/fixtures';
import { LatencyStatCards } from '../sections/latency-stat-cards';
import type { LatencyStatRow } from '../sections/latency-stat-cards';
import { latencyStatRows } from '../sections/latency-stat-cards/fixtures';
import { OverviewStatRow } from '../sections/overview-stat-row';
import type { OverviewStatCardData } from '../sections/overview-stat-row';
import { RANGE_PRESETS } from '../sections/overview-controls/fixtures';
import { PageHeader } from '../sections/page-header';
import { RankedSeriesRows } from '../sections/ranked-series-rows';
import type { RankedSeriesRow } from '../sections/ranked-series-rows';
import {
  rankedRowsDominantModel,
  rankedRowsEmpty,
  rankedRowsEstateAccounts,
  rankedRowsSentinelUsers,
  rankedRowsSparseAccount,
} from '../sections/ranked-series-rows/fixtures';
import { SpendDashboard } from '../sections/spend-dashboard';
import type { DashboardStatus } from '../sections/spend-dashboard';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));

function daysFrom(base: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => new Date(base.getTime() + i * 86_400_000));
}

/**
 * The settings-overview lenses' own "Spend over time" is `variant="bars"`, day-bucketed
 * (`settings-overview-centre.tsx` line ~83) — and genuinely SPARSE (build brief §2a/§3: "sparse
 * data ... columns, gaps honest"). Mirrors `spend-series-chart/component.stories.tsx`'s own
 * `SparseGap` story (active on 6 of 17 days, not every day) rather than a dense dataset, so
 * `SpendSeriesChart`'s `.defined()` gap-breaking is visibly exercised in BAR form here, not merely
 * inherited silently from the primitive's own story.
 */
function sparseLensSpendSeries(key: string, label: string): SpendSeriesSeries[] {
  const days = daysFrom(new Date(Date.UTC(2026, 7, 1)), 20);
  const active: [number, number][] = [
    [0, 3.2],
    [2, 5.8],
    [5, 1.1],
    [9, 7.4],
    [13, 2.6],
    [17, 4.0],
  ];
  return [
    {
      key,
      label,
      points: active.map(([dayIndex, y]) => ({ x: days[dayIndex], y })),
    },
  ];
}

// The account lens' cumulative budget burn-down (`screen.burnDown`) — raw per-bucket values, the
// SAME shape `spend-series-chart/component.stories.tsx`'s own `CumulativeBudgetBurnDown` story
// uses; `SpendDashboard`'s `cumulative` prop runs the forward-fill/running-total math, this only
// supplies the per-day deltas. Crosses `BURN_DOWN_CEILING` partway through the month.
const BURN_DOWN_CEILING = ADMIN_CEILING;
const ACCOUNT_BURN_DOWN_SERIES: SpendSeriesSeries[] = [
  {
    key: 'account',
    label: 'This account',
    breached: true,
    points: [1.2, 0, 2.4, 0, 0, 3.1, 1.8, 0, 4.0, 2.2].map((y, i) => ({
      x: daysFrom(new Date(Date.UTC(2026, 7, 1)), 10)[i],
      y,
    })),
  },
];

// The account lens' secondary breakdown ("Spend by project") — no fixture in
// `ranked-series-rows/fixtures.ts` is project-keyed, so this is a small local dataset (console-ui
// skill note in the task brief: prefer a local const over touching a shared fixtures file for a
// one-off shape).
const SECONDARY_PROJECT_ROWS: RankedSeriesRow[] = [
  {
    key: 'proj_gateway',
    label: 'gateway-prod',
    value: 96.4,
    formattedValue: '$96.40',
    sparklinePoints: [60, 66, 71, 78, 84, 89, 93, 96.4],
  },
  {
    key: 'proj_staging',
    label: 'gateway-staging',
    value: 31.8,
    formattedValue: '$31.80',
    sparklinePoints: [20, 22, 24, 26, 28, 29, 30, 31.8],
  },
  {
    key: 'proj_playground',
    label: 'playground',
    value: 6.2,
    formattedValue: '$6.20',
    sparklinePoints: [3, 3.5, 4, 4.5, 5, 5.4, 5.8, 6.2],
  },
];

// The project lens' secondary breakdown ("Spend by API key") — same "no reusable fixture, small
// local const" reasoning as `SECONDARY_PROJECT_ROWS` above.
const SECONDARY_API_KEY_ROWS: RankedSeriesRow[] = [
  {
    key: 'key_prod_a',
    label: 'prod-server-a',
    value: 54.1,
    formattedValue: '$54.10',
    sparklinePoints: [30, 34, 38, 42, 46, 49, 52, 54.1],
  },
  {
    key: 'key_prod_b',
    label: 'prod-server-b',
    value: 9.6,
    formattedValue: '$9.60',
    sparklinePoints: [5, 5.5, 6, 6.8, 7.4, 8, 8.8, 9.6],
  },
  {
    key: 'key_ci',
    label: 'ci-pipeline',
    value: 0.8,
    formattedValue: '$0.80',
    sparklinePoints: [0.2, 0.3, 0.4, 0.5, 0.6, 0.65, 0.72, 0.8],
  },
];

/**
 * `use-settings-overview-screen.ts`'s own `statCards` `useMemo` produces EXACTLY three cards —
 * Requests / Cost / Cost-per-request — with no `delta` and no `sparklineData` (the hook never
 * computes either). `overview-stat-row/fixtures.ts`'s `overviewStatCards` (four cards, WITH delta
 * and sparklines) is the `/` Overview page's own shape, not this one — reusing it here would
 * fabricate trend data this container never provides, which the console-ui skill's "never
 * fabricate a figure" rule rules out. These are lens-scoped local consts instead, in the real
 * container's exact shape.
 */
function settingsStatCards(requests: number, cost: number): OverviewStatCardData[] {
  const costPerRequest = requests > 0 ? cost / requests : 0;
  return [
    { key: 'requests', label: 'Requests', metric: requests.toLocaleString() },
    { key: 'cost', label: 'Cost', metric: formatUsd(cost) },
    { key: 'cost-per-request', label: 'Cost / request', metric: formatUsd(costPerRequest) },
  ];
}

const ACCOUNT_STAT_CARDS = settingsStatCards(18_204, 142.55);
const PROJECT_STAT_CARDS = settingsStatCards(6_412, 61.2);
const USER_STAT_CARDS = settingsStatCards(842, 9.14);

// Same reasoning for the usage lens: `use-usage-overview-screen.ts`'s own `statCards` `useMemo`
// produces Accounts / Requests / Cost, no delta, no sparkline.
const USAGE_STAT_CARDS: OverviewStatCardData[] = [
  { key: 'accounts', label: 'Accounts', metric: '10' },
  { key: 'requests', label: 'Requests', metric: '482,910' },
  { key: 'cost', label: 'Cost', metric: '$1,816.40' },
];

const PROJECT_PICKER_OPTIONS: SelectFieldOption[] = [
  { value: '', label: 'Select a project…' },
  { value: 'proj_gateway', label: 'gateway-prod' },
  { value: 'proj_staging', label: 'gateway-staging' },
];

function skeletonRows(count: number) {
  return (
    <div className="mt-4 flex flex-col gap-1">
      {Array.from({ length: count }, (_, row) => (
        <div key={row} className="skeleton h-[28px]" />
      ))}
    </div>
  );
}

// ── shared per-lens defaults ──────────────────────────────────────────────────────────────────

type SettingsLens = 'account' | 'project' | 'user';

const LENS_TITLE: Record<SettingsLens, string> = {
  account: 'Account overview',
  project: 'Project overview',
  user: 'Your usage',
};

// Identity text, matching `use-settings-overview-screen.ts`'s own `subtitle` `useMemo` — never a
// range/date string (see this file's header comment).
const LENS_SUBTITLE_DEFAULT: Record<SettingsLens, string> = {
  account: 'adorsys-gis',
  project: 'gateway-prod',
  user: 'Sam Lambou',
};

const LENS_SECONDARY_LABEL: Record<SettingsLens, string | undefined> = {
  account: 'Spend by project',
  project: 'Spend by API key',
  user: undefined,
};

const LENS_STAT_CARDS: Record<SettingsLens, OverviewStatCardData[]> = {
  account: ACCOUNT_STAT_CARDS,
  project: PROJECT_STAT_CARDS,
  user: USER_STAT_CARDS,
};

const LENS_MODEL_ROWS: Record<SettingsLens, RankedSeriesRow[]> = {
  account: rankedRowsDominantModel,
  project: rankedRowsSparseAccount,
  user: rankedRowsDominantModel,
};

const LENS_SECONDARY_ROWS: Record<SettingsLens, RankedSeriesRow[]> = {
  account: SECONDARY_PROJECT_ROWS,
  project: SECONDARY_API_KEY_ROWS,
  user: [],
};

interface SettingsOverviewLensScreenProps {
  lens: SettingsLens;
  isAdmin?: boolean;
  /** `false` only demonstrated for the `project` lens (no project selected yet) — every zone
   *  below is disabled rather than fired unscoped, matching `screen.ready`. */
  ready?: boolean;
  subtitle?: string;
  statCards?: OverviewStatCardData[];
  statCardsLoading?: boolean;
  spendSeries?: SpendSeriesSeries[];
  spendStatus?: DashboardStatus;
  spendErrorMessage?: string;
  modelRows?: RankedSeriesRow[];
  modelRowsStatus?: DashboardStatus;
  modelRowsErrorMessage?: string;
  secondaryRows?: RankedSeriesRow[];
  secondaryStatus?: DashboardStatus;
  secondaryErrorMessage?: string;
  secondaryUnassignedCaption?: string | null;
  latencyRows?: LatencyStatRow[];
  latencyStatus?: DashboardStatus;
  burnDownStatus?: DashboardStatus;
  adminPressureStatus?: BudgetPressureStatus;
  adminPressureCeiling?: number | null;
  adminHygieneCaveat?: string;
}

/**
 * The ONE composition behind all three `/settings/overview/{account,project,user}` lenses —
 * mirrors `apps/console/src/containers/settings-overview-centre.tsx` 1:1, render for render.
 */
function SettingsOverviewLensScreen({
  lens,
  isAdmin = false,
  ready = true,
  subtitle = LENS_SUBTITLE_DEFAULT[lens],
  statCards = LENS_STAT_CARDS[lens],
  statCardsLoading = false,
  spendSeries,
  spendStatus = 'ready',
  spendErrorMessage,
  modelRows = LENS_MODEL_ROWS[lens],
  modelRowsStatus = 'ready',
  modelRowsErrorMessage,
  secondaryRows = LENS_SECONDARY_ROWS[lens],
  secondaryStatus = 'ready',
  secondaryErrorMessage,
  secondaryUnassignedCaption = lens === 'account'
    ? 'Unassigned: $6.40 (4.7%) — no project id on these events.'
    : null,
  latencyRows = latencyStatRows,
  latencyStatus = 'ready',
  burnDownStatus = 'ready',
  adminPressureStatus = 'ready',
  adminPressureCeiling = ADMIN_CEILING,
  adminHygieneCaveat,
}: SettingsOverviewLensScreenProps) {
  const resolvedSpendSeries = spendSeries ?? sparseLensSpendSeries(lens, LENS_TITLE[lens]);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
  const [rangePreset, setRangePreset] = useState<string | null>('mtd');
  const [range, setRange] = useState(presetRange('mtd', STORY_TODAY));
  const [projectValue, setProjectValue] = useState(
    lens === 'project' && ready ? 'proj_gateway' : ''
  );

  const secondaryLabel = LENS_SECONDARY_LABEL[lens];

  return (
    <ConsoleShell sidebar={storySidebar('settings', { isAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-8">
        <PageHeader
          title={LENS_TITLE[lens]}
          subtitle={subtitle}
          controls={
            <div className="flex flex-wrap items-end gap-3">
              <DateRangeField
                label="Range"
                presets={RANGE_PRESETS}
                preset={rangePreset}
                value={range}
                today={STORY_TODAY}
                onPresetChange={(next) => {
                  setRangePreset(next);
                  const preset = RANGE_PRESETS.find((p) => p.value === next);
                  if (preset) setRange(presetRange(preset.days, STORY_TODAY));
                }}
                onRangeChange={(next) => {
                  setRangePreset(null);
                  setRange(next);
                }}
                layout="inline"
                hideLabel
              />
              {lens === 'project' ? (
                <SelectField
                  label="Project"
                  value={projectValue}
                  options={PROJECT_PICKER_OPTIONS}
                  onChange={setProjectValue}
                  layout="inline"
                  hideLabel
                />
              ) : null}
            </div>
          }
        />

        {!ready ? (
          <InlineStatus>
            {lens === 'project'
              ? 'Select a project above to see its usage.'
              : 'Resolving your identity…'}
          </InlineStatus>
        ) : (
          <>
            <OverviewStatRow cards={statCards} loading={statCardsLoading} />

            <Card>
              <SpendDashboard
                label="Spend over time"
                series={resolvedSpendSeries}
                status={spendStatus}
                errorMessage={spendErrorMessage}
                onRetry={() => {}}
                variant="bars"
                fallbackWidth={840}
                height={200}
                formatYTick={formatUsdAxis}
                formatTooltipValue={formatUsd}
                onSelectSeries={setSelectedSeriesKey}
              />
            </Card>

            <Card>
              <ZoneHeading label="Spend by model" />
              {modelRowsStatus === 'error' ? (
                <div className="mt-4">
                  <ErrorLine
                    message={modelRowsErrorMessage ?? 'Failed to load spend by model.'}
                    onRetry={() => {}}
                  />
                </div>
              ) : modelRowsStatus === 'loading' ? (
                skeletonRows(4)
              ) : (
                <RankedSeriesRows
                  className="mt-4"
                  rows={modelRows}
                  selectedKey={selectedSeriesKey}
                  onSelect={setSelectedSeriesKey}
                  otherLabel={(count) => `Other (${count} models)`}
                  emptyMessage="No usage in this range."
                />
              )}
            </Card>

            {secondaryLabel ? (
              <Card>
                <ZoneHeading label={secondaryLabel} />
                {secondaryStatus === 'error' ? (
                  <div className="mt-4">
                    <ErrorLine
                      message={secondaryErrorMessage ?? 'Failed to load this breakdown.'}
                      onRetry={() => {}}
                    />
                  </div>
                ) : secondaryStatus === 'loading' ? (
                  skeletonRows(3)
                ) : (
                  <>
                    <RankedSeriesRows
                      className="mt-4"
                      rows={secondaryRows}
                      otherLabel={(count) =>
                        `Other (${count} ${lens === 'account' ? 'projects' : 'keys'})`
                      }
                      emptyMessage="No usage in this range."
                    />
                    {secondaryUnassignedCaption ? (
                      <InlineStatus className="mt-2">{secondaryUnassignedCaption}</InlineStatus>
                    ) : null}
                  </>
                )}
              </Card>
            ) : null}

            <Card title="Latency by model">
              {latencyStatus === 'error' ? (
                <ErrorLine message="Failed to load latency." />
              ) : latencyStatus === 'loading' ? (
                skeletonRows(4)
              ) : (
                <LatencyStatCards rows={latencyRows} />
              )}
            </Card>

            {lens === 'account' ? (
              <Card>
                <SpendDashboard
                  label="Budget burn-down this period"
                  series={burnDownStatus === 'ready' ? ACCOUNT_BURN_DOWN_SERIES : []}
                  status={burnDownStatus}
                  cumulative
                  ceiling={BURN_DOWN_CEILING}
                  fallbackWidth={840}
                  height={200}
                  formatYTick={formatUsdAxis}
                  formatTooltipValue={formatUsd}
                />
              </Card>
            ) : null}

            {/* ── admin-only, purely additive — OMITTED (not empty-stated) for a non-admin or
                the wrong lens (`settings-overview-centre.tsx`'s own doc comment). ── */}
            {lens === 'project' && isAdmin ? (
              <Card>
                <BudgetPressure
                  label="Budget pressure"
                  projects={adminBudgetPressureProjects}
                  ceiling={adminPressureCeiling}
                  status={adminPressureStatus}
                  note={ADMIN_BUDGET_PRESSURE_NOTE}
                  onRetry={() => {}}
                />
              </Card>
            ) : null}

            {lens === 'account' && isAdmin ? (
              <Card title="Key hygiene">
                <InlineStatus>52 active · 4 revoked · 1 expiring within 6 days</InlineStatus>
                <ApiKeysHygieneNotes className="mt-3" hygiene={apiKeysHygiene} />
                {adminHygieneCaveat ? (
                  <InlineStatus className="mt-2">{adminHygieneCaveat}</InlineStatus>
                ) : null}
              </Card>
            ) : null}
          </>
        )}
      </div>
    </ConsoleShell>
  );
}

// ── the fourth lens: `usage`, the cross-account estate overview ─────────────────────────────

interface UsageOverviewScreenProps {
  isAdmin?: boolean;
  statCards?: OverviewStatCardData[];
  statCardsLoading?: boolean;
  spendSeries?: SpendSeriesSeries[];
  spendStatus?: DashboardStatus;
  errorMessage?: string;
  accountRows?: RankedSeriesRow[];
  accountRowsStatus?: DashboardStatus;
  modelSegments?: ShareBarSegment[];
  truncationCaption?: string;
}

const USAGE_MODEL_SEGMENTS: ShareBarSegment[] = [
  { key: 'gpt-4o', label: 'gpt-4o', value: 1_053.5, formattedValue: '$1,053.50' },
  { key: 'gpt-4o-mini', label: 'gpt-4o-mini', value: 199.8, formattedValue: '$199.80' },
  { key: 'claude-opus-4', label: 'claude-opus-4', value: 163.5, formattedValue: '$163.50' },
  { key: 'claude-haiku-4', label: 'claude-haiku-4', value: 145.2, formattedValue: '$145.20' },
  { key: 'text-embedding-3-small', label: 'text-embedding-3-small', value: 72.6, formattedValue: '$72.60' },
  { key: 'other', label: 'Other (3 models)', value: 71.4, formattedValue: '$71.40' },
];

// Dense, line-form (the estate-wide default) — the one place a line reads honestly (build brief
// §4). The dashed second series is the previous-period comparison
// (`toPreviousPeriodSeries`'s own ordering contract: estate total solid/rank-1, previous dashed/
// rank-2).
function usageEstateSpendSeries(): SpendSeriesSeries[] {
  const days = daysFrom(new Date(Date.UTC(2026, 7, 1)), 29);
  const current = [
    620, 640, 655, 700, 690, 710, 735, 742, 760, 758, 780, 795, 810, 802, 820, 835, 850, 842, 860,
    875, 890, 883, 900, 915, 930, 922, 940, 955, 970,
  ];
  const previous = [
    560, 575, 590, 610, 605, 620, 640, 648, 660, 655, 672, 685, 700, 695, 710, 720, 735, 728, 742,
    755, 768, 760, 775, 788, 800, 792, 808, 820, 832,
  ];
  return [
    { key: 'estate', label: 'This period', points: days.map((x, i) => ({ x, y: current[i] })) },
    {
      key: 'estate-previous',
      label: 'Previous period',
      points: days.map((x, i) => ({ x, y: previous[i] })),
    },
  ];
}

/**
 * `/settings/overview/usage` — mirrors `apps/console/src/containers/usage-overview-centre.tsx`
 * 1:1: `PageHeader` (range only, no picker) → stat row → SPEND OVER TIME (line + dashed previous
 * period) → SPEND BY ACCOUNT (`RankedSeriesRows`, value/delta sort toggle) → SPEND BY MODEL
 * (`ShareBar`).
 */
function UsageOverviewScreen({
  isAdmin = false,
  statCards = USAGE_STAT_CARDS,
  statCardsLoading = false,
  spendSeries,
  spendStatus = 'ready',
  errorMessage,
  accountRows = rankedRowsEstateAccounts,
  accountRowsStatus = 'ready',
  modelSegments = USAGE_MODEL_SEGMENTS,
  truncationCaption,
}: UsageOverviewScreenProps) {
  const resolvedSpendSeries = spendSeries ?? usageEstateSpendSeries();
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
  const [accountSort, setAccountSort] = useState<'value' | 'delta'>('value');
  const [rangePreset, setRangePreset] = useState<string | null>('mtd');
  const [range, setRange] = useState(presetRange('mtd', STORY_TODAY));

  const modelTotal = modelSegments.reduce((sum, segment) => sum + segment.value, 0);
  const isError = spendStatus === 'error' || accountRowsStatus === 'error';

  return (
    <ConsoleShell sidebar={storySidebar('settings', { isAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Usage overview"
          subtitle="Cross-account usage · This month · UTC"
          controls={
            <DateRangeField
              label="Range"
              presets={RANGE_PRESETS}
              preset={rangePreset}
              value={range}
              today={STORY_TODAY}
              onPresetChange={(next) => {
                setRangePreset(next);
                const preset = RANGE_PRESETS.find((p) => p.value === next);
                if (preset) setRange(presetRange(preset.days, STORY_TODAY));
              }}
              onRangeChange={(next) => {
                setRangePreset(null);
                setRange(next);
              }}
              layout="inline"
              hideLabel
            />
          }
        />

        {truncationCaption ? <InlineStatus>{truncationCaption}</InlineStatus> : null}

        <OverviewStatRow cards={statCards} loading={statCardsLoading} />

        <Card>
          {isError ? (
            <ErrorLine
              message={errorMessage ?? 'Failed to load the estate overview.'}
              onRetry={() => {}}
            />
          ) : (
            <SpendDashboard
              label="Spend over time"
              series={resolvedSpendSeries}
              status={spendStatus}
              fallbackWidth={840}
              height={220}
              formatYTick={formatUsdAxis}
              formatTooltipValue={formatUsd}
              formatLegendValue={(series) =>
                formatUsd(series.points.reduce((sum, point) => sum + point.y, 0))
              }
              onSelectSeries={setSelectedSeriesKey}
            />
          )}
        </Card>

        <Card>
          <ZoneHeading
            label="Spend by account"
            actions={
              <SegmentedControl
                aria-label="Sort accounts by"
                options={[
                  { value: 'value', label: 'By spend' },
                  { value: 'delta', label: 'By change' },
                ]}
                value={accountSort}
                onChange={setAccountSort}
              />
            }
          />
          {isError ? (
            <div className="mt-4">
              <ErrorLine
                message={errorMessage ?? 'Failed to load spend by account.'}
                onRetry={() => {}}
              />
            </div>
          ) : accountRowsStatus === 'loading' ? (
            skeletonRows(4)
          ) : (
            <RankedSeriesRows
              className="mt-4"
              rows={accountRows}
              sortMode={accountSort}
              selectedKey={selectedSeriesKey}
              onSelect={setSelectedSeriesKey}
              otherLabel={(count) => `Other (${count} accounts)`}
              emptyMessage="No usage in this range."
            />
          )}
        </Card>

        <Card>
          <ZoneHeading
            label="Spend by model"
            trailing={
              modelTotal > 0 && !isError ? (
                <span className={DATA_INK_CLASS}>{formatUsd(modelTotal)}</span>
              ) : undefined
            }
          />
          <ShareBar className="mt-4" segments={isError ? [] : modelSegments} />
        </Card>
      </div>
    </ConsoleShell>
  );
}

const meta: Meta = {
  title: 'Pages/SettingsOverview',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

// ── account lens ──────────────────────────────────────────────────────────────────────────────

export const AccountPopulatedAdmin: Story = {
  name: 'Account — populated, admin (Key hygiene shown)',
  render: () => <SettingsOverviewLensScreen lens="account" isAdmin />,
};

export const AccountPopulatedAdminLight: Story = {
  name: 'Account — populated, admin — wireframe (light)',
  render: () => <SettingsOverviewLensScreen lens="account" isAdmin />,
  globals: { theme: 'wireframe' },
};

// Non-admin: the SAME lens, Key hygiene card omitted entirely (never empty-stated).
export const AccountPopulatedMember: Story = {
  name: 'Account — populated, non-admin (Key hygiene omitted)',
  render: () => <SettingsOverviewLensScreen lens="account" />,
};

export const AccountEmpty: Story = {
  name: 'Account — empty',
  render: () => (
    <SettingsOverviewLensScreen
      lens="account"
      isAdmin
      spendSeries={[]}
      modelRows={rankedRowsEmpty}
      secondaryRows={rankedRowsEmpty}
      secondaryUnassignedCaption={null}
      latencyRows={[]}
    />
  ),
};

export const AccountLoading: Story = {
  name: 'Account — loading',
  render: () => (
    <SettingsOverviewLensScreen
      lens="account"
      isAdmin
      statCardsLoading
      spendStatus="loading"
      modelRowsStatus="loading"
      secondaryStatus="loading"
      latencyStatus="loading"
      burnDownStatus="loading"
      adminPressureStatus="loading"
    />
  ),
};

export const AccountError: Story = {
  name: 'Account — error (Spend over time)',
  render: () => (
    <SettingsOverviewLensScreen
      lens="account"
      spendStatus="error"
      spendErrorMessage="Failed to load usage for this account."
    />
  ),
};

export const AccountMobileBaseTier: Story = {
  name: 'Account — mobile base tier',
  globals: { viewport: { value: 'base390' } },
  render: () => <SettingsOverviewLensScreen lens="account" isAdmin />,
};

export const AccountMobileBaseTierLight: Story = {
  name: 'Account — mobile base tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <SettingsOverviewLensScreen lens="account" isAdmin />,
};

// ── project lens ──────────────────────────────────────────────────────────────────────────────

export const ProjectPopulatedAdmin: Story = {
  name: 'Project — populated, admin (Budget pressure shown)',
  render: () => <SettingsOverviewLensScreen lens="project" isAdmin />,
};

export const ProjectPopulatedAdminLight: Story = {
  name: 'Project — populated, admin — wireframe (light)',
  render: () => <SettingsOverviewLensScreen lens="project" isAdmin />,
  globals: { theme: 'wireframe' },
};

export const ProjectPopulatedMember: Story = {
  name: 'Project — populated, non-admin (Budget pressure omitted)',
  render: () => <SettingsOverviewLensScreen lens="project" />,
};

// The picker has no project selected yet — every zone below is disabled, matching
// `screen.ready === false` on this lens exactly (never fired unscoped).
export const ProjectUnselected: Story = {
  name: 'Project — no project selected',
  render: () => <SettingsOverviewLensScreen lens="project" ready={false} />,
};

export const ProjectEmpty: Story = {
  name: 'Project — empty',
  render: () => (
    <SettingsOverviewLensScreen
      lens="project"
      isAdmin
      spendSeries={[]}
      modelRows={rankedRowsEmpty}
      secondaryRows={rankedRowsEmpty}
      latencyRows={[]}
    />
  ),
};

export const ProjectLoading: Story = {
  name: 'Project — loading',
  render: () => (
    <SettingsOverviewLensScreen
      lens="project"
      isAdmin
      statCardsLoading
      spendStatus="loading"
      modelRowsStatus="loading"
      secondaryStatus="loading"
      latencyStatus="loading"
      adminPressureStatus="loading"
    />
  ),
};

export const ProjectError: Story = {
  name: 'Project — error (Spend by API key)',
  render: () => (
    <SettingsOverviewLensScreen
      lens="project"
      secondaryStatus="error"
      secondaryErrorMessage="Failed to load this breakdown."
    />
  ),
};

export const ProjectMobileBaseTier: Story = {
  name: 'Project — mobile base tier',
  globals: { viewport: { value: 'base390' } },
  render: () => <SettingsOverviewLensScreen lens="project" isAdmin />,
};

export const ProjectMobileBaseTierLight: Story = {
  name: 'Project — mobile base tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <SettingsOverviewLensScreen lens="project" isAdmin />,
};

// ── user lens ─────────────────────────────────────────────────────────────────────────────────

// No admin-only card exists on this lens at all (`settings-overview-centre.tsx`'s own gating) —
// `isAdmin` is exercised on the sidebar's Operator nav group only, not a second populated variant.
export const UserPopulated: Story = {
  name: 'User — populated',
  render: () => <SettingsOverviewLensScreen lens="user" isAdmin />,
};

export const UserPopulatedLight: Story = {
  name: 'User — populated — wireframe (light)',
  render: () => <SettingsOverviewLensScreen lens="user" isAdmin />,
  globals: { theme: 'wireframe' },
};

export const UserEmpty: Story = {
  name: 'User — empty',
  render: () => (
    <SettingsOverviewLensScreen
      lens="user"
      spendSeries={[]}
      modelRows={rankedRowsEmpty}
      latencyRows={[]}
    />
  ),
};

export const UserLoading: Story = {
  name: 'User — loading',
  render: () => (
    <SettingsOverviewLensScreen
      lens="user"
      statCardsLoading
      spendStatus="loading"
      modelRowsStatus="loading"
      latencyStatus="loading"
    />
  ),
};

export const UserError: Story = {
  name: 'User — error (Spend by model)',
  render: () => (
    <SettingsOverviewLensScreen
      lens="user"
      modelRowsStatus="error"
      modelRowsErrorMessage="Failed to load spend by model."
    />
  ),
};

export const UserMobileBaseTier: Story = {
  name: 'User — mobile base tier',
  globals: { viewport: { value: 'base390' } },
  render: () => <SettingsOverviewLensScreen lens="user" />,
};

export const UserMobileBaseTierLight: Story = {
  name: 'User — mobile base tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <SettingsOverviewLensScreen lens="user" />,
};

// ── usage lens (the cross-account estate overview) ───────────────────────────────────────────

// The task brief's explicit "estate overlay with 8+Other rows" ask: `rankedRowsEstateAccounts`
// holds 10 accounts against `RankedSeriesRows`' default `topN` of 8, so 8 individual rows plus one
// folded "Other (2 accounts)" row render with zero extra config.
export const UsageEstatePopulated: Story = {
  name: 'Usage — estate overview (8+Other accounts)',
  render: () => <UsageOverviewScreen />,
};

export const UsageEstatePopulatedLight: Story = {
  name: 'Usage — estate overview — wireframe (light)',
  render: () => <UsageOverviewScreen />,
  globals: { theme: 'wireframe' },
};

/**
 * Sentinel-identity rows on the SAME "Spend by account" `RankedSeriesRows` instance. Judgment
 * call (see this file's final report): neither `use-settings-overview-screen.ts` nor
 * `use-usage-overview-screen.ts` renders a genuinely USER-keyed `RankedSeriesRows` breakdown
 * anywhere today — the `user` lens has no secondary breakdown at all
 * (`SECONDARY_GROUP_BY.user === undefined`), and every other `RankedSeriesRows` instance is
 * project-, API-key-, model- or (here) account-keyed. This estate "Spend by account" list is the
 * closest in shape/semantics — same identity-ranked-list contract, same sparkline/delta columns,
 * the SAME component `sentinelLabel`-resolved rows are designed to flow into — so
 * `rankedRowsSentinelUsers` demonstrates the de-emphasized "Unidentified — Keycloak"/"Unidentified
 * — GitHub" (`subtle`) row treatment here, captioned as illustrative rather than as a literal
 * per-account listing.
 */
export const UsageEstateSentinelIdentities: Story = {
  name: 'Usage — Spend by account, sentinel identities (demo)',
  render: () => <UsageOverviewScreen accountRows={rankedRowsSentinelUsers} />,
};

export const UsageTruncated: Story = {
  name: 'Usage — truncated to the top accounts',
  render: () => <UsageOverviewScreen truncationCaption="Showing the top 25 of 61 accounts." />,
};

export const UsageEmpty: Story = {
  name: 'Usage — empty',
  render: () => (
    <UsageOverviewScreen
      statCards={[
        { key: 'accounts', label: 'Accounts', metric: '0' },
        { key: 'requests', label: 'Requests', metric: '0' },
        { key: 'cost', label: 'Cost', metric: '$0.00' },
      ]}
      spendSeries={[]}
      accountRows={rankedRowsEmpty}
      modelSegments={[]}
    />
  ),
};

export const UsageLoading: Story = {
  name: 'Usage — loading',
  render: () => (
    <UsageOverviewScreen statCardsLoading spendStatus="loading" accountRowsStatus="loading" />
  ),
};

export const UsageError: Story = {
  name: 'Usage — error',
  render: () => (
    <UsageOverviewScreen
      spendStatus="error"
      accountRowsStatus="error"
      errorMessage="Failed to load the estate overview."
    />
  ),
};

export const UsageMobileBaseTier: Story = {
  name: 'Usage — mobile base tier',
  globals: { viewport: { value: 'base390' } },
  render: () => <UsageOverviewScreen />,
};

export const UsageMobileBaseTierLight: Story = {
  name: 'Usage — mobile base tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <UsageOverviewScreen />,
};
