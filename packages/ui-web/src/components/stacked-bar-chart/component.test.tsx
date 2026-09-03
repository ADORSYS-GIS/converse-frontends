import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StackedBarChart } from './component';
import type { StackedBarSeries } from './types';

const DAY = 86_400_000;
const START = Date.UTC(2026, 8, 1);

function series(key: string, values: number[]): StackedBarSeries {
  return {
    key,
    label: key,
    points: values.map((y, index) => ({ x: new Date(START + index * DAY), y })),
  };
}

const BASIC: StackedBarSeries[] = [series('gpt-4o', [10, 12, 8]), series('claude', [4, 3, 6])];

function renderChart(props: Partial<React.ComponentProps<typeof StackedBarChart>> = {}) {
  return render(<StackedBarChart series={BASIC} width={600} height={240} {...props} />);
}

describe('StackedBarChart', () => {
  it('draws one hit region per bucket, each naming the bucket total', () => {
    renderChart();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    // Bucket 1 is 10 + 4 — the total the bar's own height states.
    expect(buttons[0]).toHaveAccessibleName(expect.stringContaining('$14.00'));
  });

  it('opens a tooltip listing EVERY segment of the hovered bucket, plus the bucket total', () => {
    renderChart();
    fireEvent.pointerEnter(screen.getAllByRole('button')[1], { pointerType: 'mouse' });

    const tooltip = document.querySelector('.chart-tooltip-card') as HTMLElement;
    expect(tooltip).toBeInTheDocument();
    expect(within(tooltip).getByText('Total')).toBeInTheDocument();
    expect(within(tooltip).getByText('$15.00')).toBeInTheDocument();
    expect(within(tooltip).getByText('gpt-4o')).toBeInTheDocument();
    expect(within(tooltip).getByText('claude')).toBeInTheDocument();
    // Each row carries the TRUE value and its share of the bucket.
    expect(within(tooltip).getByText('$12.00 · 80%')).toBeInTheDocument();
    expect(within(tooltip).getByText('$3.00 · 20%')).toBeInTheDocument();
  });

  it('opens the same tooltip on keyboard focus — the values are reachable without a pointer', () => {
    renderChart();
    fireEvent.focus(screen.getAllByRole('button')[0]);
    expect(document.querySelector('.chart-tooltip-card')).toBeInTheDocument();
  });

  /** The owner ruling this component exists under did not retract the measurement behind the ban:
   *  a stack that is really one bar has to say so. */
  it('states the dominance caveat when the top series exceeds 95% of the period', () => {
    renderChart({ series: [series('gpt-4o', [99, 99, 99]), series('claude', [1, 0, 0])] });
    expect(screen.getByText(/gpt-4o is \d+% of this period's total/)).toBeInTheDocument();
  });

  it('says nothing extra when the split is worth reading', () => {
    renderChart();
    expect(screen.queryByText(/of this period's total/)).not.toBeInTheDocument();
  });

  it('folds the tail into one summed Other (N) segment rather than dropping it', () => {
    renderChart({
      series: [
        series('a', [10, 10, 10]),
        series('b', [8, 8, 8]),
        series('c', [2, 2, 2]),
        series('d', [1, 1, 1]),
      ],
      topN: 2,
    });

    fireEvent.pointerEnter(screen.getAllByRole('button')[0], { pointerType: 'mouse' });
    const tooltip = document.querySelector('.chart-tooltip-card') as HTMLElement;
    expect(within(tooltip).getByText('Other (2)')).toBeInTheDocument();
    // 2 + 1, not either one alone and not their period totals.
    expect(within(tooltip).getByText(/\$3\.00/)).toBeInTheDocument();
    // The bar still sums to the true bucket total, which is the whole reason the tail is kept.
    expect(within(tooltip).getByText('$21.00')).toBeInTheDocument();
  });

  it('pins a series on click and reports it, but never pins the folded tail', () => {
    const onSelectSeries = vi.fn();
    const { container } = renderChart({
      series: [series('a', [10, 10, 10]), series('b', [8, 8, 8]), series('c', [2, 2, 2])],
      topN: 2,
      onSelectSeries,
    });

    const rects = container.querySelectorAll('svg rect');
    fireEvent.click(rects[0]);
    expect(onSelectSeries).toHaveBeenLastCalledWith('a');

    // The `Other` segment is three unrelated models — pinning it would accent all of them.
    fireEvent.click(rects[2]);
    expect(onSelectSeries).toHaveBeenLastCalledWith(null);
  });

  it('renders the empty state, with its axis still drawn, when nothing is plottable', () => {
    renderChart({ series: [series('a', [0, 0, 0])], emptyMessage: 'No usage in this range.' });
    expect(screen.getByText('No usage in this range.')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('takes a caller’s own value/axis formatters rather than fabricating a currency', () => {
    renderChart({
      formatValue: (value) => `${value} req`,
      formatYTick: (value) => `${value}`,
    });
    expect(screen.getAllByRole('button')[0]).toHaveAccessibleName(
      expect.stringContaining('14 req')
    );
  });

  describe('static (report) mode', () => {
    it('renders a standalone <svg> root with no wrapper, captions, hit regions or tooltip', () => {
      const { container } = renderChart({
        series: [series('gpt-4o', [99, 99, 99]), series('claude', [1, 0, 0])],
        static: true,
      });

      const root = container.firstElementChild as SVGElement;
      expect(root.tagName.toLowerCase()).toBe('svg');
      expect(root.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
      expect(container.querySelectorAll('button')).toHaveLength(0);
      expect(document.querySelector('.chart-tooltip-card')).not.toBeInTheDocument();
      // The caveat is real content, so it moves to the report's own chrome rather than vanishing
      // — `stackDominanceCaption` is exported for exactly that.
      expect(container.textContent).not.toContain('of this period');
    });

    it('still draws the mark itself — the segments, not a placeholder', () => {
      const { container } = renderChart({ static: true });
      expect(container.querySelectorAll('svg rect').length).toBeGreaterThan(0);
    });
  });
});
