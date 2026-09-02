// Page-level stories for the FOUR `/settings/overview/*` analytics lenses, and the PARITY ORACLE
// for their migration onto the declarative engine (converse-frontends#455, story C12).
//
// **What changed, and why this file shrank by ~700 lines.** The four lenses used to be
// hand-composed here against a dozen bespoke fixtures — a second implementation of four pages,
// drifting from the console's own by construction. Each lens is a `dashboards.yaml` entry now, so
// these stories READ THOSE ENTRIES (`spec-page.tsx`) and draw them through the same
// `DashboardGrid` / `DashboardPanel` / renderer registry `apps/console`'s `dashboard-renderer.tsx`
// uses. A panel added to, removed from, or retitled in the document shows up here on reload, with
// no story edit.
//
// **The zones beside each grid are hand-written on purpose, here and in the console**, because
// `dashboards.yaml` describes usage queries over the page's RANGE and none of these is one:
//  - account lens → BUDGET BURN-DOWN (a cumulative chart over the BILLING PERIOD, against a
//    ceiling that is an RPC) and, for an admin, KEY HYGIENE (a refine listing of API keys);
//  - project lens → for an admin, BUDGET PRESSURE (the account-wide per-project draw on that same
//    single ceiling, likewise over the billing period);
//  - user lens → nothing at all;
//  - usage lens → nothing but the account-cap caption, which is a fact about the FAN-OUT rather
//    than about any panel.
//
// **The Export action is `apps/console`'s** (`DashboardExportButton`, converse-frontends#453 — it
// fetches `/api/reports/page`), so it is not drawn here. The three narrower lenses carry it; the
// `usage` lens deliberately does NOT, because a `scope: family` page needs the caller's own account
// family and a report route has no session to read one from — see `usage-overview-centre.tsx`.
//
// **Divergences from the hand-composed lenses, deliberate and named:**
//  - Spend over time is a LINE, not bars. The engine has one series shape (with the
//    Linear/Log/Indexed toggle every other declarative page carries); a bars-only renderer
//    existing solely for these three lenses would be the hand-written container coming back
//    through the registry. The data is identical.
//  - Bucket width follows the range (`bucket: auto`) instead of always being one day.
//  - "Cost / request" is a DASH when the window carried no requests, where the deleted hook
//    printed `$0.00`.
//  - Each lens gains a "Models in use" stat, free off the grouped query it already fires.
//  - The `usage` lens is a `scope: family` FAN-OUT — the accounts this identity can see, capped
//    and captioned — not `scope: all`, which is the whole deployment and needs `usage:read-all`.
//
// Storybook-only. Nothing here is exported from `src/index.ts`.

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from '../components/card';
import { ConsoleShell } from '../components/console-shell';
import { DateRangeField, presetRange } from '../components/date-range-field';
import { InlineStatus } from '../components/inline-status';
import { SelectField } from '../components/select-field';
import type { SelectFieldOption } from '../components/select-field';
import type { SpendSeriesSeries } from '../components/spend-series-chart';
import { formatUsd, formatUsdAxis } from '../lib/money';
import { ApiKeysHygieneNotes } from '../sections/api-keys-hygiene-notes';
import { apiKeysHygiene } from '../sections/api-keys-hygiene-notes/fixtures';
import { BudgetPressure } from '../sections/budget-pressure';
import type { BudgetPressureStatus } from '../sections/budget-pressure';
import {
  ADMIN_BUDGET_PRESSURE_NOTE,
  ADMIN_CEILING,
  adminBudgetPressureProjects,
} from '../sections/budget-pressure/fixtures';
import { DashboardGrid } from '../sections/dashboard-grid';
import { RANGE_PRESETS } from '../sections/overview-controls/fixtures';
import { PageHeader } from '../sections/page-header';
import { SpendDashboard } from '../sections/spend-dashboard';
import type { DashboardStatus } from '../sections/spend-dashboard';
import { SpecPanels, specPage } from './spec-page';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));

type SettingsLens = 'account' | 'project' | 'user';

const LENS_PAGE = {
  account: specPage('/settings/overview/account'),
  project: specPage('/settings/overview/project'),
  user: specPage('/settings/overview/user'),
} as const;

const LENS_TITLE: Record<SettingsLens, string> = {
  account: 'Account overview',
  project: 'Project overview',
  user: 'Your usage',
};

// Identity text, matching `use-settings-overview-zones.ts`'s own `subtitle` — never a range/date
// string, which lives in the `DateRangeField` control itself.
const LENS_SUBTITLE: Record<SettingsLens, string> = {
  account: 'adorsys-gis',
  project: 'gateway-prod',
  user: 'Sam Lambou',
};

