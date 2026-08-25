import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SPEC_ACCENT, SPEC_GREY_RAMP } from '../../chart-tokens';
import { HistogramChart } from './component';

describe('HistogramChart', () => {
  it('renders a muted baseline caption and no bars for an empty sample set', () => {
    const { container } = render(<HistogramChart values={[]} width={400} height={200} />);

    expect(screen.getByText('No usage in this range.')).toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(0);
  });

  it('renders every bar in the rank-0 grey ramp colour when not breached', () => {
    const { container } = render(
      <HistogramChart values={[10, 20, 30, 40, 50, 60, 70, 80]} width={400} height={200} />,
    );

    const bars = container.querySelectorAll('rect');
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) {
      expect(bar).toHaveAttribute('fill', SPEC_GREY_RAMP[0]);
    }
  });

  it('renders every bar in the accent colour when breached, and no legend (single series)', () => {
    const { container } = render(
      <HistogramChart values={[10, 20, 30, 40, 50, 60, 70, 80]} width={400} height={200} breached />,
    );

    const bars = container.querySelectorAll('rect');
    for (const bar of bars) {
      expect(bar).toHaveAttribute('fill', SPEC_ACCENT);
    }
    expect(container.querySelector('button[aria-pressed]')).not.toBeInTheDocument();
  });

  it('renders one visible bar for a single-sample distribution rather than a zero-width sliver', () => {
    const { container } = render(<HistogramChart values={[180]} width={400} height={200} />);

    const bars = container.querySelectorAll('rect');
    expect(bars).toHaveLength(1);
    expect(Number(bars[0].getAttribute('width'))).toBeGreaterThan(100);
  });

  it('renders bottom-axis tick labels at 9px', () => {
    render(
      <HistogramChart
        values={[10, 20, 30, 40]}
        width={400}
        height={200}
        formatXTick={(v) => `${Math.round(v)}ms`}
      />,
    );

    const ticks = screen.getAllByText(/ms$/);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]).toHaveAttribute('font-size', '9');
  });

  it('shows the bucket tooltip continuously on hover and hides it on pointerleave, without a click', () => {
    render(<HistogramChart values={[10, 20, 30, 40, 50, 60, 70, 80]} width={400} height={200} />);

    const bars = screen.getAllByRole('button');
    expect(screen.queryByText('count')).not.toBeInTheDocument();

    fireEvent.pointerEnter(bars[0], { pointerType: 'mouse' });
    expect(screen.getByText('count')).toBeInTheDocument();

    fireEvent.pointerLeave(bars[0], { pointerType: 'mouse' });
    expect(screen.queryByText('count')).not.toBeInTheDocument();
  });

  it('a touch tap shows the bucket tooltip and it stays up on pointerleave (touch, not a mouse hover)', () => {
    render(<HistogramChart values={[10, 20, 30, 40, 50, 60, 70, 80]} width={400} height={200} />);

    const bar = screen.getAllByRole('button')[0];
    fireEvent.pointerEnter(bar, { pointerType: 'touch' });
    fireEvent.pointerLeave(bar, { pointerType: 'touch' });

    expect(screen.getByText('count')).toBeInTheDocument();
  });
});
