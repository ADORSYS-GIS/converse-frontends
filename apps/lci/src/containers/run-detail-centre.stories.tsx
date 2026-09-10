// `/runs/[id]` — one run: status, trigger, the persisted review, and how to reach its logs.
//
// `grafanaBaseUrl` is the whole switch on the "Run logs" card: `null` (no
// `NEXT_PUBLIC_GRAFANA_URL` at build time) drops the card entirely rather than rendering an empty
// frame, and the `kubectl` snippet is always there either way. Both branches are storied, because
// the deployed default is the one WITHOUT Grafana.
//
// Since converse-frontends#504 (ADR 0015 amendment A2) the outcome badge is a one-group
// `PageControls` row on the floor rather than `PageHeader.controls`, which no longer exists. It
// stays a toned `StatusText` and is deliberately not folded into the `·`-joined subtitle beside it:
// the tone is the point.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RunDetailCentre } from './run-detail-centre';
import { NOW, REVIEW, task, TASKS, withPagePadding } from './story-fixtures';

const SUCCEEDED = TASKS[0];

const meta = {
  title: 'Pages/LCI/RunDetail',
  component: RunDetailCentre,
  parameters: { layout: 'fullscreen' },
  decorators: [withPagePadding],
  args: { now: NOW, grafanaBaseUrl: null },
} satisfies Meta<typeof RunDetailCentre>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A completed review with a P0 security finding, a P1, and one bare row with no detail. */
export const Default: Story = {
  args: {
    taskResult: { ok: true, data: SUCCEEDED },
    reviewResult: { ok: true, data: REVIEW },
  },
};

export const Wireframe: Story = {
  args: Default.args,
  globals: { theme: 'wireframe' },
};

/** `NEXT_PUBLIC_GRAFANA_URL` set — the embedded Loki panel appears above the kubectl snippet. */
export const WithGrafana: Story = {
  args: { ...Default.args, grafanaBaseUrl: 'https://grafana.example.internal' },
};

/** Still running: no review yet, and the copy says so rather than showing an empty review card. */
export const InProgress: Story = {
  args: {
    taskResult: {
      ok: true,
      data: task({ id: 'tsk_02b7n9q1wxy4', status: 'running', completed_at: null }),
    },
    reviewResult: { ok: true, data: null },
  },
};

/** Finished, but the agent posted nothing — a distinct sentence from "not completed yet". */
export const NoReviewPosted: Story = {
  args: {
    taskResult: { ok: true, data: SUCCEEDED },
    reviewResult: { ok: true, data: null },
  },
};

/** The run loaded, the review query did not. The page keeps its header; only the card degrades. */
export const ReviewUnavailable: Story = {
  args: {
    taskResult: { ok: true, data: SUCCEEDED },
    reviewResult: { ok: false, reason: 'unavailable' },
  },
};

export const Unavailable: Story = {
  args: { taskResult: { ok: false, reason: 'unavailable' }, reviewResult: null },
};

export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: 'base390' } },
};
