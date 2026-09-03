// Page-level stories for `/settings/overview/usage` — the signed-in identity's own ACCOUNT FAMILY
// overview, and the PARITY ORACLE for the 2026-09-03 owner directive: _"it should have the same
// amount of dashboards as /accounts/:id/overview but cross accounts."_
//
// **Its own file since that directive.** It used to be the fourth lens at the bottom of
// `settings-overview.stories.tsx`, which was right when it was seven panels sharing one grouping
// with three sibling lenses. It is sixteen panels over five query shapes now — the whole account
// dashboard resolved across a family — and it is the one page in the console carrying
// `scope: family`, so it earns its own entry rather than a trailing section under three pages it
// no longer resembles.
//
// **What this story certifies, and what it deliberately cannot.** Like every page story here it
// READS the checked-in `dashboards.yaml` entry (`spec-page.tsx`) and draws it through the same
// `DashboardGrid` / `DashboardPanel` / renderer registry `apps/console`'s `dashboard-renderer.tsx`
// uses, so a panel added to, removed from or retitled in the document appears here on reload with
// no story edit. What it cannot show is the FAN-OUT itself: the merge of N account responses into
// one happens in `use-dashboard.ts`, above the renderers, and is covered by
// `overview-pages.test.ts` (five query shapes × N accounts) and `use-dashboard`'s own tests. What
// a reviewer judges HERE is the page's shape, rhythm and labelling.
//
// **The parity to look for**, panel for panel against `Pages/Overview`:
//  - the four stats (two of them comparing) where the account page has two;
//  - Spend over time (the family TOTAL, `dimension: none`, previous period dashed) and — family
//    only — Spend by account, one line per account off the SAME request;
//  - the account page's four breakdowns, unchanged in shape: Spend by project, the model share,
//    Spend by model over time (stacked bars), Latency by model, Spend by API key;
//  - the account page's four rings — Cost / Tokens / Requests by channel, Cost by project — plus
//    the fifth only a family can draw, **Cost by account**. A single-account page has exactly one
//    `account_id`, so its version of that ring would be one full circle.
//
// **The two captions above the grid are the page's, not a panel's**, and both are honesty lines:
// the account CAP (`MAX_FANNED_OUT_ACCOUNTS = 25`, rendered only when it actually dropped
// accounts) and the ACCOUNT-ONLY ZONES line, which says why the budget-shaped readings on
// `/accounts/<id>/overview` are absent here rather than leaving a reader to guess.
//
// **No Export action, deliberately** — `/api/reports/page` re-resolves a page's entry server-side
// and a `scope: family` panel needs the caller's own account family, which a report route has no
// session to read (`page-report.ts` refuses the route with `unexportable_route`).
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsoleShell } from '../components/console-shell';
import { DateRangeField, presetRange } from '../components/date-range-field';
import { InlineStatus } from '../components/inline-status';
import { RANGE_PRESETS } from '../sections/overview-controls/fixtures';
import { PageHeader } from '../sections/page-header';
import { SpecPanels, specPage } from './spec-page';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));

const FAMILY_PAGE = specPage('/settings/overview/usage');

/**
 * The key sets this page's breakdown fixtures are re-keyed onto.
 *
 * `account_id` is the dimension this page exists for and the one `/accounts/<id>/overview` cannot
 * draw, so it gets a realistic family: three named accounts and one raw id nothing resolved —
 * the sentinel case, KEPT rather than dropped, which is an explicit AC of the labels contract.
 *
 * `azp` is narrowed exactly as `Pages/Overview` narrows it: `DIMENSION_KEYS.azp` is sized for
 * `/admin/usage`, which looks at every OAuth client on the DEPLOYMENT. A family talks to a few
 * more clients than one account does, hence four rather than three.
 *
 * `project_id` carries its `Unassigned` member on purpose: projects are per-account, so a family
 * view is a union of disjoint project sets plus whatever the backend attributed to none of them,
 * and that last segment is the one a reader must see labelled rather than silently missing.
 */
