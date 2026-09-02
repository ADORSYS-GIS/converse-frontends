// Page-level story for `/admin/overview` — the operator dashboard, and the PARITY ORACLE for its
// migration onto the declarative engine (converse-frontends#447, story C4).
//
// **What changed, and why this file shrank by ~400 lines.** It used to hand-compose eight boards
// against eight bespoke fixtures — a second implementation of the page, drifting from the console's
// own by construction. The page is a `dashboards.yaml` entry now, so this story READS THAT ENTRY
// (`spec-page.tsx`) and draws it through the same `DashboardGrid` / `DashboardPanel` / renderer
// registry `apps/console`'s `dashboard-renderer.tsx` uses. A panel added to, removed from, or
// retitled in the document shows up here on reload, with no story edit — which is the only way a
// story can honestly certify a page it does not own.
//
// **The two zones above the grid are hand-written on purpose, here and in the console.**
// `dashboards.yaml` describes usage queries; budget pressure reads `getBudgetBalance` (an RPC, one
// call per account, always over the BILLING PERIOD rather than the page's range picker) and the
// refill row reads `listPendingAugmentationRequests`. Neither is a usage query, so neither is a
// panel — see `admin-overview-centre.tsx`'s own doc comment. They render in their own
// `DashboardGrid`, first, because "who is about to breach" and "what is waiting on me" are what an
// operator opens this page to ACT on.
//
// **Divergences from the eight-board predecessor, deliberate and named** (a reviewer should see
// these, not discover them):
//  - Top spenders is now TWO tables (accounts, projects) rather than one mixed ranked ledger:
//    an account row and a project row link to different places, and a table has one group-by
//    dimension. Rows are real anchors into `/admin/usage/actors/<id>?type=…` (C5's route; the
//    href is already the final URL).
//  - Latency is estate-wide, not scoped to the busiest single account. The old scoping existed
//    because per-account percentiles cannot be averaged; with `scope: 'all'` the backend computes
//    `percentile_cont` per (bucket, model) over the estate's own events, so there is nothing to
//    combine. Its caption states the real reading (worst bucket, never an average of percentiles).
//  - "New accounts this period" and "Gone quiet" are gone. Both were family-only or blind to
//    dormant accounts — their own caption said so — and neither is expressible as a usage query.
//    "Active accounts"/"Active projects" are the honest counts that replace them.
//  - No "Refill decisions over time" board: there is no procedure that lists decided requests
//    (lightbridge-authz#556). It was captioned-as-missing before and is captioned-as-missing now.

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { DateRangeField, presetRange } from '../components/date-range-field';
import { InlineStatus } from '../components/inline-status';
import { formatUsd, formatUsdAxis } from '../lib/money';
import { DashboardGrid } from '../sections/dashboard-grid';
import { EstateBudgetPressure } from '../sections/estate-budget-pressure';
import {
  estateBudgetPressureAccounts,
  worstEstateBudgetPressureAccount,
} from '../sections/estate-budget-pressure/fixtures';
import { OverviewStatRow } from '../sections/overview-stat-row';
import type { OverviewStatCardData } from '../sections/overview-stat-row';
import { RANGE_PRESETS } from '../sections/overview-controls/fixtures';
import { PageHeader } from '../sections/page-header';
import { SpendDashboard } from '../sections/spend-dashboard';
import type { SpendSeriesSeries } from '../components/spend-series-chart';
import { SpecPanels, specPage } from './spec-page';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));
const DAYS = Array.from({ length: 29 }, (_, i) => new Date(Date.UTC(2026, 7, 1) + i * 86_400_000));

const PAGE = specPage('/admin/overview');

/** `stark-infer` — the highest-ratio account in `estateBudgetPressureAccounts` — plotted as a
 *  cumulative burn-down against its own ceiling. Shaped, then RESCALED so the cumulative total
 *  lands exactly on that account's real spend: a burn-down whose running total disagreed with the
 *  meter beside it would teach the wrong thing about what the two zones mean. */
function worstAccountBurnDownSeries(): SpendSeriesSeries[] {
  const shape = DAYS.map((_, i) => Math.max(1 + Math.sin(i / 4) * 0.4, 0));
  const total = shape.reduce((sum, value) => sum + value, 0);
  const scale = worstEstateBudgetPressureAccount.spend / total;
  return [
    {
      key: worstEstateBudgetPressureAccount.key,
      label: worstEstateBudgetPressureAccount.name,
      points: DAYS.map((x, i) => ({ x, y: shape[i] * scale })),
      breached: true,
    },
  ];
}

const WORST_ACCOUNT_BURN_DOWN = worstAccountBurnDownSeries();

const REFILL_STAT_CARDS: OverviewStatCardData[] = [
  { key: 'queue-depth', label: 'Queue depth', metric: '16' },
];

const REFILL_DECISIONS_CAPTION =
  'Decision history and median time to decision are not available — the budget service only ' +
  'exposes the pending queue, not a listing of past decisions (lightbridge-authz#556).';

const BILLING_PERIOD_CAPTION =
  'Budget pressure and the queue above are measured over the billing period (2026-08-01 → today), ' +
  'not the range picked above — a ceiling is a fact about this calendar month.';

function AdminOverviewScreen() {
  const [rangePreset, setRangePreset] = React.useState<string | null>('mtd');
  const [range, setRange] = React.useState(presetRange('mtd', STORY_TODAY));

  return (
    <ConsoleShell sidebar={storySidebar('admin', { showAdmin: true })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
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

        {/* The budget-pressure fan-out's own CONDITIONAL truncation caption — only rendered when
            the concurrency cap on `getBudgetBalance` actually drops a real candidate. Shown here
            to demonstrate the shape. */}
        <InlineStatus>
          Showing budget pressure for 18 of 23 accounts with usage this period or in your account
          family.
        </InlineStatus>

        <DashboardGrid>
          <Card data-span="2">
            <EstateBudgetPressure accounts={estateBudgetPressureAccounts} />
          </Card>
          <Card data-span="2">
            <SpendDashboard
              label={`Budget burn-down — ${worstEstateBudgetPressureAccount.name}`}
              series={WORST_ACCOUNT_BURN_DOWN}
              cumulative
              ceiling={worstEstateBudgetPressureAccount.ceiling}
              fallbackWidth={1120}
              height={200}
              formatYTick={formatUsdAxis}
              formatTooltipValue={formatUsd}
            />
          </Card>
          <div data-span="2">
            <OverviewStatRow cards={REFILL_STAT_CARDS} />
            <InlineStatus className="mt-2">{REFILL_DECISIONS_CAPTION}</InlineStatus>
            <InlineStatus className="mt-1">{BILLING_PERIOD_CAPTION}</InlineStatus>
          </div>
        </DashboardGrid>

        <SpecPanels page={PAGE} />
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
