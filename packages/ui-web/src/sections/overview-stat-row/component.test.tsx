import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OverviewStatRow } from './component';
import { overviewStatCards, overviewUnwiredStatCards } from './fixtures';

describe('OverviewStatRow', () => {
  it('renders one card per datum with its metric', () => {
    render(<OverviewStatRow cards={overviewStatCards} />);

    expect(screen.getByText('Spend this month')).toBeInTheDocument();
    expect(screen.getByText('$142.55')).toBeInTheDocument();
    expect(screen.getByText('41,208')).toBeInTheDocument();
  });

  // `[role="presentation"].bg-surface` targets the skeleton CARD specifically — `SkeletonMetric`
  // nested inside each one also carries `role="presentation"`, so a bare role query double-counts.
  const skeletonCards = (container: HTMLElement) =>
    container.querySelectorAll('[role="presentation"].bg-surface');

  it('replaces every card with a skeleton of the same geometry while loading', () => {
    const { container } = render(<OverviewStatRow cards={overviewStatCards} loading />);

    expect(screen.queryByText('$142.55')).not.toBeInTheDocument();
    expect(skeletonCards(container)).toHaveLength(overviewStatCards.length);
  });

  it('falls back to four skeletons when loading with no cards yet', () => {
    const { container } = render(<OverviewStatRow cards={[]} loading />);

    expect(skeletonCards(container)).toHaveLength(4);
  });

  // Regression for #273: a card with no trend data must not draw a flat/zero decorative
  // sparkline -- nor even reserve an empty sparkline slot for one. `polyline` (not `svg`, which
  // the card's own icon glyph also uses) is what `Sparkline` itself draws.
  it('renders no sparkline polyline for a card whose sparklineData is omitted', () => {
    const { container } = render(<OverviewStatRow cards={overviewUnwiredStatCards} />);

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(container.querySelector('polyline')).not.toBeInTheDocument();
  });
});
