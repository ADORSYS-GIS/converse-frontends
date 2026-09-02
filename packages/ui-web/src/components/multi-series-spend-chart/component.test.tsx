import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SPEC_ACCENT, SPEC_GREY_RAMP } from '../../chart-tokens';
import { MultiSeriesSpendChart } from './component';
import type { MultiSeriesSpendSeries } from './types';

function days(count: number) {
  const base = new Date('2026-02-01').getTime();
  return Array.from({ length: count }, (_, i) => new Date(base + i * 86_400_000));
}

function series(key: string, label: string, values: number[], breached = false): MultiSeriesSpendSeries {
  const d = days(values.length);
  return { key, label, breached, points: values.map((y, i) => ({ x: d[i], y })) };
}

const THREE_SERIES = [
  series('a', 'model-a', [40, 50, 60]),
  series('b', 'model-b', [10, 20, 30]),
  series('c', 'model-c', [5, 15, 25]),
];

describe('MultiSeriesSpendChart', () => {
  it('renders a muted baseline caption for an empty series list', () => {
    render(<MultiSeriesSpendChart series={[]} width={400} height={200} />);
    expect(screen.getByText('No usage in this range.')).toBeInTheDocument();
  });

  it('renders a custom empty message when supplied', () => {
    render(
      <MultiSeriesSpendChart series={[]} width={400} height={200} emptyMessage="Nothing here yet." />
    );
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('colours each line by rank via the spec ramp when nothing is hovered/selected/breached', () => {
    const { container } = render(
      <MultiSeriesSpendChart series={THREE_SERIES} width={400} height={200} />
    );
    const paths = container.querySelectorAll('g > g > path[stroke]');
    // Ranked by total descending: a (150) > b (60) > c (45).
    expect(paths[0]).toHaveAttribute('stroke', SPEC_GREY_RAMP[0]);
    expect(paths[1]).toHaveAttribute('stroke', SPEC_GREY_RAMP[1]);
    expect(paths[2]).toHaveAttribute('stroke', SPEC_GREY_RAMP[2]);
  });

  it('renders exactly one accent-coloured visible line when one series is breached', () => {
    const { container } = render(
      <MultiSeriesSpendChart
        series={[THREE_SERIES[0], { ...THREE_SERIES[1], breached: true }, THREE_SERIES[2]]}
        width={400}
        height={200}
      />
    );
    // Only the VISIBLE lines carry a real stroke colour — the invisible hover/pin hit paths
    // layered on top are always `stroke="transparent"`, never the accent, so they must be
    // excluded here or this assertion would over-count.
    const accentPaths = Array.from(
      container.querySelectorAll('path[stroke]:not([stroke="transparent"])')
    ).filter((el) => el.getAttribute('stroke') === SPEC_ACCENT);
    expect(accentPaths).toHaveLength(1);
  });

  it('breaks the line across a bucket a series has no point for', () => {
    const base = new Date('2026-02-01').getTime();
    const sparse: MultiSeriesSpendSeries = {
      key: 'a',
      label: 'sparse',
      points: [
        { x: new Date(base), y: 10 },
        { x: new Date(base + 2 * 86_400_000), y: 30 },
      ],
    };
    const dense = series('b', 'dense', [1, 1, 1]);
    const { container } = render(
      <MultiSeriesSpendChart series={[sparse, dense]} width={400} height={200} />
    );
    const paths = Array.from(container.querySelectorAll('g > g > path[stroke]'));
    const sparseD = paths.find((p) => (p.getAttribute('d') ?? '').match(/M/g)?.length === 2);
    expect(sparseD).toBeDefined();
  });

  describe('scale=log', () => {
    it('treats a real reported $0 bucket as a gap for plotting purposes', () => {
      const withZeroDay: MultiSeriesSpendSeries = series('a', 'model-a', [10, 0, 30]);
      const { container } = render(
        <MultiSeriesSpendChart series={[withZeroDay]} width={400} height={200} scale="log" />
      );
      const path = container.querySelector('g > g > path[stroke]');
      expect(path?.getAttribute('d')?.match(/M/g)?.length).toBe(2);
    });

    it('shows the honest log-scale caption', () => {
      render(<MultiSeriesSpendChart series={THREE_SERIES} width={400} height={200} scale="log" />);
      expect(screen.getByText(/equal steps are equal ratios/i)).toBeInTheDocument();
    });

    it('labels the y axis with clean power-of-ten dollar ticks', () => {
      const wideRange = [
        series('tiny', 'tiny', [0.0001, 0.0001, 0.0001]),
        series('big', 'big', [10, 10, 10]),
      ];
      render(<MultiSeriesSpendChart series={wideRange} width={400} height={200} scale="log" />);
      expect(screen.getByText('$0.0001')).toBeInTheDocument();
      expect(screen.getByText('$10')).toBeInTheDocument();
    });
  });

  describe('scale=indexed', () => {
    it('shows the honest indexed-scale caption and a "% of series peak" y axis', () => {
      render(
        <MultiSeriesSpendChart series={THREE_SERIES} width={400} height={200} scale="indexed" />
      );
      expect(screen.getByText(/shape only, not comparable dollar totals/i)).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('normalizes a two-orders-of-magnitude-smaller series to the same visual peak', () => {
      const tiny = series('tiny', 'tiny', [1, 2, 4]);
      const huge = series('huge', 'huge', [100, 200, 400]);
      const { container } = render(
        <MultiSeriesSpendChart series={[tiny, huge]} width={400} height={200} scale="indexed" />
      );
      const circles = Array.from(container.querySelectorAll('g > g circle'));
      // At minimum the two peak points (last circle of each series) coincide.
      const lastCyValues = [circles[2]?.getAttribute('cy'), circles[5]?.getAttribute('cy')];
      expect(lastCyValues[0]).toBe(lastCyValues[1]);
    });
  });

  describe('no legend list', () => {
    it('renders no legend rows at all — only the caption sentence and the chart itself', () => {
      render(<MultiSeriesSpendChart series={THREE_SERIES} width={400} height={200} />);
      expect(document.querySelector('.multi-series-legend')).toBeNull();
      expect(screen.queryByRole('button', { name: /^model-a$/ })).not.toBeInTheDocument();
    });

    it('states the period total and series count in one caption sentence under the board', () => {
      render(<MultiSeriesSpendChart series={THREE_SERIES} width={400} height={200} />);
      // Grand total: 150 + 60 + 45 = 255.
      expect(screen.getByText('$255.00 across 3 series')).toBeInTheDocument();
    });

    it('collapses an all-zero series into the caption instead of a flat line or a row', () => {
      const withZero = [...THREE_SERIES, { key: 'd', label: 'model-d', points: [] }];
      render(<MultiSeriesSpendChart series={withZero} width={400} height={200} />);
      expect(screen.getByText('1 more · no spend this period', { exact: false })).toBeInTheDocument();
      expect(screen.queryByText('model-d')).not.toBeInTheDocument();
    });

    it('appends a caller-supplied truncation notice to the same caption sentence', () => {
      render(
        <MultiSeriesSpendChart
          series={THREE_SERIES}
          width={400}
          height={200}
          truncationCaption="Showing the top 25 of 61 accounts."
        />
      );
      expect(
        screen.getByText('Showing the top 25 of 61 accounts.', { exact: false })
      ).toBeInTheDocument();
    });
  });

  describe('hover-to-highlight / click-to-pin on the lines themselves', () => {
    it('hovering a line dims every other line and calls it emphasized via the tooltip colour', () => {
      const { container } = render(
        <MultiSeriesSpendChart series={THREE_SERIES} width={400} height={200} />
      );
      const hitPath = container.querySelector('path[aria-label^="model-a"]') as SVGPathElement;
      expect(hitPath).toBeTruthy();
      const otherGroup = Array.from(container.querySelectorAll('g[style]')).find((g) =>
        g.getAttribute('style')?.includes('opacity: 0.35')
      );
      expect(otherGroup).toBeUndefined(); // nothing dimmed yet
      fireEvent.mouseEnter(hitPath);
      const dimmedGroups = Array.from(container.querySelectorAll('g[style*="opacity: 0.35"]'));
      expect(dimmedGroups.length).toBeGreaterThan(0);
      fireEvent.mouseLeave(hitPath);
      expect(container.querySelectorAll('g[style*="opacity: 0.35"]').length).toBe(0);
    });

    it('clicking a line pins the accent to exactly that line and calls onSelectSeries', () => {
      let selected: string | null = null;
      const { container } = render(
        <MultiSeriesSpendChart
          series={THREE_SERIES}
          width={400}
          height={200}
          onSelectSeries={(key) => {
            selected = key;
          }}
        />
      );
      const hitPath = container.querySelector('path[aria-label^="model-b"]') as SVGPathElement;
      fireEvent.click(hitPath);
      expect(selected).toBe('b');
      const accentPaths = Array.from(
        container.querySelectorAll('path[stroke]:not([stroke="transparent"])')
      ).filter((el) => el.getAttribute('stroke') === SPEC_ACCENT);
      expect(accentPaths).toHaveLength(1);
      expect(hitPath).toHaveAttribute('aria-pressed', 'true');
    });

    it('is keyboard-operable: Enter on a focused line toggles the same pin as a click', () => {
      let selected: string | null = null;
      const { container } = render(
        <MultiSeriesSpendChart
          series={THREE_SERIES}
          width={400}
          height={200}
          onSelectSeries={(key) => {
            selected = key;
          }}
        />
      );
      const hitPath = container.querySelector('path[aria-label^="model-c"]') as SVGPathElement;
      fireEvent.focus(hitPath);
      fireEvent.keyDown(hitPath, { key: 'Enter' });
      expect(selected).toBe('c');
    });
  });

  function tooltipCard(): HTMLElement | null {
    return document.body.querySelector('.chart-tooltip-card');
  }

  it('the tooltip states the RAW dollar value at the hovered bucket, never the scale-transformed one', () => {
    render(<MultiSeriesSpendChart series={THREE_SERIES} width={400} height={200} scale="log" />);
    const point = screen.getByRole('button', { name: '2/1' });
    fireEvent.pointerEnter(point, { pointerType: 'mouse' });
    expect(tooltipCard()).toHaveTextContent('model-a');
    expect(tooltipCard()).toHaveTextContent('$40.00');
  });

  it('the tooltip states each row rank-ordered with the true dollar figure AND the period share', () => {
    render(<MultiSeriesSpendChart series={THREE_SERIES} width={400} height={200} />);
    const point = screen.getByRole('button', { name: '2/1' });
    fireEvent.pointerEnter(point, { pointerType: 'mouse' });
    // model-a is 150 of a 255 grand total ≈ 59%; its day-1 value is $40.00.
    expect(tooltipCard()).toHaveTextContent('model-a');
    expect(tooltipCard()).toHaveTextContent('$40.00 · 59%');
  });

  it('tooltip shares stay the true dollar figures regardless of scale', () => {
    render(<MultiSeriesSpendChart series={THREE_SERIES} width={400} height={200} scale="log" />);
    const point = screen.getByRole('button', { name: '2/1' });
    fireEvent.pointerEnter(point, { pointerType: 'mouse' });
    expect(tooltipCard()).toHaveTextContent('59%');
  });

  it('tracks the nearest bucket as the pointer moves across timestamps', () => {
    render(<MultiSeriesSpendChart series={THREE_SERIES} width={400} height={200} />);
    fireEvent.pointerEnter(screen.getByRole('button', { name: '2/1' }), { pointerType: 'mouse' });
    expect(tooltipCard()).toHaveTextContent('2/1');
    fireEvent.pointerEnter(screen.getByRole('button', { name: '2/2' }), { pointerType: 'mouse' });
    expect(tooltipCard()).toHaveTextContent('2/2');
    expect(tooltipCard()).not.toHaveTextContent('2/1');
  });

  it('strokes only a `dashed` series with a dash array, and gives it butt caps', () => {
    const { container } = render(
      <MultiSeriesSpendChart
        series={[
          series('current', 'This period', [40, 50, 60]),
          { ...series('previous', 'Previous period', [30, 35, 45]), dashed: true },
        ]}
        width={400}
        height={200}
      />
    );
    const lines = Array.from(container.querySelectorAll('path[stroke-width="2"]'));
    expect(lines).toHaveLength(2);
    expect(lines[0].getAttribute('stroke-dasharray')).toBeNull();
    expect(lines[0].getAttribute('stroke-linecap')).toBe('round');
    expect(lines[1].getAttribute('stroke-dasharray')).toBe('5 4');
    expect(lines[1].getAttribute('stroke-linecap')).toBe('butt');
  });

  it('renders the empty message as wrapping DOM text, never SVG text', () => {
    const longMessage =
      'A message longer than the plot is wide, which must wrap rather than spill off both ends.';
    render(<MultiSeriesSpendChart series={[]} width={400} height={200} emptyMessage={longMessage} />);
    const node = screen.getByText(longMessage);
    expect(node.tagName).toBe('P');
    expect(node.closest('svg')).toBeNull();
  });
});