const FAMILY_DIMENSION_KEYS = {
  account_id: ['Brightline', 'Stark Infer', 'Northwind Labs', 'acct_01j7x'],
  azp: ['console-ui', 'opencode-cli', 'ci-deploy', 'zed-editor'],
  project_id: ['ingest', 'rag-api', 'batch-eval', 'Unassigned'],
};

/**
 * Verbatim from `apps/console/src/containers/usage-overview-centre.tsx`'s
 * `ACCOUNT_ONLY_ZONES_CAPTION`. A string rather than an import because `ui-web` never imports the
 * app (the dependency runs the other way) — and a story that recomputed the sentence could not
 * catch it drifting.
 */
const ACCOUNT_ONLY_ZONES_CAPTION =
  'Budget, API-key expiry and refills are per-account and are not on this page: a ceiling belongs ' +
  'to one account’s budget period, so a family has no single figure to state. Open an account’s ' +
  'own overview for those.';

interface UsageOverviewScreenProps {
  showAdmin?: boolean;
  /** Only rendered when the cap actually dropped real accounts — never an apology for a
   *  truncation that did not happen. */
  truncationCaption?: string;
}

/** Mirrors `UsageOverviewCentre`, render for render. */
function UsageOverviewScreen({ showAdmin = false, truncationCaption }: UsageOverviewScreenProps) {
  const [rangePreset, setRangePreset] = useState<string | null>('mtd');
  const [range, setRange] = useState(presetRange('mtd', STORY_TODAY));

  return (
    <ConsoleShell sidebar={storySidebar('settings', { showAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Usage overview"
          subtitle="Your account family · This month · UTC"
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

        <InlineStatus>{ACCOUNT_ONLY_ZONES_CAPTION}</InlineStatus>

        <SpecPanels page={FAMILY_PAGE} dimensionKeys={FAMILY_DIMENSION_KEYS} />
      </div>
    </ConsoleShell>
  );
}

const meta: Meta<typeof UsageOverviewScreen> = {
  title: 'Pages/SettingsOverviewUsage',
  component: UsageOverviewScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof UsageOverviewScreen>;

// The whole sixteen-panel page. This is the parity review surface: read it beside
// `Pages/Overview → Populated` and every account-page panel should have a counterpart here.
export const Populated: Story = {
  name: 'Account family (fan-out) — populated',
  render: () => <UsageOverviewScreen />,
};

export const PopulatedLight: Story = {
  name: 'Account family — populated — wireframe (light)',
  render: () => <UsageOverviewScreen />,
  globals: { theme: 'wireframe' },
};

// The cap this page has always had, stated where it is drawn: the resolver is handed an
// already-capped account list precisely so it can never silently truncate one. Both captions are
// on screen here, which is the crowded case worth looking at.
export const Truncated: Story = {
  name: 'Truncated to the top 25 accounts',
  render: () => <UsageOverviewScreen truncationCaption="Showing the top 25 of 61 accounts." />,
};

export const TruncatedLight: Story = {
  name: 'Truncated to the top 25 accounts — wireframe (light)',
  render: () => <UsageOverviewScreen truncationCaption="Showing the top 25 of 61 accounts." />,
  globals: { theme: 'wireframe' },
};

/**
 * Every panel's EMPTY rendering, which on this page is a reading in its own right: a family with
 * no usage in the window is the ordinary state of a new account family, and each panel type states
 * it inline (a `stat` shows a unit-correct `$0.00`/`0`/dash, a ring says what was not recorded)
 * rather than the grid collapsing into one centred placard.
 */
export const Empty: Story = {
  name: 'Account family — no usage in this window',
  render: () => (
    <ConsoleShell sidebar={storySidebar('settings')} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader title="Usage overview" subtitle="Your account family · This month · UTC" />
        <InlineStatus>{ACCOUNT_ONLY_ZONES_CAPTION}</InlineStatus>
        <SpecPanels page={FAMILY_PAGE} state="empty" dimensionKeys={FAMILY_DIMENSION_KEYS} />
      </div>
    </ConsoleShell>
  ),
};

export const MobileBaseTier: Story = {
  name: 'Mobile base tier',
  globals: { viewport: { value: 'base390' } },
  render: () => <UsageOverviewScreen />,
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile base tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <UsageOverviewScreen />,
};