const PROJECT_PICKER_OPTIONS: SelectFieldOption[] = [
  { value: '', label: 'Select a project…' },
  { value: 'proj_gateway', label: 'gateway-prod' },
  { value: 'proj_staging', label: 'gateway-staging' },
];

function daysFrom(base: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => new Date(base.getTime() + i * 86_400_000));
}

// The account lens' cumulative budget burn-down (`zones.burnDown`) — raw per-bucket values;
// `SpendDashboard`'s `cumulative` prop runs the forward-fill/running-total math. Crosses
// `ADMIN_CEILING` partway through the month.
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

const BURN_DOWN_CAPTION =
  'Measured over the billing period, not the range picked above — a ceiling is a fact about this ' +
  'calendar month.';

interface SettingsOverviewLensScreenProps {
  lens: SettingsLens;
  showAdmin?: boolean;
  /** `false` only demonstrated for the `project` lens (no project selected yet) — every panel is
   *  suspended rather than fired unscoped, matching `zones.ready`. */
  ready?: boolean;
  burnDownStatus?: DashboardStatus;
  adminPressureStatus?: BudgetPressureStatus;
  adminPressureCeiling?: number | null;
  adminHygieneCaveat?: string;
}

/** The ONE composition behind all three `/settings/overview/{account,project,user}` lenses —
 *  mirrors `apps/console/src/containers/settings-overview-centre.tsx`, render for render. */
function SettingsOverviewLensScreen({
  lens,
  showAdmin = false,
  ready = true,
  burnDownStatus = 'ready',
  adminPressureStatus = 'ready',
  adminPressureCeiling = ADMIN_CEILING,
  adminHygieneCaveat,
}: SettingsOverviewLensScreenProps) {
  const [rangePreset, setRangePreset] = useState<string | null>('mtd');
  const [range, setRange] = useState(presetRange('mtd', STORY_TODAY));
  const [projectValue, setProjectValue] = useState(
    lens === 'project' && ready ? 'proj_gateway' : ''
  );

  const showBurnDown = lens === 'account';
  const showPressure = lens === 'project' && showAdmin;
  const showHygiene = lens === 'account' && showAdmin;

  return (
    <ConsoleShell sidebar={storySidebar('settings', { showAdmin })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={LENS_TITLE[lens]}
          subtitle={ready ? LENS_SUBTITLE[lens] : 'No project selected'}
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
          <InlineStatus>Select a project above to see its usage.</InlineStatus>
        ) : (
          <>
            <SpecPanels page={LENS_PAGE[lens]} />

            {showBurnDown || showPressure || showHygiene ? (
              <DashboardGrid>
                {showBurnDown ? (
                  <Card data-span="2">
                    <SpendDashboard
                      label="Budget burn-down this period"
                      series={burnDownStatus === 'ready' ? ACCOUNT_BURN_DOWN_SERIES : []}
                      status={burnDownStatus}
                      cumulative
                      ceiling={ADMIN_CEILING}
                      fallbackWidth={1120}
                      height={200}
                      formatYTick={formatUsdAxis}
                      formatTooltipValue={formatUsd}
                    />
                    <InlineStatus className="mt-2">{BURN_DOWN_CAPTION}</InlineStatus>
                  </Card>
                ) : null}

                {/* Admin-only, purely additive — OMITTED (never empty-stated) for a non-admin or
                    the wrong lens, exactly as the container gates them. */}
                {showPressure ? (
                  <Card data-span="2">
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

                {showHygiene ? (
                  <Card data-span="2" title="Key hygiene">
                    <InlineStatus>52 active · 4 revoked · 1 expiring within 6 days</InlineStatus>
                    <ApiKeysHygieneNotes className="mt-3" hygiene={apiKeysHygiene} />
                    {adminHygieneCaveat ? (
                      <InlineStatus className="mt-2">{adminHygieneCaveat}</InlineStatus>
                    ) : null}
                  </Card>
                ) : null}
              </DashboardGrid>
            ) : null}
          </>
        )}
      </div>
    </ConsoleShell>
  );
}

// ── the fourth lens: `usage`, the account-family fan-out ─────────────────────────────────────

const FAMILY_PAGE = specPage('/settings/overview/usage');

interface UsageOverviewScreenProps {
  showAdmin?: boolean;
  /** Only rendered when the cap actually dropped real accounts — never an apology for a
   *  truncation that did not happen. */
  truncationCaption?: string;
}

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

        <SpecPanels page={FAMILY_PAGE} />
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
  render: () => <SettingsOverviewLensScreen lens="account" showAdmin />,
};

