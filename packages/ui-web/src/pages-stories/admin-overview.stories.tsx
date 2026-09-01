// Page-level acceptance story for the future `/admin/overview` OPERATOR page — console-ui skill
// "Composition": full-page compositions exist in exactly two places, Storybook and `apps/
// console`'s routes. This route does not exist yet; the owner asked for the eight dashboards
// below rendered inside the real shell, as Storybook screenshots, BEFORE any wiring — no
// container, no hooks, no `apps/console` route change in this batch.
//
// Every zone below reuses a shipped component/section verbatim wherever one already fits the
// job — `MultiSeriesSpendBoard`/`MultiSeriesSpendChart`, `ShareBar`, `SpendDashboard`,
// `OverviewStatRow`/`StatCard`, `LatencyStatCards`, `Meter`. Two zones had no existing shape to
// reuse and get their own new `sections/` entries instead: `TopSpendersLedger` (dashboard 3 — a
// ranking that mixes accounts and projects, which no existing ledger does) and
// `EstateBudgetPressure` (dashboard 4's account list — `BudgetPressure` measures projects against
// ONE shared account ceiling, but an estate view genuinely has one real ceiling PER ACCOUNT, so
// the sort key and the meter's `ceiling` both had to move per-row).
//
// `Card` wraps every zone (2026-08-31, owner ruling, verbatim: "How come we're using cards almost
// everywhere, but not in the admin pages?") — this page's original "charts and tables render on
// the floor, not in cards" ruling is overturned; it was always a narrower carve-out against ADR
// 0012 D3's general "Card is the default zone container," now closed for consistency with every
// other page. One `Card` per rendered board/section, the same granularity `overview.stories.tsx`
// uses: sections reused here keep whatever heading they already render (`ZoneHeading`, or a
// section's own `label`) rather than being promoted into `Card`'s own `title`. `StatCard` (via
// `OverviewStatRow`) stays self-panelled regardless — its own `surface` fill, never wrapped in an
// outer `Card` — matching every other stat row in the console.
//
// Two more divergences from the assignment brief, both from the console-ui skill's own
// "NO static per-series legend lists under any chart" ruling: dashboard 1's "total + dashed
// previous period" and dashboard 8's two-count board both went through `MultiSeriesSpendBoard`
// (hover-tooltip only) rather than `SpendDashboard`/`SpendSeriesChart`, whose `ChartLegend` row is
// unconditional — see `estateTotalSpendSeries`'s own doc comment below. Dashboard 4's burn-down is
// the one exception: `MultiSeriesSpendChart` has no `cumulative`/`ceiling` reading at all, so the
// single-series `SpendDashboard` legend it carries (one row, no value) is an unavoidable,
// pre-existing side effect of reusing the only primitive that can draw a burn-down — the same
// shape `settings-overview.stories.tsx`'s own account-lens burn-down already ships today, not a
// new violation this batch introduces. `MultiSeriesSpendChart` itself also gained a small typed
// `formatYTick` prop in this batch (default `formatUsdAxis`, unchanged for every existing caller)
// — its axis was hardcoded to dollars, which fabricated a `$` prefix on this page's three genuine
// COUNT boards (refill decisions, request volume, adoption) until overridden.
//
// Two deliberate divergences from the assignment brief, both because the console-ui skill's own
// analytics doctrine (ADR 0013 D5) forbids the literal ask:
//
//  - Dashboard 6 ("requests-over-time board with an error-rate line") plots REQUEST COUNT and
//    ERROR COUNT — not error RATE — as two lines sharing one axis, `scale="indexed"` by default.
//    A raw request count (hundreds/day) and a raw percentage (low single digits) cannot share a
//    linear axis honestly, and MultiSeriesSpendChart's `formatValue` is one callback for every
//    series, so it cannot honestly render two different units either. `indexed` — normalizing
//    each series to its own peak — is exactly chart-tokens' sanctioned answer to "plot two
//    differently-scaled series for SHAPE, not magnitude" (see that component's own doc comment).
//    The actual error-RATE figure is stated once, as DOM text, in the caption beneath the chart.
//  - Dashboard 7 ("latency stat cards + trend") reuses `LatencyStatCards` with NO trend line. The
//    console-ui skill's own "Never do" list bans a per-request latency time series outright: the
//    usage backend's percentiles are whole-window aggregates that cannot be validly combined
//    across days into a trend line (ADR 0013 D5). Cut, not built speculatively.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { DateRangeField, presetRange } from '../components/date-range-field';
import { InlineStatus } from '../components/inline-status';
import type { MultiSeriesSpendScale, MultiSeriesSpendSeries } from '../components/multi-series-spend-chart';
import type { ShareBarSegment } from '../components/share-bar';
import { ShareBar } from '../components/share-bar';
import type { SpendSeriesSeries } from '../components/spend-series-chart';
import { formatUsd, formatUsdAxis } from '../lib/money';
import { DATA_INK_CLASS } from '../lib/type-roles';
import { ZoneHeading } from '../lib/zone-heading';
import { EstateBudgetPressure } from '../sections/estate-budget-pressure';
import {
  estateBudgetPressureAccounts,
  worstEstateBudgetPressureAccount,
} from '../sections/estate-budget-pressure/fixtures';
import { LatencyStatCards } from '../sections/latency-stat-cards';
import { latencyStatRows } from '../sections/latency-stat-cards/fixtures';
import { MultiSeriesSpendBoard } from '../sections/multi-series-spend-board';
import { RANGE_PRESETS } from '../sections/overview-controls/fixtures';
import { OverviewStatRow } from '../sections/overview-stat-row';
import type { OverviewStatCardData } from '../sections/overview-stat-row';
import { PageHeader } from '../sections/page-header';
import { SpendDashboard } from '../sections/spend-dashboard';
import { TopSpendersLedger } from '../sections/top-spenders-ledger';
import { topSpendersFixture } from '../sections/top-spenders-ledger/fixtures';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));
const DAY_COUNT = 29;

