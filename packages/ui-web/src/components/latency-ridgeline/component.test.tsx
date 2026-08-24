import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SPEC_ACCENT, SPEC_GREY_RAMP, SPEC_SURFACE } from '../../chart-tokens';
import { LatencyRidgeline } from './component';
import type { LatencyRidgelineSeries } from './types';

const THREE_SERIES: LatencyRidgelineSeries[] = [
  { key: 'a', label: 'model-a', values: [100, 110, 120, 130, 140], value: 'p95 140 ms' },
  { key: 'b', label: 'model-b', values: [200, 210, 220, 230, 240], value: 'p95 240 ms' },
  { key: 'c', label: 'model-c', values: [300, 310, 320, 330, 340], value: 'p95 340 ms' },
];

describe('LatencyRidgeline', () => {
  it('renders a muted baseline caption and no ridges for an empty series list', () => {
    const { container } = render(<LatencyRidgeline series={[]} width={400} height={300} />);

    expect(screen.getByText('No usage in this range.')).toBeInTheDocument();
    expect(container.querySelectorAll('path')).toHaveLength(0);
  });

  it('renders one ridge per series, filled with the panel surface colour, stroked by rank', () => {
    const { container } = render(<LatencyRidgeline series={THREE_SERIES} width={500} height={320} />);

    const fills = container.querySelectorAll(`path[fill="${SPEC_SURFACE}"]`);
    expect(fills).toHaveLength(3);

    const strokes = container.querySelectorAll('path[stroke]');
    expect(strokes[0]).toHaveAttribute('stroke', SPEC_GREY_RAMP[0]);
    expect(strokes[1]).toHaveAttribute('stroke', SPEC_GREY_RAMP[1]);
    expect(strokes[2]).toHaveAttribute('stroke', SPEC_GREY_RAMP[2]);
  });

  it('renders each row label left and its value right', () => {
    render(<LatencyRidgeline series={THREE_SERIES} width={500} height={320} />);

    expect(screen.getByText('model-a')).toHaveAttribute('text-anchor', 'end');
    expect(screen.getByText('p95 140 ms')).toHaveAttribute('text-anchor', 'end');
  });

  it('renders exactly one accent-stroked ridge when one row is breached (single-orange invariant)', () => {
    const { container } = render(
      <LatencyRidgeline
        series={[THREE_SERIES[0], { ...THREE_SERIES[1], breached: true }, THREE_SERIES[2]]}
        width={500}
        height={320}
      />,
    );

    const accentStrokes = Array.from(container.querySelectorAll('path[stroke]')).filter(
      (el) => el.getAttribute('stroke') === SPEC_ACCENT,
    );
    expect(accentStrokes).toHaveLength(1);
  });

  it("renders a breached row's value in the accent, others muted", () => {
    render(
      <LatencyRidgeline
        series={[THREE_SERIES[0], { ...THREE_SERIES[1], breached: true }, THREE_SERIES[2]]}
        width={500}
        height={320}
      />,
    );

    expect(screen.getByText('p95 240 ms')).toHaveAttribute('fill', SPEC_ACCENT);
    expect(screen.getByText('p95 140 ms')).not.toHaveAttribute('fill', SPEC_ACCENT);
  });

  it('selecting a row via its button calls onSelectSeries and turns exactly that ridge to the accent', () => {
    let selected: string | null = null;
    const { container } = render(
      <LatencyRidgeline
        series={THREE_SERIES}
        width={500}
        height={320}
        onSelectSeries={(key) => {
          selected = key;
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'model-b' }));
    expect(selected).toBe('b');

    const accentStrokes = Array.from(container.querySelectorAll('path[stroke]')).filter(
      (el) => el.getAttribute('stroke') === SPEC_ACCENT,
    );
    expect(accentStrokes).toHaveLength(1);
  });

  it('exposes each row as a keyboard-reachable button with aria-pressed state', () => {
    render(<LatencyRidgeline series={THREE_SERIES} width={500} height={320} />);

    const button = screen.getByRole('button', { name: 'model-a' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
