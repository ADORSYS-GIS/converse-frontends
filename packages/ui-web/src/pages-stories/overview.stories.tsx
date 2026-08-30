// Page-level acceptance story for OVERVIEW — console-ui skill "Composition": full-page
// compositions exist in exactly two places, Storybook and `apps/console`'s routes. This is the
// Storybook one: sections composed inside `ConsoleShell` with the section fixtures, 1:1 against
// docs/design/console-redesign/overview.svg, so a whole screen can be checked without starting
// the app.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { presetRange } from '../components/date-range-field';
import type { SelectFieldProps } from '../components/select-field';
import { InlineStatus } from '../components/inline-status';
import { LABEL_CLASS } from '../lib/type-roles';
import { ApiKeysHygieneNotes } from '../sections/api-keys-hygiene-notes';
import { apiKeysHygiene } from '../sections/api-keys-hygiene-notes/fixtures';
import { BudgetPanel } from '../sections/budget-panel';
import {
  overviewBudget,
  overviewEmptyBudget,
  overviewNeedsAttentionProject,
  overviewRefillRequestStatus,
  overviewUnwiredBudget,
} from '../sections/budget-panel/fixtures';
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
import { OverviewStatRow } from '../sections/overview-stat-row';
import { OverviewControls } from '../sections/overview-controls';
import {
  BUCKET_OPTIONS,
  GROUP_BY_OPTIONS,
  PROJECT_FILTER_OPTIONS,
  RANGE_PRESETS,
} from '../sections/overview-controls/fixtures';
import {
  overviewEmptyStatCards,
  overviewStatCards,
  overviewUnwiredStatCards,
} from '../sections/overview-stat-row/fixtures';
import { PageHeader } from '../sections/page-header';
import { UNWIRED_CHART_MESSAGE } from '../sections/unwired-chart-message';
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
import { formatMsAxis } from '../lib/duration';
import { formatUsd } from '../lib/money';
import type { ShareBarSegment } from '../components/share-bar';
import type { SpendSeriesSeries } from '../components/spend-series-chart';
import type { LatencyRidgelineSeries } from '../components/latency-ridgeline';
import type { OverviewStatCardData } from '../sections/overview-stat-row';
import type { BudgetSummary } from '../sections/budget-panel';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));

function useSelectField(
  initial: string,
  options: SelectFieldProps['options'],
  label: string
): SelectFieldProps {
  const [value, setValue] = useState(initial);
  return { label, value, options, onChange: setValue };
}

/**
 * Salvaged verbatim from the deleted `admin-overview.stories.tsx` (shell revamp phase 4, 2026-08-
 * 30 — `/admin?section=overview` merged into `/` itself, gated by `session.isAdmin`; see
 * `apps/console/src/containers/use-overview-screen.ts`'s doc comment for the real adapter this
 * fixture set mirrors). The BUDGET PRESSURE rows and this fixed spend figure are the same period
 * total the STAT ROW and BUDGET hero also show — three renderings of one number, kept in sync here
 * the same way `use-overview-screen.ts` derives all three from the same query.
 */
const adminPressureProjects = adminBudgetPressureProjects;
const adminPressureCeiling = ADMIN_CEILING;
const adminBudgetSummary: BudgetSummary = {
  value: ADMIN_SPEND_THIS_PERIOD,
  ceiling: ADMIN_CEILING,
  caption: `account ceiling · ${Math.round((ADMIN_SPEND_THIS_PERIOD / ADMIN_CEILING) * 100)}% used this period`,
};

interface OverviewScreenProps {
  showAdmin?: boolean;
  /**
   * The four ADMIN-ONLY additive cards (Budget pressure, Latency, Key hygiene, Refill requests) —
   * a separate axis from `showAdmin` (which only toggles the sidebar's Operator nav group): a nav
   * item being visible and this screen's own role-gated content are two different facts, exactly
   * as `use-overview-screen.ts`'s `isAdmin` gate is independent of `console-chrome.tsx`'s own.
   */
  adminExtras?: boolean;
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
  pressureProjects?: BudgetPressureProject[];
  pressureCeiling?: number | null;
  pressureStatus?: BudgetPressureStatus;
  hygieneCaveat?: string;
}

