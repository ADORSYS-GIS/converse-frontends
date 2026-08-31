import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MultiSeriesSpendSeries } from '../../components/multi-series-spend-chart';
import { MultiSeriesSpendBoard } from './component';

function days(count: number) {
  const base = new Date('2026-02-01').getTime();
  return Array.from({ length: count }, (_, i) => new Date(base + i * 86_400_000));
}

function series(key: string, label: string, values: number[]): MultiSeriesSpendSeries {
  const d = days(values.length);
  return { key, label, points: values.map((y, i) => ({ x: d[i], y })) };
}

const SERIES = [series('a', 'model-a', [40, 50, 60]), series('b', 'model-b', [10, 20, 30])];
const base = {
  series: SERIES,
  scale: 'linear' as const,
  onScaleChange: () => {},
  fallbackWidth: 800,
  height: 200,
};

describe('MultiSeriesSpendBoard', () => {
  it('renders its heading, the scale toggle, and the chart', () => {
    const { container } = render(<MultiSeriesSpendBoard {...base} label="Spend by model" />);

    expect(screen.getByText('Spend by model')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Scale' })).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('reports a scale change through onScaleChange', () => {
    const onScaleChange = vi.fn();
    render(<MultiSeriesSpendBoard {...base} onScaleChange={onScaleChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Log' }));
    expect(onScaleChange).toHaveBeenCalledWith('log');
  });

  it('replaces the chart with a skeleton and a status line while loading', () => {
    render(<MultiSeriesSpendBoard {...base} status="loading" />);
    expect(screen.getByText('Querying usage…')).toBeInTheDocument();
  });

  it('replaces the chart with an ErrorLine + Retry on failure', () => {
    const onRetry = vi.fn();
    render(
      <MultiSeriesSpendBoard
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

  it('forwards truncationCaption straight through to the chart caption', () => {
    render(
      <MultiSeriesSpendBoard {...base} truncationCaption="Showing the top 25 of 61 accounts." />
    );
    expect(
      screen.getByText('Showing the top 25 of 61 accounts.', { exact: false })
    ).toBeInTheDocument();
  });
});
