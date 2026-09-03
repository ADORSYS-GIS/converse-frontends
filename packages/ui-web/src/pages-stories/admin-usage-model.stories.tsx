// Page-level story for `/admin/usage/models/[model]` — one model's usage across the estate
// (converse-frontends#449, owner feedback 2026-09-03).
//
// **It reads the real document.** The eight panels below are `apps/console/dashboards.yaml`'s own
// `/admin/usage/models/[model]` entry, drawn through the same registry the console uses.
//
// **What this story is FOR.** Three things a panel-level story cannot show. First, the HEADER is
// the raw model string — a model has no profile to resolve and this console does not invent one, so
// a reviewer should see what a page titled after a vendor model id reads like. Second, this is the
// only page in the console whose headline row is THREE compared stats (cost, requests AND tokens):
// a model is the one subject where the token count is a headline rather than a detail, and three
// bare stat cards across a two-column grid is a rhythm worth looking at before it ships. Third, it
// is the first page to carry `latency-cards` outside `/admin/usage/chats`, at a grouping that
// resolves to exactly ONE card — the shape a reviewer should confirm does not read as a broken
// panel.

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../components/button';
import { ConsoleShell } from '../components/console-shell';
import { DateRangeField, presetRange } from '../components/date-range-field';
import { RANGE_PRESETS } from '../sections/overview-controls/fixtures';
import { PageHeader } from '../sections/page-header';
import { SpecPanels, specPage } from './spec-page';
import type { SpecPageState } from './spec-page';
import { storySidebar, storyTopBar } from './shell-fixtures';

const STORY_TODAY = new Date(Date.UTC(2026, 7, 29));
const PAGE = specPage('/admin/usage/models/[model]');

/** A real-shaped model id: lowercase, hyphenated, no display name anywhere to resolve it to. */
const MODEL = 'gpt-4o';

function AdminUsageModelScreen({ state = 'loaded' }: { state?: SpecPageState }) {
  const [rangePreset, setRangePreset] = React.useState<string | null>('mtd');
  const [range, setRange] = React.useState(presetRange('mtd', STORY_TODAY));

  return (
    <ConsoleShell sidebar={storySidebar('admin', { showAdmin: true })} topBar={storyTopBar()}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={MODEL}
          subtitle="Model · Every account · This month · UTC"
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
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="sm">
                ← Usage
              </Button>
              <Button variant="secondary">Export</Button>
            </div>
          }
        />

        {/* Every panel on this page whose dimension is `model` is looking at ONE model — the page's
            own filter guarantees it. The shared fixtures are estate-shaped (five models), so
            without this narrowing the cost board would draw four lines and the latency zone four
            cards for a page that can only ever have one of each: a story reviewing a shape nobody
            ships, which is the exact failure `DimensionKeyOverrides` exists for. */}
        <SpecPanels page={PAGE} state={state} dimensionKeys={{ model: [MODEL] }} />
      </div>
    </ConsoleShell>
  );
}

const meta: Meta = {
  title: 'Pages/Admin/UsageByModel',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

export const Populated: Story = { render: () => <AdminUsageModelScreen /> };

export const PopulatedLight: Story = {
  name: 'Populated — wireframe (light)',
  render: () => <AdminUsageModelScreen />,
  globals: { theme: 'wireframe' },
};

/** A model that drew nothing in the window — which is also what an unknown model string renders,
 *  and deliberately the same page: nothing can tell "no such model" from "a quiet month". */
export const Empty: Story = { render: () => <AdminUsageModelScreen state="empty" /> };

export const EmptyLight: Story = {
  name: 'Empty — wireframe (light)',
  render: () => <AdminUsageModelScreen state="empty" />,
  globals: { theme: 'wireframe' },
};

/** The backend dropped the oldest buckets to fit each panel's own `limit`. Every panel says so,
 *  naming the number — a chart that did not admit it would be the more confident lie. */
export const Truncated: Story = { render: () => <AdminUsageModelScreen state="truncated" /> };

export const TruncatedLight: Story = {
  name: 'Truncated — wireframe (light)',
  render: () => <AdminUsageModelScreen state="truncated" />,
  globals: { theme: 'wireframe' },
};

export const Errored: Story = { render: () => <AdminUsageModelScreen state="error" /> };

export const ErroredLight: Story = {
  name: 'Errored — wireframe (light)',
  render: () => <AdminUsageModelScreen state="error" />,
  globals: { theme: 'wireframe' },
};

export const MobileBaseTier: Story = {
  render: () => <AdminUsageModelScreen />,
  globals: { viewport: { value: 'base390' } },
};

export const MobileBaseTierLight: Story = {
  name: 'Mobile — wireframe (light)',
  render: () => <AdminUsageModelScreen />,
  globals: { viewport: { value: 'base390' }, theme: 'wireframe' },
};