function daysFrom(base: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => new Date(base.getTime() + i * 86_400_000));
}

const DAYS = daysFrom(new Date(Date.UTC(2026, 7, 1)), DAY_COUNT);

/** A count-valued figure — plain grouping, never the currency ladder (`lib/money`'s own contract
 *  is dollars only). Reused across every count-series board on this page. */
function formatCount(value: number): string {
  return Math.round(value).toLocaleString();
}

// ---------------------------------------------------------------------------------------------
// Dashboard 1 — Estate spend over time
// ---------------------------------------------------------------------------------------------

/** The estate total, current period solid + previous period as a second line — same "current
 *  rank-1, previous rank-2" shape `settings-overview.stories.tsx`'s own `usageEstateSpendSeries`
 *  uses, scaled to this page's own eighteen-account fixture.
 *
 *  Rendered through `MultiSeriesSpendBoard`, not `SpendDashboard` — the owner's "no static
 *  per-series legend, ever" ruling (`multi-series-spend-chart/component.tsx`'s own doc comment)
 *  applies to a two-series comparison exactly as much as it does to a twelve-account board;
 *  `SpendSeriesChart`'s `ChartLegend` row is unconditional, so any 2+-series board on this page
 *  goes through the chart that has none. */
function estateTotalSpendSeries(): MultiSeriesSpendSeries[] {
  const current = [
    612, 634, 651, 698, 685, 703, 728, 736, 754, 749, 771, 788, 802, 795, 815, 829, 844, 837, 856,
    871, 886, 879, 896, 912, 927, 918, 936, 951, 966,
  ];
  const previous = [
    548, 566, 581, 622, 611, 627, 649, 656, 672, 668, 687, 702, 715, 709, 726, 738, 752, 746, 763,
    776, 789, 783, 799, 813, 826, 818, 834, 847, 860,
  ];
  return [
    { key: 'estate-total', label: 'This period', points: DAYS.map((x, i) => ({ x, y: current[i] })) },
    {
      key: 'estate-previous',
      label: 'Previous period',
      points: DAYS.map((x, i) => ({ x, y: previous[i] })),
    },
  ];
}

/** Per-account superposed lines — twelve of `topSpendersFixture`'s own accounts, each series'
 *  daily total built off that account's real MTD figure divided across the period (plus a mild
 *  trend so the lines are not perfectly flat), so the two dashboards agree with each other. */
