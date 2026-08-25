import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OverviewSeriesRail } from './component';
import { overviewSeriesLegendItems } from './fixtures';

describe('OverviewSeriesRail', () => {
  it('wires its legend to onSelectKey', () => {
    const onSelectKey = vi.fn();
    render(
      <OverviewSeriesRail items={overviewSeriesLegendItems} onSelectKey={onSelectKey} />
    );

    const region = screen.getByRole('region', { name: 'Series' });
    fireEvent.click(within(region).getByRole('button', { name: 'claude-sonnet' }));

    expect(onSelectKey).toHaveBeenCalledWith('claude-sonnet');
  });

  it('renders one entry per series with its pre-formatted value', () => {
    render(<OverviewSeriesRail items={overviewSeriesLegendItems} />);

    expect(screen.getByText('$61.20')).toBeInTheDocument();
  });
});
