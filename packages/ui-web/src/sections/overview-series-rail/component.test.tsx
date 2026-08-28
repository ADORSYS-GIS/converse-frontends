import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OverviewSeriesRail } from './component';
import { overviewSeriesLegendItems } from './fixtures';

describe('OverviewSeriesRail', () => {
  it('wires its legend to onSelectKey', () => {
    const onSelectKey = vi.fn();
    render(<OverviewSeriesRail items={overviewSeriesLegendItems} onSelectKey={onSelectKey} />);

    const region = screen.getByRole('region', { name: 'Series' });
    fireEvent.click(within(region).getByRole('button', { name: 'claude-sonnet' }));

    expect(onSelectKey).toHaveBeenCalledWith('claude-sonnet');
  });

  it('renders one entry per series with its pre-formatted value', () => {
    render(<OverviewSeriesRail items={overviewSeriesLegendItems} />);

    expect(screen.getByText('$61.20')).toBeInTheDocument();
  });

  // Regression for #273: a zero-item legend used to render as a bare heading over nothing.
  describe('with zero items', () => {
    it('explains why the legend is empty instead of rendering blank', () => {
      const { container } = render(<OverviewSeriesRail items={[]} />);

      expect(screen.getByText('No series to show.')).toBeInTheDocument();
      expect(container.querySelector('button')).not.toBeInTheDocument();
    });

    it('accepts a caller-supplied message override', () => {
      render(<OverviewSeriesRail items={[]} emptyMessage="Not wired — see banner above." />);

      expect(screen.getByText('Not wired — see banner above.')).toBeInTheDocument();
    });
  });

  it('still renders nothing for exactly one item — a single series needs no legend', () => {
    const { container } = render(<OverviewSeriesRail items={[overviewSeriesLegendItems[0]]} />);

    expect(container.querySelector('button')).not.toBeInTheDocument();
    expect(screen.queryByText('No series to show.')).not.toBeInTheDocument();
  });
});
