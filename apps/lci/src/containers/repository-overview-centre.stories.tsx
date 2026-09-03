// `/repositories/[id]` — the Overview tab: review analytics plus the repository's own facts.
//
// Rendered here WITHOUT the `RepositoryShell` chrome around it, matching how the route composes
// it (the shell is the layout, this is the page). `Pages/LCI/RepositoryShell` covers the chrome.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RepositoryOverviewCentre } from './repository-overview-centre';
import { NOW, repository, withPagePadding } from './story-fixtures';

const meta = {
  title: 'Pages/LCI/RepositoryOverview',
  component: RepositoryOverviewCentre,
  parameters: { layout: 'fullscreen' },
  decorators: [withPagePadding],
  args: { now: NOW, grafanaBaseUrl: null },
} satisfies Meta<typeof RepositoryOverviewCentre>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The deployed default: no `NEXT_PUBLIC_GRAFANA_URL`, so the analytics card carries one honest
 * line naming the variable instead of two dead iframes.
 */
export const Default: Story = {
  args: { result: { ok: true, data: repository() } },
};

export const Wireframe: Story = {
  args: Default.args,
  globals: { theme: 'wireframe' },
};

/** With Grafana configured — billed cost and tokens used, side by side at `sm` and up. */
export const WithGrafana: Story = {
  args: {
    result: { ok: true, data: repository() },
    grafanaBaseUrl: 'https://grafana.example.internal',
  },
};

/** Never approved, never run: the facts grid falls back rather than printing zeroes as facts. */
export const NeverRun: Story = {
  args: {
    result: {
      ok: true,
      data: repository({
        id: 3,
        name: 'lightbridge-code-intelligence',
        status: 'pending',
        approved_at: null,
        approved_by: null,
        task_count: 0,
        last_task_at: null,
      }),
    },
  },
};

export const Unavailable: Story = {
  args: { result: { ok: false, reason: 'unavailable' } },
};

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'base390' } },
};
