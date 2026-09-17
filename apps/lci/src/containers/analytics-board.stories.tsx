// `/repositories/[id]/insights` — one repository's review analytics from the control plane's
// aggregates (ADR 0018). The estate-wide version of this board is `Pages/LCI/Analytics`.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { AnalyticsBoard } from './analytics-board';
import { ANALYTICS_NOW, feedbackAnalytics, reviewAnalytics } from './analytics-fixtures';
import { withNuqs, withPagePadding } from './story-fixtures';

const repositoryReviews = reviewAnalytics({ repository_id: 2, by_repository: null });
const repositoryFeedback = feedbackAnalytics({ repository_id: 2, by_repository: null });

const meta = {
  title: 'Pages/LCI/RepositoryInsights',
  component: AnalyticsBoard,
  parameters: { layout: 'fullscreen' },
  decorators: [withNuqs, withPagePadding],
  args: {
    scope: 'repository',
    now: ANALYTICS_NOW,
    reviews: { ok: true, data: repositoryReviews },
    feedback: { ok: true, data: repositoryFeedback },
  },
} satisfies Meta<typeof AnalyticsBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Light theme — a hardcoded colour shows up in exactly one of the two. */
export const Wireframe: Story = { globals: { theme: 'wireframe' } };

/** A quiet week inside the poll window: no runs, no comments — every panel says so in words. */
export const NoActivity: Story = {
  args: {
    reviews: {
      ok: true,
      data: reviewAnalytics({
        repository_id: 2,
        current: {
          ...repositoryReviews.previous,
          runs: 0,
          succeeded: 0,
          failed: 0,
          cancelled: 0,
          reviews: 0,
          findings: 0,
          inline: 0,
          deferred: 0,
          out_of_scope: 0,
          p50_duration_secs: null,
          p95_duration_secs: null,
        },
        series: repositoryReviews.series.map((point) => ({
          ...point,
          runs: 0,
          succeeded: 0,
          failed: 0,
          cancelled: 0,
          reviews: 0,
          findings: 0,
        })),
        by_priority: [],
        by_category: [],
        by_repository: null,
      }),
    },
    feedback: {
      ok: true,
      data: feedbackAnalytics({
        repository_id: 2,
        window: { from: '2026-09-03T00:00:00.000Z', to: '2026-09-09T14:30:00.000Z' },
        current: {
          inline_comments: 0,
          reacted_inline: 0,
          up: 0,
          down: 0,
          other: 0,
          reactors: 0,
          reply_up: 0,
          reply_down: 0,
          unresolved: 0,
          approval_rate: null,
        },
        series: [],
        by_priority: [],
        by_category: [],
        top_downvoted: [],
        by_repository: null,
      }),
    },
  },
};

/** The feedback query failed: its five panels error, the review figures stay on screen. */
export const FeedbackUnavailable: Story = {
  args: { feedback: { ok: false, reason: 'error', status: 500 } },
};

export const Mobile: Story = { globals: { viewport: { value: 'base390' } } };
