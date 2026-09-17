// `/analytics` — review activity, findings and reviewer feedback across every repository, for the
// URL's range. Every figure is a control-plane aggregate (ADR 0018); a single repository's version
// of this board is `Pages/LCI/RepositoryInsights`.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsCentre } from './analytics-centre';
import { ANALYTICS_NOW, feedbackAnalytics, reviewAnalytics } from './analytics-fixtures';
import { withNuqs, withPagePadding } from './story-fixtures';

const meta = {
  title: 'Pages/LCI/Analytics',
  component: AnalyticsCentre,
  parameters: { layout: 'fullscreen' },
  decorators: [withNuqs, withPagePadding],
  args: {
    now: ANALYTICS_NOW,
    reviews: { ok: true, data: reviewAnalytics() },
    feedback: { ok: true, data: feedbackAnalytics() },
  },
} satisfies Meta<typeof AnalyticsCentre>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Light theme — a hardcoded colour shows up in exactly one of the two. */
export const Wireframe: Story = { globals: { theme: 'wireframe' } };

/** The feedback query failed: its panels error, the review figures stay on screen. */
export const FeedbackUnavailable: Story = {
  args: { feedback: { ok: false, reason: 'error', status: 500 } },
};

/** The control plane is down. Every panel errors in place — never a fabricated zero. */
export const Unavailable: Story = {
  args: {
    reviews: { ok: false, reason: 'unavailable' },
    feedback: { ok: false, reason: 'unavailable' },
  },
};

/** Narrow viewport — the grid collapses to one column. */
export const Mobile: Story = { globals: { viewport: { value: 'base390' } } };