function estateAccountSpendSeries(): MultiSeriesSpendSeries[] {
  const accounts = [
    { key: 'acct_acme', label: 'acme-labs', mtd: 4218.62 },
    { key: 'acct_northwind', label: 'northwind-ai', mtd: 3904.11 },
    { key: 'acct_contoso', label: 'contoso-data', mtd: 3120.4 },
    { key: 'acct_globex', label: 'globex-research', mtd: 2402.18 },
    { key: 'acct_initech', label: 'initech-core', mtd: 1875.3 },
    { key: 'acct_fabrikam', label: 'fabrikam-ml', mtd: 1640.02 },
    { key: 'acct_wayne', label: 'wayne-analytics', mtd: 1288.55 },
    { key: 'acct_stark', label: 'stark-infer', mtd: 964.2 },
    { key: 'acct_umbrella', label: 'umbrella-platform', mtd: 812.4 },
    { key: 'acct_hooli', label: 'hooli', mtd: 601.86 },
    { key: 'acct_soylent', label: 'soylent-infra', mtd: 455.7 },
    { key: 'acct_massive', label: 'massive-dynamic', mtd: 340.15 },
  ];
  return accounts.map(({ key, label, mtd }, accountIndex) => {
    const dailyAverage = mtd / DAY_COUNT;
    return {
      key,
      label,
      points: DAYS.map((x, i) => {
        // A mild, per-account-offset sine ripple on top of a slight upward trend — organic
        // rather than flat, deterministic rather than random.
        const trend = 1 + (i / DAY_COUNT) * 0.28;
        const ripple = 1 + Math.sin(i / 3 + accountIndex) * 0.12;
        return { x, y: Math.max(dailyAverage * trend * ripple, 0) };
      }),
    };
  });
}

const ESTATE_TOTAL_SPEND_SERIES = estateTotalSpendSeries();
const ESTATE_ACCOUNT_SPEND_SERIES = estateAccountSpendSeries();

// ---------------------------------------------------------------------------------------------
// Dashboard 2 — Model mix
// ---------------------------------------------------------------------------------------------

// One dominant model at ~95% share, the ADR 0013 D5 measured production shape — the same
// dominance ratio `overview.stories.tsx`'s own `modelSpendSeries()` establishes for a single
// account, here at estate scale.
const MODEL_MIX_SEGMENTS: ShareBarSegment[] = [
  { key: 'gpt-4o-realtime-preview', label: 'gpt-4o-realtime-preview', value: 18214.55, formattedValue: '$18,214.55' },
  { key: 'claude-opus-4', label: 'claude-opus-4', value: 612.4, formattedValue: '$612.40' },
  { key: 'gpt-4o-mini', label: 'gpt-4o-mini', value: 210.18, formattedValue: '$210.18' },
  { key: 'deepseek-v4-flash', label: 'deepseek-v4-flash', value: 98.72, formattedValue: '$98.72' },
  { key: 'text-embedding-3-small', label: 'text-embedding-3-small', value: 45.11, formattedValue: '$45.11' },
  { key: 'other', label: 'Other (2 models)', value: 23.35, formattedValue: '$23.35' },
];

function modelMixOverTimeSeries(): MultiSeriesSpendSeries[] {
  const dominantDaily = 18214.55 / DAY_COUNT;
  return [
    {
      key: 'gpt-4o-realtime-preview',
      label: 'gpt-4o-realtime-preview',
      points: DAYS.map((x, i) => ({ x, y: dominantDaily * (0.85 + (i / DAY_COUNT) * 0.35) })),
    },
    {
      key: 'claude-opus-4',
      label: 'claude-opus-4',
      points: DAYS.map((x, i) => ({ x, y: 12 + i * 1.1 })),
    },
    {
      key: 'gpt-4o-mini',
      label: 'gpt-4o-mini',
      points: [DAYS[3], DAYS[9], DAYS[14], DAYS[21], DAYS[26]].map((x) => ({ x, y: 7.2 })),
    },
    {
      key: 'deepseek-v4-flash',
      label: 'deepseek-v4-flash',
      points: [DAYS[6], DAYS[17], DAYS[24]].map((x) => ({ x, y: 3.4 })),
    },
    {
      key: 'text-embedding-3-small',
      label: 'text-embedding-3-small',
      points: [DAYS[11], DAYS[19]].map((x) => ({ x, y: 1.5 })),
    },
  ];
}

const MODEL_MIX_OVER_TIME_SERIES = modelMixOverTimeSeries();

// ---------------------------------------------------------------------------------------------
// Dashboard 4 — Budget pressure: the worst row's own burn-down
// ---------------------------------------------------------------------------------------------

/** `stark-infer` — the highest-ratio account in `estateBudgetPressureAccounts` (92% of a $200
 *  ceiling) — plotted as a cumulative burn-down against its own ceiling, the same
 *  `cumulative`+`ceiling` reading `settings-overview.stories.tsx`'s account lens already uses. */
