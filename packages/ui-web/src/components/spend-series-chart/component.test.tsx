import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SPEC_ACCENT, SPEC_GREY_RAMP } from '../../chart-tokens';
import { SpendSeriesChart } from './component';
import type { SpendSeriesSeries } from './types';

function series(key: string, label: string, values: number[], breached = false): SpendSeriesSeries {
  const base = new Date('2026-02-01').getTime();
  return {
    key,
    label,
    breached,
    points: values.map((y, i) => ({ x: new Date(base + i * 86_400_000), y })),
  };
}

const THREE_SERIES = [
  series('a', 'project-a', [10, 20, 30]),
  series('b', 'project-b', [40, 50, 60]),
  series('c', 'project-c', [5, 15, 25]),
];

describe('SpendSeriesChart', () => {
  it('renders no marks and a muted baseline caption for an empty series list', () => {
    render(<SpendSeriesChart series={[]} width={400} height={200} />);

    expect(screen.getByText('No usage in this range.')).toBeInTheDocument();
  });

  it('renders a custom empty message when supplied', () => {
    render(
      <SpendSeriesChart series={[]} width={400} height={200} emptyMessage="Nothing here yet." />,
    );

    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('colours each series line by rank via the spec ramp when nothing is selected/breached', () => {
    const { container } = render(
      <SpendSeriesChart series={THREE_SERIES} width={400} height={200} />,
    );

    const paths = container.querySelectorAll('path[stroke]');
    expect(paths[0]).toHaveAttribute('stroke', SPEC_GREY_RAMP[0]);
    expect(paths[1]).toHaveAttribute('stroke', SPEC_GREY_RAMP[1]);
    expect(paths[2]).toHaveAttribute('stroke', SPEC_GREY_RAMP[2]);
  });

  it('renders exactly one accent-coloured series when one series is breached (single-orange invariant)', () => {
    const { container } = render(
      <SpendSeriesChart
        series={[THREE_SERIES[0], { ...THREE_SERIES[1], breached: true }, THREE_SERIES[2]]}
        width={400}
        height={200}
      />,
    );

    const accentPaths = Array.from(container.querySelectorAll('path[stroke]')).filter(
      (el) => el.getAttribute('stroke') === SPEC_ACCENT,
    );
    expect(accentPaths).toHaveLength(1);
  });

  it('renders the legend with one selectable entry per series', () => {
    render(<SpendSeriesChart series={THREE_SERIES} width={400} height={200} />);

    expect(screen.getByRole('button', { name: 'project-a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'project-c' })).toBeInTheDocument();
  });

  it('selecting a legend entry turns exactly that series to the accent and calls onSelectSeries', () => {
    let selected: string | null = null;
    const { container } = render(
      <SpendSeriesChart
        series={THREE_SERIES}
        width={400}
        height={200}
        onSelectSeries={(key) => {
          selected = key;
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'project-b' }));
    expect(selected).toBe('b');

    const accentPaths = Array.from(container.querySelectorAll('path[stroke]')).filter(
      (el) => el.getAttribute('stroke') === SPEC_ACCENT,
    );
    expect(accentPaths).toHaveLength(1);
  });

  it('renders bottom-axis ticks at 9px, per the spec sheet', () => {
    render(
      <SpendSeriesChart
        series={THREE_SERIES}
        width={400}
        height={200}
        formatXTick={(d) => String(d.getDate())}
      />,
    );

    const tick = screen.getByText('1');
    expect(tick.tagName.toLowerCase()).toBe('text');
    expect(tick).toHaveAttribute('font-size', '9');
  });

  it('renders grouped bars in the bars variant instead of lines', () => {
    const { container } = render(
      <SpendSeriesChart series={THREE_SERIES} width={400} height={200} variant="bars" />,
    );

    expect(container.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('path[stroke]').length).toBe(0);
  });

  // The tooltip card renders in a `FloatingPortal` (see `chart-tooltip`'s own tests), so its
  // rows are queried off the portalled `.bg-surface` card rather than `screen.getByText` --
  // `project-a` also appears in the always-rendered legend below the chart.
  function tooltipCard(): HTMLElement | null {
    return document.body.querySelector('.bg-surface');
  }

  it('shows the tooltip continuously on hover (mouse) and hides it on pointerleave, without a click', () => {
    render(<SpendSeriesChart series={THREE_SERIES} width={400} height={200} />);

    const point = screen.getByRole('button', { name: '2/1' });
    expect(tooltipCard()).not.toBeInTheDocument();

    fireEvent.pointerEnter(point, { pointerType: 'mouse' });
    expect(tooltipCard()).toHaveTextContent('project-a');

    fireEvent.pointerLeave(point, { pointerType: 'mouse' });
    expect(tooltipCard()).not.toBeInTheDocument();
  });

  it('tracks the nearest point as the pointer moves across timestamps', () => {
    render(<SpendSeriesChart series={THREE_SERIES} width={400} height={200} />);

    fireEvent.pointerEnter(screen.getByRole('button', { name: '2/1' }), { pointerType: 'mouse' });
    expect(tooltipCard()).toHaveTextContent('2/1');

    fireEvent.pointerEnter(screen.getByRole('button', { name: '2/2' }), { pointerType: 'mouse' });
    expect(tooltipCard()).toHaveTextContent('2/2');
    expect(tooltipCard()).not.toHaveTextContent('2/1');
  });

  it('a touch tap shows the tooltip and it stays up on pointerleave (touch, not a mouse hover)', () => {
    render(<SpendSeriesChart series={THREE_SERIES} width={400} height={200} />);

    const point = screen.getByRole('button', { name: '2/1' });
    fireEvent.pointerEnter(point, { pointerType: 'touch' });
    fireEvent.pointerLeave(point, { pointerType: 'touch' });

    expect(tooltipCard()).toHaveTextContent('project-a');
  });

  it('clicking a data point does not affect series selection -- that stays the legend’s job', () => {
    let selected: string | null = null;
    render(
      <SpendSeriesChart
        series={THREE_SERIES}
        width={400}
        height={200}
        onSelectSeries={(key) => {
          selected = key;
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '2/1' }));
    expect(selected).toBeNull();
  });

  // Regression, owner-reported 2026-08-29: the empty/blocked message used to be an SVG `<text>`
  // centred on the plot. SVG text never wraps, so a message longer than the plot is wide spilled
  // off BOTH ends — production rendered the latency zone's real copy as
  // "…isn't available: the usage API doesn't report latency or percentile data yet. Spend, budget
  // an…", clipped head and tail. It must be DOM text, which wraps.
  it('renders the empty message as wrapping DOM text, never as unwrappable SVG text', () => {
    const longMessage =
      "Latency distribution isn't available: the usage API doesn't report latency or percentile " +
      'data yet. Spend, budget and project/key counts below are live.';

    const { container } = render(
      <SpendSeriesChart series={[]} width={528} height={240} emptyMessage={longMessage} />
    );

    const node = screen.getByText(longMessage);
    expect(node.tagName).toBe('P');
    // Specifically NOT inside the <svg>: an SVG-hosted node cannot wrap however it is styled.
    expect(node.closest('svg')).toBeNull();
    // Axis tick labels are legitimately SVG text and must survive ("headers/axes stay") — what
    // must not survive is the MESSAGE being one of them.
    const svgText = [...container.querySelectorAll('svg text')].map((n) => n.textContent);
    expect(svgText).not.toContain(longMessage);
  });
});
