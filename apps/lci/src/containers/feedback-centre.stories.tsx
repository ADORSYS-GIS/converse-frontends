// `/feedback` — what reviewers did with the comments posted across every repository, for the URL's
// range. Every figure is a control-plane aggregate (LCI ADR-0118); a single repository's version of
// this board is `Pages/LCI/RepositoryFeedback`.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { FeedbackCentre } from './feedback-centre';
import { FEEDBACK_NOW, feedbackAnalytics } from './feedback-fixtures';
import { withNuqs, withPagePadding } from './story-fixtures';

const meta = {
  title: 'Pages/LCI/Feedback',
  component: FeedbackCentre,
  parameters: { layout: 'fullscreen' },
  decorators: [withNuqs, withPagePadding],
  args: {
    now: FEEDBACK_NOW,
    feedback: { ok: true, data: feedbackAnalytics() },
  },
} satisfies Meta<typeof FeedbackCentre>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Light theme — a hardcoded colour shows up in exactly one of the two. */
export const Wireframe: Story = { globals: { theme: 'wireframe' } };

/** The cap cut the repositories list short, and the page says so above the grid. */
export const Truncated: Story = {
  args: { feedback: { ok: true, data: feedbackAnalytics({ by_repository_truncated: true }) } },
};

/** The control plane is down. Every panel errors in place — never a fabricated zero. */
export const Unavailable: Story = {
  args: { feedback: { ok: false, reason: 'unavailable' } },
};

/** Narrow viewport — the grid collapses to one column. */
export const Mobile: Story = { globals: { viewport: { value: 'base390' } } };