function worstAccountBurnDownSeries(): SpendSeriesSeries[] {
  // Shaped, then RESCALED so the cumulative total lands exactly on the account's real MTD spend
  // — the same "the rows sum to the whole" discipline `budget-pressure/fixtures.ts` states
  // explicitly: a burn-down whose running total disagrees with the meter beside it would teach
  // the wrong thing about what the two zones mean.
  const shape = DAYS.map((_, i) => Math.max(1 + Math.sin(i / 4) * 0.4, 0));
  const shapeTotal = shape.reduce((sum, value) => sum + value, 0);
  const scale = worstEstateBudgetPressureAccount.spend / shapeTotal;
  return [
    {
      key: worstEstateBudgetPressureAccount.key,
      label: worstEstateBudgetPressureAccount.name,
      points: DAYS.map((x, i) => ({ x, y: shape[i] * scale })),
      breached: true,
    },
  ];
}

const WORST_ACCOUNT_BURN_DOWN_SERIES = worstAccountBurnDownSeries();

// ---------------------------------------------------------------------------------------------
// Dashboard 5 — Refill operations
// ---------------------------------------------------------------------------------------------

const REFILL_STAT_CARDS: OverviewStatCardData[] = [
  { key: 'queue-depth', label: 'Queue depth', metric: '16', delta: { direction: 'up', label: '4 vs yesterday' } },
  {
    key: 'median-decision-time',
    label: 'Median time to decision',
    metric: '5h 42m',
    delta: { direction: 'down', label: '38m vs prev period' },
  },
];

function refillDecisionsOverTimeSeries(): MultiSeriesSpendSeries[] {
  const approved = [2, 3, 1, 4, 2, 3, 5, 2, 4, 3, 2, 5, 3, 4, 2, 3, 6, 2, 4, 3, 5, 2, 3, 4, 6, 3, 4, 5, 3];
  const declined = [0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1];
  const autoApproved = [1, 1, 2, 1, 2, 2, 1, 3, 2, 2, 3, 2, 3, 2, 3, 2, 4, 3, 3, 4, 3, 4, 3, 4, 4, 3, 5, 4, 4];
  return [
    { key: 'approved', label: 'Approved', points: DAYS.map((x, i) => ({ x, y: approved[i] })) },
    { key: 'declined', label: 'Declined', points: DAYS.map((x, i) => ({ x, y: declined[i] })) },
    { key: 'auto-approved', label: 'Auto-approved', points: DAYS.map((x, i) => ({ x, y: autoApproved[i] })) },
  ];
}

const REFILL_DECISIONS_SERIES = refillDecisionsOverTimeSeries();

// ---------------------------------------------------------------------------------------------
// Dashboard 6 — Request volume & error rate
// ---------------------------------------------------------------------------------------------

function requestVolumeErrorSeries(): { series: MultiSeriesSpendSeries[]; totalRequests: number; totalErrors: number } {
  let totalRequests = 0;
  let totalErrors = 0;
  const requestPoints = DAYS.map((x, i) => {
    const value = 210 + i * 4.2 + Math.sin(i / 3) * 18;
    totalRequests += value;
    return { x, y: value };
  });
  const errorPoints = DAYS.map((x, i) => {
    const value = 3 + Math.sin(i / 4) * 2.2 + (i > 20 ? 2.5 : 0);
    totalErrors += Math.max(value, 0);
    return { x, y: Math.max(value, 0) };
  });
  return {
    series: [
      { key: 'requests', label: 'Requests', points: requestPoints },
      { key: 'errors', label: 'Errors', points: errorPoints },
    ],
    totalRequests,
    totalErrors,
  };
}

const REQUEST_VOLUME_ERROR = requestVolumeErrorSeries();
const REQUEST_ERROR_RATE_CAPTION = `${((REQUEST_VOLUME_ERROR.totalErrors / REQUEST_VOLUME_ERROR.totalRequests) * 100).toFixed(1)}% error rate this period (${formatCount(REQUEST_VOLUME_ERROR.totalErrors)} of ${formatCount(REQUEST_VOLUME_ERROR.totalRequests)} requests). Indexed to each series’ own peak — shape only, not comparable magnitudes; hover for exact counts.`;

// ---------------------------------------------------------------------------------------------
// Dashboard 8 — Adoption
// ---------------------------------------------------------------------------------------------

