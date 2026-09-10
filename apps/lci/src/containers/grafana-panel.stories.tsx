// One chromeless embedded Grafana panel (`d-solo` + `kiosk`), sized to sit inside a `Card`.
//
// A story cannot reach a real Grafana, so what these variants actually certify is the URL this
// component builds and the box it reserves — both of which are the parts that break silently. The
// iframe renders empty in the preview; that is expected, not a broken story. The "no Grafana
// configured" case is NOT this component's — callers drop it entirely and render an inline line
// instead (see `Pages/LCI/RepositoryOverview`), which is why there is no `Unavailable` story here.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { GrafanaPanel } from './grafana-panel';

const meta = {
  title: 'LCI/GrafanaPanel',
  component: GrafanaPanel,
  args: {
    baseUrl: 'https://grafana.example.internal',
    dashboardUid: 'lci-review-cost',
    dashboardSlug: 'review-cost',
    panelId: 100,
    title: 'Billed cost',
    vars: { repo: 'adorsys-gis/lightbridge-authz', model: '.+' },
  },
} satisfies Meta<typeof GrafanaPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Wireframe: Story = { globals: { theme: 'wireframe' } };

/** With an explicit range — what the repository Overview tab passes for its 30-day analytics. */
export const WithRange: Story = {
  args: { range: { from: 'now-30d', to: 'now' } },
};

/** The run-logs panel: taller, and scoped by task id rather than repo. */
export const RunLogs: Story = {
  args: {
    dashboardUid: 'lci-task-runs',
    dashboardSlug: 'task-runs',
    title: 'Run logs (Grafana / Loki)',
    vars: { task_id: 'tsk_01j8k2m4pqr7' },
    minHeight: 420,
  },
};

/** A trailing slash on the base URL must not produce a double slash in the built `src`. */
export const TrailingSlashBaseUrl: Story = {
  args: { baseUrl: 'https://grafana.example.internal/' },
};
