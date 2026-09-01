import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LatencyStatCards } from './component';
import { latencyStatRows, latencyStatRowsEmpty } from './fixtures';

describe('LatencyStatCards', () => {
  it('renders a card per model with a real sample count', () => {
    render(<LatencyStatCards rows={latencyStatRows} />);
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
  });

  it('hides a model with zero latency-bearing samples entirely', () => {
    render(<LatencyStatCards rows={latencyStatRows} />);
    expect(screen.queryByText('embed-3')).not.toBeInTheDocument();
  });

  it('suppresses p99 below the 100-sample floor, but still shows p50/p95', () => {
    render(<LatencyStatCards rows={latencyStatRows} />);
    const opusLine = screen.getByText(/n=42/);
    expect(opusLine.textContent).not.toContain('p99');
    expect(opusLine.textContent).toContain('p95');
  });

  it('shows p99 once samples reach the floor', () => {
    render(<LatencyStatCards rows={latencyStatRows} />);
    const gpt4oLine = screen.getByText(/n=4,210/);
    expect(gpt4oLine.textContent).toContain('p99');
  });

  it('renders one inline status line when every row is zero-sample', () => {
    render(<LatencyStatCards rows={latencyStatRowsEmpty} emptyMessage="Nothing yet." />);
    expect(screen.getByText('Nothing yet.')).toBeInTheDocument();
  });
});
