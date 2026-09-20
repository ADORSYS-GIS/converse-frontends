import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it } from 'vitest';

import { panelsFor } from '../lib/domain/feedback';
import { FeedbackCentre } from './feedback-centre';
import { FEEDBACK_NOW, feedbackAnalytics } from './feedback-fixtures';

describe('FeedbackCentre', () => {
  it('titles the page and draws every estate panel, the repositories table included', () => {
    const { container } = render(
      <FeedbackCentre now={FEEDBACK_NOW} feedback={{ ok: true, data: feedbackAnalytics() }} />,
      { wrapper: withNuqsTestingAdapter() }
    );

    expect(screen.getByRole('heading', { name: 'Feedback' })).toBeInTheDocument();
    for (const panel of panelsFor('estate')) {
      expect(container.querySelector(`#${panel.id}`), panel.id).not.toBeNull();
    }
  });

  it('keeps its title and every panel slot when the control plane is down, each saying why', () => {
    render(<FeedbackCentre now={FEEDBACK_NOW} feedback={{ ok: false, reason: 'unavailable' }} />, {
      wrapper: withNuqsTestingAdapter(),
    });

    expect(screen.getByRole('heading', { name: 'Feedback' })).toBeInTheDocument();
    expect(screen.getAllByText('The control plane is unreachable right now.')).toHaveLength(
      panelsFor('estate').length
    );
  });
});
