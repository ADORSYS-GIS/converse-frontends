// Page-level story for `/accounts/[accountId]/overview` — the account-scoped user dashboard, and
// the PARITY ORACLE for its migration onto the declarative engine (converse-frontends#455, story
// C12).
//
// **What changed, and why this file shrank by ~300 lines.** It used to hand-compose five zones
// against five bespoke fixtures — a second implementation of the page, drifting from the console's
// own by construction. The page is a `dashboards.yaml` entry now, so this story READS THAT ENTRY
// (`spec-page.tsx`) and draws it through the same `DashboardGrid` / `DashboardPanel` / renderer
// registry `apps/console`'s `dashboard-renderer.tsx` uses. A panel added to, removed from, or
// retitled in the document shows up here on reload, with no story edit — which is the only way a
// story can honestly certify a page it does not own.
//
// **The two zones above the grid are hand-written on purpose, here and in the console.**
// `dashboards.yaml` describes usage queries over the page's RANGE; the BUDGET card reads an RPC
// ceiling against BILLING-PERIOD consumption, and the stat row beside it counts projects and
// active keys through refine. Neither is a range-scoped usage query, so neither is a panel — see
// `use-account-overview-zones.ts`. They render FIRST because "how much of my allowance is left" is
// what a person opens this page to check.
//
// **Divergences from the five-zone predecessor, deliberate and named** (a reviewer should see
// these, not discover them):
//  - The `?group-by=` select is gone. It reshaped ONE share bar between project / model / user /
//    API key; those are separate panels now, all visible at once instead of one at a time behind a
//    select. `?bucket=` went with it (the engine derives bucket width from the range) and so did
//    `?model=`, which only ever offered a single inert "All models" entry.
//  - Spend over time and the two money stats carry the D-F comparison window, so a delta names
//    the window it is against, by date ("12% vs Aug 1 – Aug 31"), not "vs prev period".
//  - Latency by model is new here: it comes free off the `[project_id, model]` grouping the
//    breakdown panels already fire.
//  - Export is C10's `DashboardExportButton` (converse-frontends#453), which walks the SAME
//    resolved panel list this page renders. It lives in `apps/console` (it fetches
//    `/api/reports/page`), so this story stands in for it with the dialog it opens — the shipped
//    `ReportExportDialog` in its dashboard shape: a read-only range echo where the consumption
//    report had a period picker, no scope select (the scope IS the route), no group-by (each
//    panel's grouping is the YAML's), and one "Include tables" toggle.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { DateRangeField, presetRange } from '../components/date-range-field';
import { InlineStatus } from '../components/inline-status';
import { ReportExportDialog } from '../components/report-export-dialog';
import type { ReportExportFormat, ReportIncludeToggle } from '../components/report-export-panel';
import { SelectField } from '../components/select-field';
import { SkeletonMetric } from '../components/skeleton-metric';
import { BudgetPanel } from '../sections/budget-panel';
import type { BudgetNextReset, BudgetSinceReset, BudgetSummary } from '../sections/budget-panel';
import {
  overviewBudget,
  overviewEmptyBudget,
  overviewErrorBudget,
  overviewLoadingBudget,
  overviewUnwiredBudget,
} from '../sections/budget-panel/fixtures';
import { DashboardGrid } from '../sections/dashboard-grid';
import { PageHeader } from '../sections/page-header';
import { PROJECT_FILTER_OPTIONS, RANGE_PRESETS } from '../sections/overview-controls/fixtures';
import { OverviewStatRow } from '../sections/overview-stat-row';
import type { OverviewStatCardData } from '../sections/overview-stat-row';
import { overviewEmptyStatCards, overviewStatCards } from '../sections/overview-stat-row/fixtures';
import { SpecPanels, specPage } from './spec-page';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));

const PAGE = specPage('/accounts/[accountId]/overview');