// The composition `apps/console`'s `(console)` layout + `/` route perform for real — the shell
// once, sections inside it, with the VIEW parameters as a horizontal cluster in
// `PageHeader.controls` (shell brief 2026-08-30 — the rail is gone; every screen's own knobs move
// to its `PageHeader`).
function OverviewScreen({
  showAdmin = false,
  adminExtras = false,
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
  latencyFootnote,
  budget = overviewBudget,
  needsAttention = overviewNeedsAttentionProject,
  refillRequestStatus = overviewRefillRequestStatus,
  pressureProjects = adminPressureProjects,
  pressureCeiling = adminPressureCeiling,
  pressureStatus = 'ready',
  hygieneCaveat,
}: OverviewScreenProps) {
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);

  // Storybook-only local state standing in for the page's nuqs URL params (ADR 0011).
  const [rangePreset, setRangePreset] = useState<string | null>('30d');
  const [range, setRange] = useState(presetRange(30, STORY_TODAY));
  const bucketField = useSelectField('daily', BUCKET_OPTIONS, 'Bucket');
  const groupByField = useSelectField('project-model', GROUP_BY_OPTIONS, 'Group by');
  const projectField = useSelectField('all', PROJECT_FILTER_OPTIONS, 'Project');

  const spendShareTotal = useMemo(
    () => spendShareSegments.reduce((sum, segment) => sum + segment.value, 0),
    [spendShareSegments]
  );

  return (
    <ConsoleShell sidebar={storySidebar('overview', { isAdmin: showAdmin })} topBar={storyTopBar()}>
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
            <Button type="button" variant="secondary" onClick={() => {}}>
              Export
            </Button>
          }
        />

        {emptyMessage ? <InlineStatus>{emptyMessage}</InlineStatus> : null}

        <OverviewStatRow cards={statCards} loading={statCardsLoading} />

        {/* Phase 4 — every dashboard zone below the stat row sits in a `Card`; a section that
            already renders its own tracked heading (`SpendDashboard`, `SpendShareSection`,
            `BudgetPanel`, `BudgetPressure`, `LatencyDashboard`) gets its `label` overridden to the
            name this composition wants and no `Card.title` of its own — one heading per zone,
            never two stacked. */}
        <Card>
          <SpendDashboard
            label="Spend over time"
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
        </Card>

        <Card>
          <BudgetPanel
            className="w-full"
            label="Budget"
            budget={budget}
            needsAttentionProject={needsAttention}
            onRequestRefill={() => {}}
            refillRequestStatus={refillRequestStatus}
            onReviewInAdmin={() => {}}
          />
        </Card>

        {/* ── admin-only, purely additive (`adminExtras`) — mirrors
            `apps/console/src/containers/overview-centre.tsx`'s own `screen.isAdmin` block. LATENCY
            moved here from the per-user row above it in shell revamp phase 4: per-bucket p95 by
            model is an operator's metric, not something everyone reading their own spend asks
            for. */}
        {adminExtras ? (
          <>
            <Card>
              <BudgetPressure
                label="Budget pressure"
                projects={pressureProjects}
                ceiling={pressureCeiling}
                status={pressureStatus}
                note={ADMIN_BUDGET_PRESSURE_NOTE}
              />
            </Card>

            <Card>
              <LatencyDashboard
                label="Latency"
                series={latencySeries}
                fallbackWidth={872}
                height={220}
                status={latencyStatus}
                errorMessage={latencyErrorMessage}
                unwiredMessage={latencyUnwiredMessage}
                footnote={latencyFootnote}
                onRetry={() => {}}
                formatXTick={formatMsAxis}
              />
            </Card>

            <Card title="Key hygiene">
              <InlineStatus>52 active · 7 revoked · 2 expiring within 30 days</InlineStatus>
              <ApiKeysHygieneNotes className="mt-3" hygiene={apiKeysHygiene} />
              {hygieneCaveat ? <InlineStatus className="mt-2">{hygieneCaveat}</InlineStatus> : null}
            </Card>

            {refillRequestStatus ? (
              <Card title="Refill requests">
                <p className="text-soft font-mono text-[11px]">
                  {refillRequestStatus.pendingCount} pending · {refillRequestStatus.submittedLabel}
                </p>
                <span className="text-soft mt-1 inline-block font-mono text-[11px] underline-offset-2">
                  Review →
                </span>
              </Card>
            ) : null}
          </>
        ) : null}
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
      spendShareSegments={[]}
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
      spendShareSegments={[]}
      spendShareStatus="unwired"
      latencySeries={[]}
      latencyStatus="unwired"
      budget={overviewUnwiredBudget}
      needsAttention={undefined}
      refillRequestStatus={undefined}
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

