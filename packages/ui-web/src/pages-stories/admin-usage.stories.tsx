// Page-level story for `/admin/usage` — the estate's usage surface (converse-frontends#448,
// story C5), and the review surface for a page that is ENTIRELY a `dashboards.yaml` entry.
//
// **It reads the real document.** `spec-page.tsx` imports `apps/console/dashboards.yaml?raw`, so
// the nineteen panels below are the nineteen panels the console draws, in the same order, at the
// same spans, through the same `DashboardGrid` / `DashboardPanel` / renderer registry
// `dashboard-renderer.tsx` uses. Add a panel to that file and it appears here on reload, with no
// story edit — which is the only way a story can honestly certify a page it does not own.
//
// **What this story is FOR, specifically.** Three of the page's dimensions (`azp`, `operation`,
// `billing_plan`) come from lane A3's bridge columns, and its actor names come from lane A2's
// `resolveActorLabels`. A reviewer should not have to wait for a deployment carrying both to judge
// whether the page reads well — the mocked query layer (`panelFixtures`) makes the layout, the
// panel mix, the density and the rhythm reviewable today.
//
// **The four states are all here**, in both themes, because three of them are where dashboards
// usually lie: an EMPTY window must show each panel's own inline status line rather than a centred
// placard or a collapsed zone; a TRUNCATED response must say so, naming the limit, rather than
// drawing a quietly short chart; and an ERRORED panel must keep its card, title and Expand button
// so the page does not reflow around it.
//
// Deliberately NOT reviewed here: whether the numbers are right. That is `panel-adapters`' and
// `derived-metrics`' own unit tests, and `admin-usage-page.test.ts` for the YAML contract.

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConsoleShell } from '../components/console-shell';
import { DateRangeField, presetRange } from '../components/date-range-field';
import { SegmentedControl } from '../components/segmented-control';
import { RANGE_PRESETS } from '../sections/overview-controls/fixtures';
import { PageHeader } from '../sections/page-header';
import { SpecPanels, specPage } from './spec-page';
import type { SpecPageState } from './spec-page';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));
const PAGE = specPage('/admin/usage');

/** Users first — the owner's actor-identity rule, and the order the console's own control uses. */
const LENS_OPTIONS = [
  { value: 'user', label: 'Users' },
  { value: 'account', label: 'Accounts' },
  { value: 'project', label: 'Projects' },
];

function AdminUsageScreen({ state = 'loaded' }: { state?: SpecPageState }) {
  const [lens, setLens] = React.useState('user');
  const [rangePreset, setRangePreset] = React.useState<string | null>('mtd');
  const [range, setRange] = React.useState(presetRange('mtd', STORY_TODAY));

  return (
    <ConsoleShell sidebar={storySidebar('admin', { isAdmin: true })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Usage"
          subtitle="Operator · Every account with usage · This month · UTC"
          controls={
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                aria-label="Actor lens"
                options={LENS_OPTIONS}
                value={lens}
                onChange={setLens}
              />
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
            </div>
          }
        />

        <SpecPanels page={PAGE} state={state} />
      </div>
    </ConsoleShell>
  );
}

const meta: Meta = {
  title: 'Pages/AdminUsage',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

export const Populated: Story = { render: () => <AdminUsageScreen /> };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <AdminUsageScreen />,
  globals: { theme: 'wireframe' },
};

/** Nothing drew anything in the window. Every panel keeps its zone and states the absence inline —
 *  an axis still drawn, a ring outline still drawn, a status line where the rows would be. */
export const Empty: Story = { render: () => <AdminUsageScreen state="empty" /> };

export const EmptyLight: Story = {
  name: 'Empty — wireframe (light)',
  render: () => <AdminUsageScreen state="empty" />,
  globals: { theme: 'wireframe' },
};

/** The backend dropped the oldest buckets to fit each panel's own `limit`
 *  (lightbridge-authz#578). Every panel says so, naming the number — the reading is short, and a
 *  chart that did not admit it would be the more confident lie. */
export const Truncated: Story = { render: () => <AdminUsageScreen state="truncated" /> };

export const TruncatedLight: Story = {
  name: 'Truncated — wireframe (light)',
  render: () => <AdminUsageScreen state="truncated" />,
  globals: { theme: 'wireframe' },
};

/** Every request failed. In the console a panel fails ALONE — this is the all-failed extreme,
 *  shown because it is the layout that has to survive it. */
export const Errored: Story = { render: () => <AdminUsageScreen state="error" /> };

export const ErroredLight: Story = {
  name: 'Errored — wireframe (light)',
  render: () => <AdminUsageScreen state="error" />,
  globals: { theme: 'wireframe' },
};

/** The one-column tier: every panel is full width, `span: 2` included. */
export const MobileBaseTier: Story = {
  render: () => <AdminUsageScreen />,
  globals: { viewport: { value: 'base390' } },
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile — wireframe (light)',
  render: () => <AdminUsageScreen />,
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};
