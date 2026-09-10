// Page-level story for `/admin/usage/chats` — the estate's chat-shaped operations
// (converse-frontends#449, story C6).
//
// **It reads the real document.** The five panels below are `apps/console/dashboards.yaml`'s own
// `/admin/usage/chats` entry, drawn through the same registry the console uses.
//
// **What this story is FOR: the latency pair, side by side.** ADR 0013 D5 limited latency to stat
// cards "until history depth justifies a series"; that limit is amended for this page (C11 carries
// the write-up) because the usage backend computes `percentile_cont` PER BUCKET GROUP at query
// time — every plotted p50/p95 point is a real percentile of that bucket's own samples, not an
// interpolation between window aggregates. The two panels make different claims and have to be
// legible as different claims: the SERIES is per bucket over time, the CARDS state the window's
// WORST bucket per model. A reviewer looking at them together is the check that neither reads as a
// restatement of the other.
//
// The tab row above the grid is the second thing to review: `/admin/usage/chats` is a LENS on
// `/admin/usage`, not a sibling destination, so it lives behind that page's own Estate | Chats tabs
// rather than a sixth admin rail row — which is why the rail below still lights **Usage**.

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { ConsoleShell } from '../components/console-shell';
import { DateRangeField, presetRange } from '../components/date-range-field';
import { SubNav } from '../components/sub-nav';
import { RANGE_PRESETS } from '../sections/overview-controls/fixtures';
import { PageControls } from '../sections/page-controls';
import { PageHeader } from '../sections/page-header';
import { SpecPanels, specPage } from './spec-page';
import type { SpecPageState } from './spec-page';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));
const PAGE = specPage('/admin/usage/chats');

const TABS = [
  { key: 'estate', label: 'Estate', href: '/admin/usage' },
  { key: 'chats', label: 'Chats', href: '/admin/usage/chats', active: true },
];

function AdminUsageChatsScreen({ state = 'loaded' }: { state?: SpecPageState }) {
  const [rangePreset, setRangePreset] = React.useState<string | null>('mtd');
  const [range, setRange] = React.useState(presetRange('mtd', STORY_TODAY));

  return (
    <ConsoleShell sidebar={storySidebar('admin', { showAdmin: true })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Chats"
          subtitle="Operator · /v1/chat/completions, /v1/responses and /v1/messages · This month · UTC"
          action={<Button variant="secondary">Export</Button>}
        />

        <PageControls
          groups={[
            {
              id: 'controls',
              label: 'Filters',
              children: (
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
              ),
            },
          ]}
        />

        <SubNav orientation="horizontal" items={TABS} />

        <SpecPanels page={PAGE} state={state} />
      </div>
    </ConsoleShell>
  );
}

const meta: Meta = {
  title: 'Pages/Admin/UsageByChat',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

export const Populated: Story = { render: () => <AdminUsageChatsScreen /> };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <AdminUsageChatsScreen />,
  globals: { theme: 'wireframe' },
};

/** No chat traffic in the window. The latency series keeps its axis and states the absence inline
 *  — a latency chart that vanished would read as "fast", which is the opposite of what it means. */
export const Empty: Story = { render: () => <AdminUsageChatsScreen state="empty" /> };

export const EmptyLight: Story = {
  name: 'Empty — wireframe (light)',
  render: () => <AdminUsageChatsScreen state="empty" />,
  globals: { theme: 'wireframe' },
};

export const Truncated: Story = { render: () => <AdminUsageChatsScreen state="truncated" /> };

export const TruncatedLight: Story = {
  name: 'Truncated — wireframe (light)',
  render: () => <AdminUsageChatsScreen state="truncated" />,
  globals: { theme: 'wireframe' },
};

export const Errored: Story = { render: () => <AdminUsageChatsScreen state="error" /> };

export const ErroredLight: Story = {
  name: 'Errored — wireframe (light)',
  render: () => <AdminUsageChatsScreen state="error" />,
  globals: { theme: 'wireframe' },
};

export const MobileBaseTier: Story = {
  render: () => <AdminUsageChatsScreen />,
  globals: { viewport: { value: 'base390' } },
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile — wireframe (light)',
  render: () => <AdminUsageChatsScreen />,
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};