// ── phase 4: the admin-only additive block — Budget pressure, Latency, Key hygiene, Refill
// requests. These replace `Pages/AdminOverview` (deleted this phase): the dashboard it depicted
// merged into `/` itself, gated by `session.isAdmin` rather than living behind a second route.
export const AdminExtras: Story = {
  name: 'Admin — the four additive cards',
  // Operator-scale BUDGET, matching the account-wide numbers BUDGET PRESSURE below shows — the
  // same "one figure, three renderings, kept in sync" property `use-overview-screen.ts` gets from
  // deriving all three off the same query.
  render: () => <OverviewScreen showAdmin adminExtras budget={adminBudgetSummary} />,
};

export const AdminExtrasLight: Story = {
  name: 'Admin — the four additive cards — wireframe (light)',
  render: () => <OverviewScreen showAdmin adminExtras budget={adminBudgetSummary} />,
  globals: { theme: 'wireframe' },
};

// The per-series latency honesty this block inherits from the deleted admin-overview story: the
// query succeeded, and one group within it genuinely reported no samples. It stays in the
// ridgeline and is NAMED below it — never dropped, never given a fabricated shape.
export const AdminExtrasLatencyPartiallyReported: Story = {
  name: 'Admin — Latency, partially reported',
  render: () => (
    <OverviewScreen
      showAdmin
      adminExtras
      latencySeries={partiallyReportedLatencySeries}
      latencyFootnote="No latency reported for signal-summary — aggregate metric signals carry a bucketed distribution, not a per-request duration."
    />
  ),
};

// No ceiling could be read: the pressure rows keep their real spend and drop their meters, rather
// than filling a track against a fabricated ceiling.
export const AdminExtrasNoCeiling: Story = {
  name: 'Admin — Budget pressure, no ceiling',
  render: () => (
    <OverviewScreen
      showAdmin
      adminExtras
      pressureCeiling={null}
      budget={{
        status: 'error',
        errorMessage: 'Failed to load the account budget ceiling.',
        onRetry: () => {},
      }}
    />
  ),
};

// The account holds more keys than one page, so the hygiene counts are partial — and say so,
// rather than reading as a complete audit.
export const AdminExtrasPartialKeyCount: Story = {
  name: 'Admin — Key hygiene, partial count',
  render: () => (
    <OverviewScreen
      showAdmin
      adminExtras
      hygieneCaveat="Counted over the first 100 of 214 keys the listing returned — any of this account’s keys beyond that page are not included."
    />
  ),
};

// `md` tier (600–1024): left rail persists inline; Overview has no right rail at any tier — its
// parameters are `OverviewControls`, inline in `PageHeader.controls`, which simply wraps here.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <OverviewScreen />,
};

// Base tier (<600, a designed target): single column, stacked stat cards, nav docked as a fixed
// bottom navigation bar, `PageHeader.controls` wraps onto its own rows.
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
