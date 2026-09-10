// Page-level story for `/admin/usage/channels/[channelId]` — one OAuth client's usage
// (converse-frontends#449, story C6).
//
// **It reads the real document.** The seven panels below are `apps/console/dashboards.yaml`'s own
// `/admin/usage/channels/[channelId]` entry, drawn through the same registry the console uses.
//
// **What this story is FOR.** Two things a panel-level story cannot show. First, the HEADER is the
// raw `azp` string — a channel has no profile to resolve and this console does not invent one, so
// a reviewer should see what a page titled after an OAuth client id actually reads like. Second,
// the `Requests by operation` ranking is the first surface anywhere in the console to render A3's
// `operation` dimension, and it must read as English ("Chat completions", not
// `chat_completions`) — the humanising happens in `panel-adapters.tsx`, and this is where a
// reviewer sees the result.

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { ConsoleShell } from '../components/console-shell';
import { DateRangeField, presetRange } from '../components/date-range-field';
import { RANGE_PRESETS } from '../sections/overview-controls/fixtures';
import { PageControls } from '../sections/page-controls';
import { PageHeader } from '../sections/page-header';
import { SpecPanels, specPage } from './spec-page';
import type { SpecPageState } from './spec-page';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));
const PAGE = specPage('/admin/usage/channels/[channelId]');

/** A real-shaped client id: lowercase, hyphenated, no display name anywhere to resolve it to. */
const CHANNEL_ID = 'opencode-cli';

function AdminUsageChannelScreen({ state = 'loaded' }: { state?: SpecPageState }) {
  const [rangePreset, setRangePreset] = React.useState<string | null>('mtd');
  const [range, setRange] = React.useState(presetRange('mtd', STORY_TODAY));

  return (
    <ConsoleShell sidebar={storySidebar('admin', { showAdmin: true })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={CHANNEL_ID}
          subtitle="Channel · OAuth client (azp) · Every account · This month · UTC"
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="sm">
                ← Usage
              </Button>
              <Button variant="secondary">Export</Button>
            </div>
          }
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

        <SpecPanels page={PAGE} state={state} />
      </div>
    </ConsoleShell>
  );
}

const meta: Meta = {
  title: 'Pages/Admin/UsageByChannel',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

export const Populated: Story = { render: () => <AdminUsageChannelScreen /> };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <AdminUsageChannelScreen />,
  globals: { theme: 'wireframe' },
};

/** A client that drew nothing in the window — which is also what an unknown `azp` renders, and
 *  deliberately the same page: nothing can tell "no such client" from "a quiet month". */
export const Empty: Story = { render: () => <AdminUsageChannelScreen state="empty" /> };

export const EmptyLight: Story = {
  name: 'Empty — wireframe (light)',
  render: () => <AdminUsageChannelScreen state="empty" />,
  globals: { theme: 'wireframe' },
};

/** The backend dropped the oldest buckets to fit each panel's own `limit`. Every panel says so,
 *  naming the number — a chart that did not admit it would be the more confident lie. */
export const Truncated: Story = { render: () => <AdminUsageChannelScreen state="truncated" /> };

export const TruncatedLight: Story = {
  name: 'Truncated — wireframe (light)',
  render: () => <AdminUsageChannelScreen state="truncated" />,
  globals: { theme: 'wireframe' },
};

export const Errored: Story = { render: () => <AdminUsageChannelScreen state="error" /> };

export const ErroredLight: Story = {
  name: 'Errored — wireframe (light)',
  render: () => <AdminUsageChannelScreen state="error" />,
  globals: { theme: 'wireframe' },
};

export const MobileBaseTier: Story = {
  render: () => <AdminUsageChannelScreen />,
  globals: { viewport: { value: 'base390' } },
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile — wireframe (light)',
  render: () => <AdminUsageChannelScreen />,
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};