export const AccountPopulatedAdminLight: Story = {
  name: 'Account — populated, admin — wireframe (light)',
  render: () => <SettingsOverviewLensScreen lens="account" showAdmin />,
  globals: { theme: 'wireframe' },
};

// Non-admin: the SAME lens, Key hygiene card omitted entirely (never empty-stated).
export const AccountPopulatedMember: Story = {
  name: 'Account — populated, non-admin (Key hygiene omitted)',
  render: () => <SettingsOverviewLensScreen lens="account" />,
};

export const AccountLoading: Story = {
  name: 'Account — burn-down loading',
  render: () => <SettingsOverviewLensScreen lens="account" showAdmin burnDownStatus="loading" />,
};

export const AccountHygieneTruncated: Story = {
  name: 'Account — key listing truncated',
  render: () => (
    <SettingsOverviewLensScreen
      lens="account"
      showAdmin
      adminHygieneCaveat="Counted over the first 100 of 140 keys in this account — the rest are beyond this page."
    />
  ),
};

export const AccountMobileBaseTier: Story = {
  name: 'Account — mobile base tier',
  globals: { viewport: { value: 'base390' } },
  render: () => <SettingsOverviewLensScreen lens="account" showAdmin />,
};

export const AccountMobileBaseTierLight: Story = {
  name: 'Account — mobile base tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <SettingsOverviewLensScreen lens="account" showAdmin />,
};

// ── project lens ──────────────────────────────────────────────────────────────────────────────

export const ProjectPopulatedAdmin: Story = {
  name: 'Project — populated, admin (Budget pressure shown)',
  render: () => <SettingsOverviewLensScreen lens="project" showAdmin />,
};

export const ProjectPopulatedAdminLight: Story = {
  name: 'Project — populated, admin — wireframe (light)',
  render: () => <SettingsOverviewLensScreen lens="project" showAdmin />,
  globals: { theme: 'wireframe' },
};

export const ProjectPopulatedMember: Story = {
  name: 'Project — populated, non-admin (Budget pressure omitted)',
  render: () => <SettingsOverviewLensScreen lens="project" />,
};

// No project scoped yet — every panel is suspended rather than fired unscoped, matching
// `zones.ready === false` on this lens exactly.
export const ProjectUnselected: Story = {
  name: 'Project — no project selected',
  render: () => <SettingsOverviewLensScreen lens="project" ready={false} />,
};

export const ProjectNoCeiling: Story = {
  name: 'Project — budget pressure with no readable ceiling',
  render: () => <SettingsOverviewLensScreen lens="project" showAdmin adminPressureCeiling={null} />,
};

export const ProjectMobileBaseTier: Story = {
  name: 'Project — mobile base tier',
  globals: { viewport: { value: 'base390' } },
  render: () => <SettingsOverviewLensScreen lens="project" showAdmin />,
};

export const ProjectMobileBaseTierLight: Story = {
  name: 'Project — mobile base tier — wireframe (light)',
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
  render: () => <SettingsOverviewLensScreen lens="project" showAdmin />,
};

// ── user lens ─────────────────────────────────────────────────────────────────────────────────

// No admin-only card exists on this lens at all — `showAdmin` is exercised on the sidebar's Operator
// nav group only, never as a second populated variant.
export const UserPopulated: Story = {
  name: 'User — populated',
  render: () => <SettingsOverviewLensScreen lens="user" showAdmin />,
};

export const UserPopulatedLight: Story = {
  name: 'User — populated — wireframe (light)',
  render: () => <SettingsOverviewLensScreen lens="user" showAdmin />,
  globals: { theme: 'wireframe' },
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

// ── usage lens (the account-family fan-out) ──────────────────────────────────────────────────

export const UsageFamilyPopulated: Story = {
  name: 'Usage — account family (fan-out)',
  render: () => <UsageOverviewScreen />,
};

export const UsageFamilyPopulatedLight: Story = {
  name: 'Usage — account family — wireframe (light)',
  render: () => <UsageOverviewScreen />,
  globals: { theme: 'wireframe' },
};

// The cap this page has always had, stated where it is drawn: the resolver is handed an
// already-capped account list precisely so it can never silently truncate one.
export const UsageTruncated: Story = {
  name: 'Usage — truncated to the top accounts',
  render: () => <UsageOverviewScreen truncationCaption="Showing the top 25 of 61 accounts." />,
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
