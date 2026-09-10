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
      <SpendSeriesChart series={[]} width={400} height={200} emptyMessage="Nothing here yet." />
    );

    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('colours each series line by rank via the spec ramp when nothing is selected/breached', () => {
    const { container } = render(
      <SpendSeriesChart series={THREE_SERIES} width={400} height={200} />
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
      />
    );

    const accentPaths = Array.from(container.querySelectorAll('path[stroke]')).filter(
      (el) => el.getAttribute('stroke') === SPEC_ACCENT
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
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'project-b' }));
    expect(selected).toBe('b');

    const accentPaths = Array.from(container.querySelectorAll('path[stroke]')).filter(
      (el) => el.getAttribute('stroke') === SPEC_ACCENT
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
      />
    );

    const tick = screen.getByText('1');
    expect(tick.tagName.toLowerCase()).toBe('text');
    expect(tick).toHaveAttribute('font-size', '9');
  });

  it('renders grouped bars in the bars variant instead of lines', () => {
    const { container } = render(
      <SpendSeriesChart series={THREE_SERIES} width={400} height={200} variant="bars" />
    );

    expect(container.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('path[stroke]').length).toBe(0);
  });

  // The tooltip card renders in a `FloatingPortal` (see `chart-tooltip`'s own tests), so its
  // rows are queried off the portalled `.chart-tooltip-card` rather than `screen.getByText` --
  // `project-a` also appears in the always-rendered legend below the chart.
  function tooltipCard(): HTMLElement | null {
    return document.body.querySelector('.chart-tooltip-card');
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
      />
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

  // Build brief §2a — the gap-breaking fix. A series that only reports on day 1 and day 3 of a
  // 3-day domain must draw two disconnected sub-paths, never one continuous line spanning the
  // missing day.
  it('breaks the line across a bucket a series has no point for, instead of drawing across it', () => {
    const base = new Date('2026-02-01').getTime();
    const sparse: SpendSeriesSeries = {
      key: 'a',
      label: 'sparse',
      points: [
        { x: new Date(base), y: 10 },
        // day 2 (2026-02-02) is absent — `b` still reports it, so it stays in the x-domain.
        { x: new Date(base + 2 * 86_400_000), y: 30 },
      ],
    };
    const dense = series('b', 'dense', [1, 1, 1]);

    const { container } = render(
      <SpendSeriesChart series={[sparse, dense]} width={400} height={200} />
    );

    const paths = Array.from(container.querySelectorAll('g path[stroke]'));
    // `sparse`'s path is the first rendered (index 0) — d3's `.defined()` emits a new `M` for
    // each contiguous run, so a path broken by a gap has two `M` commands instead of one.
    const sparseD = paths[0]?.getAttribute('d') ?? '';
    expect(sparseD.match(/M/g)?.length).toBe(2);
    // `dense` (no gap) stays one continuous sub-path.
    const denseD = paths[1]?.getAttribute('d') ?? '';
    expect(denseD.match(/M/g)?.length).toBe(1);
  });

  // Build brief §2b — `cumulative` + `ceiling` for the budget burn-down.
  it('cumulative renders a running total and forward-fills across a day with no spend', () => {
    const base = new Date('2026-02-01').getTime();
    const daily: SpendSeriesSeries = {
      key: 'a',
      label: 'account',
      points: [
        { x: new Date(base), y: 4 },
        { x: new Date(base + 2 * 86_400_000), y: 6 },
      ],
    };
    const other = series('b', 'other', [0, 0, 0]);

    const { container } = render(
      <SpendSeriesChart series={[daily, other]} width={400} height={200} cumulative />
    );

    // Forward-filled and monotonic: never breaks, even though the raw series has a gap on day 2.
    const paths = Array.from(container.querySelectorAll('g path[stroke]'));
    const cumulativeD = paths[0]?.getAttribute('d') ?? '';
    expect(cumulativeD.match(/M/g)?.length).toBe(1);
  });

  it('draws a dashed ceiling rule and breaches the series that reaches it', () => {
    const base = new Date('2026-02-01').getTime();
    const overCeiling: SpendSeriesSeries = {
      key: 'a',
      label: 'account',
      points: [
        { x: new Date(base), y: 5 },
        { x: new Date(base + 86_400_000), y: 10 },
      ],
    };

    const { container } = render(
      <SpendSeriesChart series={[overCeiling]} width={400} height={200} cumulative ceiling={12} />
    );

    // The dashed ceiling rule itself.
    const dashedLine = container.querySelector('line[stroke-dasharray]');
    expect(dashedLine).not.toBeNull();

    // The cumulative total (5 + 10 = 15) crosses the ceiling (12), so the series' own path
    // renders in the SAME accent the `breached` prop already drives — no second colour rule.
    const accentPaths = Array.from(container.querySelectorAll('path[stroke]')).filter(
      (el) => el.getAttribute('stroke') === SPEC_ACCENT
    );
    expect(accentPaths.length).toBeGreaterThan(0);
  });
});