/**
 * The FOUR rings' key sets.
 *
 * The three CHANNEL rings (owner request, 2026-09-03) are grouped by `azp` — the OAuth client id
 * the request arrived on. `DIMENSION_KEYS.azp` is sized for `/admin/usage`, which looks at every
 * client on the DEPLOYMENT; one account typically talks to a handful, so this narrows the fixture
 * to three.
 *
 * Three is also what makes the rings reviewable. The fixtures are top-1-dominant by measurement
 * (one key at ~86% of the total here), and that is precisely the case the owner rejected filled
 * disks over on 2026-08-29 — a reviewer has to see it, not a tidy evenly-banded demo. The values
 * are printed verbatim, exactly as `labelOf` prints an `azp` key in the console: it is not an
 * actor dimension and has no closed vocabulary, so there is nothing to humanise it into.
 *
 * The FOURTH ring (owner correction, same day: the ring meant beside those three was "Cost by
 * PROJECT") is grouped by `project_id`, which IS an actor dimension — so its segments carry
 * project NAMES, not cuids, and the `Unassigned` key stays a labelled segment rather than being
 * dropped. It shares the shared `project_id` key set with the "Spend by project" ranked panel ON
 * PURPOSE: in the console the two read the same request, and a story that gave them different
 * keys would hide exactly the disagreement that sharing exists to prevent.
 */
const ACCOUNT_DIMENSION_KEYS = {
  azp: ['console-ui', 'opencode-cli', 'ci-deploy'],
  project_id: ['ingest', 'rag-api', 'batch-eval', 'Unassigned'],
};

/**
 * The Budget card's caption, in BOTH of the two shapes `budgetPeriodCaption`
 * (`apps/console/src/containers/budget-period-caption.ts`) builds — the wording the owner asked
 * for on 2026-09-03 ("We said ceiling is a fact of the budget period, right? What is ceiling vs
 * reset period?").
 *
 * They are two fixtures rather than one because the SCHEDULED wording is the whole point of the
 * fix: without a schedule the ceiling really is one month's grants, and with one it steps up at
 * every tick while `remaining` saw-tooths back to the configured amount. A story that only showed
 * the first would certify exactly the sentence the owner rejected.
 *
 * Verbatim strings, not a call into `apps/console` — `ui-web` never imports the app (the
 * dependency runs the other way), and a story that recomputed the sentence could not catch it
 * drifting. `budget-period-caption.test.ts` asserts the same two shapes against the builder.
 */
const BUDGET_PERIOD_CAPTION_NO_SCHEDULE =
  "Budget figures follow the account's budget period (calendar month, 2026-08-01 → today); the " +
  'range picker above only changes the usage charts.';

const BUDGET_PERIOD_CAPTION_DAILY_RESET =
  'Budget figures follow the budget period (calendar month, 2026-08-01 → today). Reset remaining ' +
  'to $2.00 every day at 00:00 UTC (next in 12 h) — each reset is booked into this month, so the ' +
  'remaining balance returns to $2.00 while the ceiling grows by every reset. The range picker ' +
  'above only changes the usage charts.';

/** The card's two schedule rows, in the pair the console renders them as: what this cycle has
 *  drawn, then when the next cycle starts. */
const SINCE_RESET: BudgetSinceReset = {
  status: 'ready',
  label: 'Spent since last reset $0.84 · 11 h ago',
};
const NEXT_RESET: BudgetNextReset = {
  status: 'scheduled',
  label: 'Next reset in 12 h → $2.00 (reset)',
};

interface OverviewScreenProps {
  statCards?: OverviewStatCardData[];
  statCardsLoading?: boolean;
  budget?: BudgetSummary;
  /** `true` renders the account under a daily reset schedule: the two extra card rows and the
   *  caption that explains why the ceiling above them is not a fixed monthly allowance. */
  scheduled?: boolean;
  /** The account rail's permission-gated Operator group (owner directive, 2026-09-03) — see the
   *  `AdminNav` story below. Nothing on the PAGE differs by it; only the sidebar does. */
  showAdmin?: boolean;
}

