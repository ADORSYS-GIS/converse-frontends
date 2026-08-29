import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LatencyDashboard } from './component';
import { overviewLatencySeries } from './fixtures';

const base = { series: overviewLatencySeries, fallbackWidth: 528, height: 310 };

describe('LatencyDashboard', () => {
  it('renders its heading and the ridgeline', () => {
    const { container } = render(<LatencyDashboard {...base} />);

    expect(screen.getByText('Latency distribution — p95 by model')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('replaces the chart with a skeleton and a status line while loading', () => {
    render(<LatencyDashboard {...base} status="loading" />);

    expect(screen.getByText('Querying usage…')).toBeInTheDocument();
  });

  it('replaces the chart with an ErrorLine + Retry on failure', () => {
    const onRetry = vi.fn();
    render(
      <LatencyDashboard
        {...base}
        status="error"
        errorMessage="Failed to load latency data."
        onRetry={onRetry}
      />
    );

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Failed to load latency data.')).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // Regression for #272 — see `SpendDashboard`'s equivalent block for the full rationale.
  describe('status="unwired"', () => {
    it('keeps the axes rendered above an inline status line naming the real reason', () => {
      const { container } = render(
        <LatencyDashboard series={[]} fallbackWidth={528} height={310} status="unwired" />
      );

      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(screen.getByText('Not wired — see banner above.')).toBeInTheDocument();
      expect(screen.queryByText('No usage in this range.')).not.toBeInTheDocument();
    });

    it('never routes through ErrorLine — nothing failed, there is nothing to retry', () => {
      render(<LatencyDashboard series={[]} fallbackWidth={528} height={310} status="unwired" />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('never shows the loading "Querying usage…" line — no request is actually in flight', () => {
      render(<LatencyDashboard series={[]} fallbackWidth={528} height={310} status="unwired" />);

      expect(screen.queryByText('Querying usage…')).not.toBeInTheDocument();
    });
  });
});
