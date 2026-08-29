import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SpendDashboard } from './component';
import { overviewSpendSeries } from './fixtures';

const base = { series: overviewSpendSeries, fallbackWidth: 872, height: 176 };

describe('SpendDashboard', () => {
  it('renders its heading and the chart', () => {
    const { container } = render(<SpendDashboard {...base} />);

    expect(screen.getByText('Spend — by project and model')).toBeInTheDocument();
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

  // Regression for #272: an unwired data source must not render as a queried-and-empty chart.
  // Before this fix, `status` defaulted to `'ready'` and an empty `series` fell through to
  // `SpendSeriesChart`'s own "No usage in this range." wording — which asserts a completed query
  // found nothing, a different (false) fact from "this was never queried."
  describe('status="unwired"', () => {
    it('keeps the axes rendered above an inline status line naming the real reason', () => {
      const { container } = render(
        <SpendDashboard series={[]} fallbackWidth={872} height={176} status="unwired" />
      );

      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(screen.getByText('Not wired — see banner above.')).toBeInTheDocument();
      expect(screen.queryByText('No usage in this range.')).not.toBeInTheDocument();
    });

    it('never routes through ErrorLine — nothing failed, there is nothing to retry', () => {
      render(<SpendDashboard series={[]} fallbackWidth={872} height={176} status="unwired" />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    });

    it('never shows the loading "Querying usage…" line — no request is actually in flight', () => {
      render(<SpendDashboard series={[]} fallbackWidth={872} height={176} status="unwired" />);

      expect(screen.queryByText('Querying usage…')).not.toBeInTheDocument();
    });

    it('accepts a caller-supplied message override', () => {
      render(
        <SpendDashboard
          series={[]}
          fallbackWidth={872}
          height={176}
          status="unwired"
          unwiredMessage="Custom unwired copy."
        />
      );

      expect(screen.getByText('Custom unwired copy.')).toBeInTheDocument();
    });
  });
});
