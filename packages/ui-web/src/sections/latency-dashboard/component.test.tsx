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
});