const ADOPTION_STAT_CARDS: OverviewStatCardData[] = [
  { key: 'new-accounts', label: 'New accounts this period', metric: '7', delta: { direction: 'up', label: '2 vs prev period' } },
  { key: 'gone-quiet', label: 'Gone quiet (14+ days idle)', metric: '3', delta: { direction: 'down', label: '1 vs prev period' } },
  { key: 'active-today', label: 'Active accounts today', metric: '24', delta: { direction: 'flat', label: 'no change' } },
];

// `MultiSeriesSpendBoard`, not `SpendDashboard` — same legend-avoidance rationale as
// `estateTotalSpendSeries` above: two labeled series through `SpendSeriesChart` would still carry
// its unconditional `ChartLegend` row.
function adoptionOverTimeSeries(): MultiSeriesSpendSeries[] {
  const activeAccounts = DAYS.map((_, i) => 16 + Math.round(Math.sin(i / 4) * 3) + Math.floor(i / 6));
  const activeProjects = DAYS.map((_, i) => 34 + Math.round(Math.cos(i / 3) * 5) + Math.floor(i / 4));
  return [
    { key: 'active-accounts', label: 'Active accounts', points: DAYS.map((x, i) => ({ x, y: activeAccounts[i] })) },
    { key: 'active-projects', label: 'Active projects', points: DAYS.map((x, i) => ({ x, y: activeProjects[i] })) },
  ];
}

const ADOPTION_OVER_TIME_SERIES = adoptionOverTimeSeries();

// ---------------------------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------------------------

