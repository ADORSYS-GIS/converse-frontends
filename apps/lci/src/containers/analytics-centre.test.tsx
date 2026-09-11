import { render, screen } from '@testing-library/react';
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it } from 'vitest';

import { panelsFor } from '../lib/domain/analytics';
import { AnalyticsCentre } from './analytics-centre';
import { ANALYTICS_NOW, feedbackAnalytics, reviewAnalytics } from './analytics-fixtures';

describe('AnalyticsCentre', () => {
  it('titles the page and draws every estate panel, the repositories table included', () => {
    const { container } = render(
      <AnalyticsCentre
        now={ANALYTICS_NOW}
        reviews={{ ok: true, data: reviewAnalytics() }}
        feedback={{ ok: true, data: feedbackAnalytics() }}
      />,
      { wrapper: withNuqsTestingAdapter() }
    );

    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    for (const panel of panelsFor('estate')) {
      expect(container.querySelector(`#${panel.id}`), panel.id).not.toBeNull();
    }
  });

  it('keeps its title and every panel slot when the control plane is down, each saying why', () => {
    render(
      <AnalyticsCentre
        now={ANALYTICS_NOW}
        reviews={{ ok: false, reason: 'unavailable' }}
        feedback={{ ok: false, reason: 'unavailable' }}
      />,
      { wrapper: withNuqsTestingAdapter() }
    );

    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getAllByText('The control plane is unreachable right now.')).toHaveLength(
      panelsFor('estate').length
    );
  });
});
