import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';

import { formatCount, panelsFor } from '../lib/domain/analytics';
import { AnalyticsBoard } from './analytics-board';
import { ANALYTICS_NOW, feedbackAnalytics, reviewAnalytics } from './analytics-fixtures';

type Props = ComponentProps<typeof AnalyticsBoard>;

function renderBoard(props: Partial<Props> = {}, searchParams = '') {
  return render(
    <AnalyticsBoard
      scope="estate"
      now={ANALYTICS_NOW}
      reviews={{ ok: true, data: reviewAnalytics() }}
      feedback={{ ok: true, data: feedbackAnalytics() }}
      {...props}
    />,
    { wrapper: withNuqsTestingAdapter({ searchParams }) }
  );
}

describe('AnalyticsBoard', () => {
  it('draws every estate panel, headline figures read straight off the aggregates', () => {
    const { container } = renderBoard();

    for (const panel of panelsFor('estate')) {
      expect(container.querySelector(`#${panel.id}`), panel.id).not.toBeNull();
    }
    expect(
      screen.getAllByText(formatCount(reviewAnalytics().current.reviews)).length
    ).toBeGreaterThan(0);
    // Once in the repositories table, once in the most down-voted findings — both estate panels.
    expect(screen.getAllByText('adorsys-gis/converse-frontends')).toHaveLength(2);
  });

  it('a repository page has no repositories table, but keeps its most down-voted findings', () => {
    const { container } = renderBoard({
      scope: 'repository',
      reviews: { ok: true, data: reviewAnalytics({ repository_id: 2, by_repository: null }) },
      feedback: { ok: true, data: feedbackAnalytics({ repository_id: 2, by_repository: null }) },
    });

    expect(container.querySelector('#repositories')).toBeNull();
    expect(container.querySelector('#most-downvoted')).not.toBeNull();
  });

  it('a failed feedback request costs the feedback panels and nothing else', () => {
    renderBoard({ feedback: { ok: false, reason: 'error', status: 500 } });

    const feedbackPanels = panelsFor('estate').filter((panel) => panel.source === 'feedback');
    expect(screen.getAllByText("Couldn't load feedback analytics (HTTP 500).")).toHaveLength(
      feedbackPanels.length
    );
    // The run and finding figures are still on screen beside the error that explains the gap.
    // Only the repositories table names it now: the down-voted list is a feedback panel.
    expect(screen.getAllByText('adorsys-gis/converse-frontends')).toHaveLength(1);
    expect(
      screen.queryByText("Couldn't load review analytics (HTTP 500).")
    ).not.toBeInTheDocument();
  });

  it('an expired session says so on every panel, never a fabricated zero', () => {
    renderBoard({
      reviews: { ok: false, reason: 'unauthenticated' },
      feedback: { ok: false, reason: 'unauthenticated' },
    });

    expect(
      screen.getAllByText("Your session can't reach the control plane. Sign in again.")
    ).toHaveLength(panelsFor('estate').length);
  });

  it('states the feedback caveats above the grid: the poll window, and unmatched reactions', () => {
    renderBoard();

    expect(screen.getByText(/are no longer refreshed/)).toBeInTheDocument();
    expect(
      screen.getByText(/1 reaction is on a comment that matched no finding/)
    ).toBeInTheDocument();
  });

  it('shows the range the URL names', () => {
    renderBoard({}, '?range=last-week');

    expect(screen.getByText('Last week')).toBeInTheDocument();
  });

  it('an empty table says so rather than drawing an empty ledger', () => {
    renderBoard({ feedback: { ok: true, data: feedbackAnalytics({ top_downvoted: [] }) } });

    expect(screen.getByText('No finding was down-voted in this window.')).toBeInTheDocument();
  });
});