function AdminOverviewScreen() {
  const [rangePreset, setRangePreset] = useState<string | null>('mtd');
  const [range, setRange] = useState(presetRange('mtd', STORY_TODAY));

  const [estateTotalScale, setEstateTotalScale] = useState<MultiSeriesSpendScale>('linear');
  const [estateAccountScale, setEstateAccountScale] = useState<MultiSeriesSpendScale>('linear');
  const [modelMixScale, setModelMixScale] = useState<MultiSeriesSpendScale>('log');
  const [refillDecisionsScale, setRefillDecisionsScale] = useState<MultiSeriesSpendScale>('linear');
  const [requestVolumeScale, setRequestVolumeScale] = useState<MultiSeriesSpendScale>('indexed');
  const [adoptionScale, setAdoptionScale] = useState<MultiSeriesSpendScale>('linear');

  const modelMixTotal = MODEL_MIX_SEGMENTS.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <ConsoleShell sidebar={storySidebar('admin', { isAdmin: true })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Overview"
          subtitle="Operator · All accounts with usage this period · This month · UTC"
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

        {/* Owner review finding (converse-frontends#368, 2026-08-31): "/admin/overview is
             overview for ALL account, not just the one the user is bound to. ALL of them." — and
             the 2026-08-31 follow-up (lightbridge-authz#605) that actually delivers it: the usage
             query API gained a real `scope: 'all'` (no entity filter at all, gated on
             `usage:read-all`), so the subtitle above is now literally true rather than the
             family-plus-pending-queue approximation the design batch originally shipped with. The
             one board that still fans out per-account (`getBudgetBalance`, dashboard 4 — an RPC
             #605 does not touch) keeps its own honest, CONDITIONAL truncation caption
             (`use-admin-overview-screen.ts`'s `truncationCaption`, only rendered when the
             concurrency cap on that fan-out actually drops a real candidate) — shown here to
             demonstrate the shape. */}
        <InlineStatus>
          Showing budget pressure for 18 of 23 accounts with usage this period or in your account
          family.
        </InlineStatus>

        {/* ── 1. Estate spend over time ── */}
        <Card>
          <MultiSeriesSpendBoard
            label="Total spend vs previous period"
            series={ESTATE_TOTAL_SPEND_SERIES}
            scale={estateTotalScale}
            onScaleChange={setEstateTotalScale}
            fallbackWidth={1120}
            height={200}
            emptyMessage="No usage in this range."
          />
        </Card>
        <Card>
          <MultiSeriesSpendBoard
            label="Spend by account"
            series={ESTATE_ACCOUNT_SPEND_SERIES}
            scale={estateAccountScale}
            onScaleChange={setEstateAccountScale}
            fallbackWidth={1120}
            height={220}
            emptyMessage="No usage in this range."
          />
        </Card>

        {/* ── 2. Model mix ── */}
        <Card>
          <ZoneHeading
            label="Spend by model — estate share"
            trailing={<span className={DATA_INK_CLASS}>{formatUsd(modelMixTotal)}</span>}
          />
          <ShareBar className="mt-4" segments={MODEL_MIX_SEGMENTS} />
        </Card>
        <Card>
          <MultiSeriesSpendBoard
            label="Spend by model over time"
            series={MODEL_MIX_OVER_TIME_SERIES}
            scale={modelMixScale}
            onScaleChange={setModelMixScale}
            fallbackWidth={1120}
            height={220}
            emptyMessage="No usage in this range."
          />
        </Card>

        {/* ── 3. Top spenders ── */}
        <Card>
          <ZoneHeading label="Top spenders" />
          <TopSpendersLedger className="mt-4" rows={topSpendersFixture} />
        </Card>

        {/* ── 4. Budget pressure ── */}
        <Card>
          <EstateBudgetPressure accounts={estateBudgetPressureAccounts} />
        </Card>
        <Card>
          <SpendDashboard
            label={`Budget burn-down — ${worstEstateBudgetPressureAccount.name}`}
            series={WORST_ACCOUNT_BURN_DOWN_SERIES}
            cumulative
            ceiling={worstEstateBudgetPressureAccount.ceiling}
            fallbackWidth={1120}
            height={200}
            formatYTick={formatUsdAxis}
            formatTooltipValue={formatUsd}
          />
        </Card>

        {/* ── 5. Refill operations ── */}
        <OverviewStatRow cards={REFILL_STAT_CARDS} />
        <Card>
          <MultiSeriesSpendBoard
            label="Refill decisions over time"
            series={REFILL_DECISIONS_SERIES}
            scale={refillDecisionsScale}
            onScaleChange={setRefillDecisionsScale}
            fallbackWidth={1120}
            height={200}
            formatValue={formatCount}
            formatYTick={formatCount}
            emptyMessage="No refill decisions in this range."
          />
        </Card>

        {/* ── 6. Request volume & error rate ── */}
        <Card>
          <MultiSeriesSpendBoard
            label="Request volume & errors"
            series={REQUEST_VOLUME_ERROR.series}
            scale={requestVolumeScale}
            onScaleChange={setRequestVolumeScale}
            fallbackWidth={1120}
            height={200}
            formatValue={formatCount}
            formatYTick={formatCount}
            emptyMessage="No requests in this range."
          />
          <InlineStatus className="mt-2">{REQUEST_ERROR_RATE_CAPTION}</InlineStatus>
        </Card>

        {/* ── 7. Latency board — LatencyStatCards reused verbatim, no trend line (see file
             header: a per-request latency time series is explicitly banned). ── */}
        <Card>
          <ZoneHeading label="Latency by model" />
          <LatencyStatCards className="mt-4" rows={latencyStatRows} />
        </Card>

        {/* ── 8. Adoption ── */}
        <OverviewStatRow cards={ADOPTION_STAT_CARDS} />
        {/* Always-on, not conditional (lightbridge-authz#605) — a structural limit of a
             usage-EVENTS query, not a count that can be zero: an account with genuinely no spend
             in either compared window never appears as an `account_id` group at all, and account
             creation dates stay resolvable only for the operator's own family. Mirrors
             `admin-overview-usage.ts`'s `ADOPTION_ESTATE_LIMITS_CAPTION`. */}
        <InlineStatus>
          &quot;New accounts this period&quot; only counts your own account family — usage events
          carry no account creation date for any account. &quot;Gone quiet&quot; and &quot;active
          accounts&quot; only count accounts with usage in the compared windows; a long-dormant
          account with zero usage never appears in an estate-wide usage query at all.
        </InlineStatus>
        <Card>
          <MultiSeriesSpendBoard
            label="Active accounts & projects per day"
            series={ADOPTION_OVER_TIME_SERIES}
            scale={adoptionScale}
            onScaleChange={setAdoptionScale}
            fallbackWidth={1120}
            height={200}
            formatValue={formatCount}
            formatYTick={formatCount}
            emptyMessage="No activity in this range."
          />
        </Card>
      </div>
    </ConsoleShell>
  );
}

const meta: Meta = {
  title: 'Pages/AdminOverview',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

export const Populated: Story = { render: () => <AdminOverviewScreen /> };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <AdminOverviewScreen />,
  globals: { theme: 'wireframe' },
};

export const MobileBaseTier: Story = {
  render: () => <AdminOverviewScreen />,
  globals: { viewport: { value: 'base390' } },
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile — wireframe (light)',
  render: () => <AdminOverviewScreen />,
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};
