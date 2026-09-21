import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';

import { formatCount, panelsFor } from '../lib/domain/feedback';
import { FeedbackBoard } from './feedback-board';
import { FEEDBACK_NOW, feedbackAnalytics, repositoryFeedbackAnalytics } from './feedback-fixtures';

type Props = ComponentProps<typeof FeedbackBoard>;

function renderBoard(props: Partial<Props> = {}, searchParams = '') {
  return render(
    <FeedbackBoard
      scope="estate"
      now={FEEDBACK_NOW}
      feedback={{ ok: true, data: feedbackAnalytics() }}
      {...props}
    />,
    { wrapper: withNuqsTestingAdapter({ searchParams }) }
  );
}

describe('FeedbackBoard', () => {
  it('draws every estate panel, headline figures read straight off the aggregate', () => {
    const { container } = renderBoard();

    for (const panel of panelsFor('estate')) {
      expect(container.querySelector(`#${panel.id}`), panel.id).not.toBeNull();
    }
    expect(screen.getAllByText(formatCount(feedbackAnalytics().current.up)).length).toBeGreaterThan(
      0
    );
    // Once in the repositories table, once in the most-rejected ranking — both estate panels.
    expect(screen.getAllByText('adorsys-gis/converse-frontends')).toHaveLength(2);
  });

  it('a repository page drops the estate-only panels and keeps the rest', () => {
    const { container } = renderBoard({
      scope: 'repository',
      feedback: { ok: true, data: repositoryFeedbackAnalytics() },
    });

    expect(container.querySelector('#repositories')).toBeNull();
    expect(container.querySelector('#most-rejected')).toBeNull();
    expect(container.querySelector('#acceptance')).not.toBeNull();
    expect(container.querySelector('#reactions-over-time')).not.toBeNull();
  });

  it('a failed request says so on every panel, never a fabricated zero', () => {
    renderBoard({ feedback: { ok: false, reason: 'error', status: 500 } });

    expect(screen.getAllByText("Couldn't load feedback (HTTP 500).")).toHaveLength(
      panelsFor('estate').length
    );
  });

  it('an expired session asks for a sign-in rather than reporting an outage', () => {
    renderBoard({ feedback: { ok: false, reason: 'unauthenticated' } });

    expect(
      screen.getAllByText("Your session can't reach the control plane. Sign in again.")
    ).toHaveLength(panelsFor('estate').length);
  });

  it('states the caveats above the grid: the poll window, and reactions on summary comments', () => {
    renderBoard();

    expect(screen.getByText(/are no longer refreshed/)).toBeInTheDocument();
    expect(screen.getByText(/on summary comments/)).toBeInTheDocument();
  });

  it('says when the repositories table is not the whole estate', () => {
    renderBoard({
      feedback: { ok: true, data: feedbackAnalytics({ by_repository_truncated: true }) },
    });

    expect(screen.getByText(/most down-voted repositories/)).toBeInTheDocument();
  });

  it('shows the range the URL names', () => {
    renderBoard({}, '?range=last-week');

    expect(screen.getByText('Last week')).toBeInTheDocument();
  });

  it('an empty table says so rather than drawing an empty ledger', () => {
    renderBoard({ feedback: { ok: true, data: feedbackAnalytics({ by_repository: [] }) } });

    expect(
      screen.getByText('No repository had a review comment in this window.')
    ).toBeInTheDocument();
  });
});
