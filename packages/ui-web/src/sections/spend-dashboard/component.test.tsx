import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SpendDashboard } from './component';
import { overviewSpendSeries } from './fixtures';

const base = { series: overviewSpendSeries, fallbackWidth: 872, height: 176 };

describe('SpendDashboard', () => {
  it('renders its heading and the chart', () => {
    const { container } = render(<SpendDashboard {...base} />);

    expect(screen.getByText('SPEND — BY PROJECT AND MODEL')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the compact-tier trigger slot on the heading row', () => {
    render(<SpendDashboard {...base} actions={<button type="button">Open filters</button>} />);

    expect(screen.getByRole('button', { name: 'Open filters' })).toBeInTheDocument();
  });

  it('replaces the chart with a skeleton and a status line while loading', () => {
    render(<SpendDashboard {...base} status="loading" />);

    expect(screen.getByText('Querying usage…')).toBeInTheDocument();
  });

  it('replaces the chart with an ErrorLine + Retry on failure', () => {
    const onRetry = vi.fn();
    render(
      <SpendDashboard
        {...base}
        status="error"
        errorMessage="Failed to load spend data."
        onRetry={onRetry}
      />
    );

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Failed to load spend data.')).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('scrolls the chart inside its own container so the page never scrolls sideways', () => {
    const { container } = render(<SpendDashboard {...base} />);

    expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument();
  });
});