function OverviewScreen({
  statCards = overviewStatCards,
  statCardsLoading = false,
  budget = overviewBudget,
  scheduled = false,
  showAdmin = false,
}: OverviewScreenProps) {
  // Storybook-only local state standing in for the page's nuqs URL params (ADR 0011).
  const [rangePreset, setRangePreset] = useState<string | null>('mtd');
  const [range, setRange] = useState(presetRange('mtd', STORY_TODAY));
  const [project, setProject] = useState('all');

  const [reportOpen, setReportOpen] = useState(false);
  const [format, setFormat] = useState<ReportExportFormat>('pdf');
  const [generating, setGenerating] = useState(false);
  const [includeToggles, setIncludeToggles] = useState<ReportIncludeToggle[]>([
    { id: 'tables', label: 'Include tables', checked: true },
  ]);

  return (
    <ConsoleShell sidebar={storySidebar('overview', { showAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Overview"
          subtitle="adorsys-gis · All projects · This month · UTC"
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
              <SelectField
                label="Project"
                value={project}
                options={PROJECT_FILTER_OPTIONS}
                onChange={setProject}
                layout="inline"
                hideLabel
              />
            </div>
          }
          action={
            <Button type="button" variant="secondary" onClick={() => setReportOpen(true)}>
              Export
            </Button>
          }
        />

        <ReportExportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          title="Export · Overview"
          rangeEcho="This month · 2026-08-01 → 2026-08-29 · UTC"
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

        {/* The BUDGET-PERIOD zones. `OverviewStatRow` is self-panelling, so it takes no `Card` —
            the same exemption `DashboardPanel`'s `chrome: 'bare'` encodes for the engine's own
            stat panels. `data-span` is what the grid reads, exactly as `DashboardPanel` sets it. */}
        <DashboardGrid>
          <div data-span="2">
            <OverviewStatRow cards={statCards} loading={statCardsLoading} />
          </div>
          <Card data-span="2">
            <BudgetPanel
              className="w-full"
              label="Budget"
              budget={budget}
              sinceReset={scheduled ? SINCE_RESET : { status: 'none' }}
              nextReset={scheduled ? NEXT_RESET : { status: 'none' }}
            />
            <InlineStatus className="mt-2">
              {scheduled ? BUDGET_PERIOD_CAPTION_DAILY_RESET : BUDGET_PERIOD_CAPTION_NO_SCHEDULE}
            </InlineStatus>
          </Card>
        </DashboardGrid>

        <SpecPanels page={PAGE} dimensionKeys={ACCOUNT_DIMENSION_KEYS} />
      </div>
    </ConsoleShell>
  );
}

const meta: Meta<typeof OverviewScreen> = {
  title: 'Pages/Account/Overview',
  component: OverviewScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof OverviewScreen>;

// `lg` (≥1024, the default story viewport — see .storybook/preview.tsx). Fluid (console-ui skill
// "Fluid always") — the page follows the iframe's real width rather than a fixed 1440 wrapper.
export const Populated: Story = { render: () => <OverviewScreen /> };

// Owner directive, 2026-09-03, verbatim: "The Admin button doesn't need to be hidden now, since
// it's gated by permission. So it can appear on the main left rail." The account rail's third
// group, Operator, holding one row — "Admin" — rendered only for a caller holding any one of
// `ADMIN_AREA_PERMISSIONS`, and pointed at the first admin destination THAT caller can open
// (`navGroups`/`adminLandingHref`, `apps/console/src/client/console-chrome.tsx`). It replaces the
// settings rail's own Admin row, which is deleted: the row has one home, never two.
export const AdminNav: Story = {
  name: 'Nav — admin (Operator group on the main rail)',
  render: () => <OverviewScreen showAdmin />,
};

// The same rail in the light theme. A group label is one of the few rail elements the two palettes
// treat differently enough to be worth reviewing on its own.
export const AdminNavLight: Story = {
  name: 'Nav — admin, wireframe (light)',
  render: () => <OverviewScreen showAdmin />,
  globals: { theme: 'wireframe' },
};

// ADR 0010 phase 4: the `wireframe` (light) counterpart of `Populated`, same fixtures.
export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <OverviewScreen />,
  globals: { theme: 'wireframe' },
};

/**
 * The same account under a DAILY RESET SCHEDULE (owner question, 2026-09-03).
 *
 * This is the story the fix exists for. `Populated` above shows the account nobody schedules: the
 * ceiling is one month's grants and the caption can say so plainly. Here the scheduler writes an
 * `automatic` grant into the SAME calendar month at 00:00 every day, so the ceiling is not an
 * allowance anyone granted — it is one $2.00 day per tick already booked, and it steps up again
 * tomorrow. The card grows the two rows that make that legible ("Spent since last reset", "Next
 * reset …") and the caption states the mechanism rather than the flat, and now false, claim that
 * "a ceiling is a fact about this calendar month".
 */
export const ScheduledReset: Story = {
  name: 'Populated — under a daily reset',
  render: () => <OverviewScreen scheduled />,
};

export const ScheduledResetLight: Story = {
  name: 'Populated — under a daily reset, wireframe (light)',
  render: () => <OverviewScreen scheduled />,
  globals: { theme: 'wireframe' },
};

// README §6: the panels' own empty renderings carry the "nothing yet" story. The engine's panel
// fixtures are always populated (they are per-TYPE, and a page story exists to review the page's
// shape) — what this story exercises is the two hand-written zones' own empty states.
export const Empty: Story = {
  render: () => <OverviewScreen statCards={overviewEmptyStatCards} budget={overviewEmptyBudget} />,
};

/**
 * The route-transition fallback (`apps/console/src/app/(console)/accounts/[accountId]/overview/
 * loading.tsx` mirrors this composition 1:1), and the subject of
 * `pages-stories/loading-skeletons.test.tsx`.
 *
 * **Generic panel skeletons, deliberately.** This boundary resolves BEFORE the server component
 * has read `dashboards.yaml`, so it cannot honestly know how many panels the page has or what they
 * are called — a deployment can add one through the config volume. It draws the page's SHAPE
 * instead: the two fixed, hand-written zones (which a fallback CAN name truthfully) and a grid of
 * neutral panel skeletons at the real geometry, so the layout does not jump when the document
 * lands. The same reasoning `/admin/overview`'s own fallback states.
 */
function OverviewLoadingScreen() {
  return (
    <ConsoleShell sidebar={storySidebar('overview')} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader title="Overview" subtitle="loading scope…" />

        <DashboardGrid>
          <div data-span="2">
            <OverviewStatRow cards={[]} loading />
          </div>
          <Card data-span="2">
            <BudgetPanel className="w-full" label="Budget" budget={overviewLoadingBudget} />
          </Card>
        </DashboardGrid>

        <DashboardGrid>
          {/* Two half-width stats, a full-width chart, then the breakdowns and the FOUR rings —
              the shape this page entry has, without claiming to know their titles. */}
          {[1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1].map((span, index) => (
            <Card key={index} data-span={span === 2 ? '2' : undefined}>
              <div className="skeleton h-4 w-48" />
              <SkeletonMetric />
            </Card>
          ))}
        </DashboardGrid>
      </div>
    </ConsoleShell>
  );
}

export const Loading: Story = { render: () => <OverviewLoadingScreen /> };

// #306 — the account is past the breach threshold (0.9): `BudgetHero`'s own accent kicks in on
// the meter. No refill CTA renders alongside it (owner review round 2, 2026-08-31,
// converse-frontends#368 finding #3: the entry point lives only in
// `/settings/accounts/<id>/request-refill`) — this story shows the breach visual state, not a
// control.
export const BudgetBreached: Story = {
  render: () => (
    <OverviewScreen
      budget={{
        value: 478.2,
        ceiling: 500,
        caption: 'account ceiling · 96% used this budget period',
      }}
    />
  ),
};

// A budget query that FAILED renders its own error line inside its own card — never a fabricated
// `$0.00`, and never taking the dashboard grid below it down.
export const BudgetError: Story = {
  render: () => <OverviewScreen budget={overviewErrorBudget} />,
};

// A non-home account: `getMyBudgetBalance` structurally answers for the caller's own account only,
// so the card states the gap rather than rendering someone else's ceiling under this label.
export const BudgetUnwired: Story = {
  render: () => <OverviewScreen budget={overviewUnwiredBudget} />,
};

// `md` tier (600–1024): left rail persists inline; Overview has no right rail at any tier.
export const MdTier: Story = {
  globals: { viewport: { value: 'md900' } },
  render: () => <OverviewScreen />,
};

// Base tier (<600): single column, stacked stat cards, nav docked as a fixed bottom bar.
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
