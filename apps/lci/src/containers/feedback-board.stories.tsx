// `/repositories/[id]/feedback` — one repository's reviewer reactions from the control plane's
// aggregates (LCI ADR-0118). The estate-wide version of this board is `Pages/LCI/Feedback`.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { FeedbackBoard } from './feedback-board';
import { FEEDBACK_NOW, repositoryFeedbackAnalytics } from './feedback-fixtures';
import { withNuqs, withPagePadding } from './story-fixtures';

const repository = repositoryFeedbackAnalytics();

const meta = {
  title: 'Pages/LCI/RepositoryFeedback',
  component: FeedbackBoard,
  parameters: { layout: 'fullscreen' },
  decorators: [withNuqs, withPagePadding],
  args: {
    scope: 'repository',
    now: FEEDBACK_NOW,
    feedback: { ok: true, data: repository },
  },
} satisfies Meta<typeof FeedbackBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Light theme — a hardcoded colour shows up in exactly one of the two. */
export const Wireframe: Story = { globals: { theme: 'wireframe' } };

/** A quiet week inside the poll window: no comments, so nothing to react to — every panel says so
 *  in words rather than drawing a flat line at zero. */
export const NoActivity: Story = {
  args: {
    feedback: {
      ok: true,
      data: repositoryFeedbackAnalytics({
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
          approval_rate: null,
        },
        series: [],
      }),
    },
  },
};

/** The request failed: every panel errors in place. */
export const Unavailable: Story = {
  args: { feedback: { ok: false, reason: 'error', status: 500 } },
};

export const Mobile: Story = { globals: { viewport: { value: 'base390' } } };
