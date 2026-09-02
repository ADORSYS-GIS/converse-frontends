import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DonutChart } from './component';
import type { DonutSegment } from './types';

const segments: DonutSegment[] = [
  { key: 'gpt-4o', label: 'gpt-4o', value: 60, formattedValue: '$60.00' },
  { key: 'claude', label: 'claude', value: 30, formattedValue: '$30.00' },
  { key: 'mistral', label: 'mistral', value: 10, formattedValue: '$10.00' },
];

function wedges(container: HTMLElement): SVGPathElement[] {
  return Array.from(container.querySelectorAll<SVGPathElement>('path.donut-wedge'));
}

describe('DonutChart', () => {
  it('draws one wedge per segment, in array order', () => {
    const { container } = render(<DonutChart segments={segments} width={240} height={240} />);
    expect(wedges(container)).toHaveLength(3);
    expect(wedges(container)[0].getAttribute('aria-label')).toContain('gpt-4o');
  });

  /**
   * The doctrine invariant (owner ruling 2026-09-02: rings allowed, filled disks never). The
   * geometry itself is swept in `chart-core/arcs.test.ts`; this asserts the RENDERED mark keeps
   * the hole — a wedge path with an inner boundary carries two arc commands, a pie slice one.
   */
  it('renders a RING, never a filled disk', () => {
    const { container } = render(
      <DonutChart segments={segments} width={240} height={240} innerRadiusRatio={0} />
    );
    for (const wedge of wedges(container)) {
      expect((wedge.getAttribute('d') ?? '').match(/A/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  });

  /** Values live on hover in the shared tooltip — never in a static per-series list under the
   *  chart (owner ruling 2026-08-31). */
  it('carries no legend list — the only value text is on hover', () => {
    render(<DonutChart segments={segments} width={240} height={240} />);
    expect(screen.queryByText('$60.00')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows the hovered segment in the tooltip and clears it on leave', () => {
    const { container } = render(<DonutChart segments={segments} width={240} height={240} />);
    fireEvent.pointerEnter(wedges(container)[0], { pointerType: 'mouse' });
    expect(screen.getByText('$60.00 · 60%')).toBeInTheDocument();

    fireEvent.pointerLeave(wedges(container)[0], { pointerType: 'mouse' });
    expect(screen.queryByText('$60.00 · 60%')).not.toBeInTheDocument();
  });

  it('collapses the tail into one Other wedge, like a ranked list', () => {
    const many: DonutSegment[] = Array.from({ length: 10 }, (_, index) => ({
      key: `m${index}`,
      label: `model-${index}`,
      value: 10 - index,
    }));
    const { container } = render(<DonutChart segments={many} width={240} height={240} topN={3} />);
    expect(wedges(container)).toHaveLength(4);
    expect(wedges(container)[3].getAttribute('aria-label')).toContain('Other (7)');
  });

  it('never makes the collapsed Other wedge selectable — it stands for no single key', () => {
    const onSelectSegment = vi.fn();
    const { container } = render(
      <DonutChart
        segments={segments}
        width={240}
        height={240}
        topN={1}
        onSelectSegment={onSelectSegment}
      />
    );
    fireEvent.click(wedges(container)[1]);
    expect(onSelectSegment).not.toHaveBeenCalled();

    fireEvent.click(wedges(container)[0]);
    expect(onSelectSegment).toHaveBeenCalledWith('gpt-4o');
  });

  it('toggles a selected segment back off', () => {
    const onSelectSegment = vi.fn();
    const { container } = render(
      <DonutChart
        segments={segments}
        width={240}
        height={240}
        selectedKey="gpt-4o"
        onSelectSegment={onSelectSegment}
      />
    );
    fireEvent.click(wedges(container)[0]);
    expect(onSelectSegment).toHaveBeenCalledWith(null);
  });

  it('activates a wedge from the keyboard', () => {
    const onSelectSegment = vi.fn();
    const { container } = render(
      <DonutChart segments={segments} width={240} height={240} onSelectSegment={onSelectSegment} />
    );
    fireEvent.keyDown(wedges(container)[1], { key: 'Enter' });
    expect(onSelectSegment).toHaveBeenCalledWith('claude');
  });

  it('renders the centre readout in the hole, as DOM text rather than SVG text', () => {
    const { container } = render(
      <DonutChart
        segments={segments}
        width={240}
        height={240}
        centreMetric="$100.00"
        centreLabel="TOTAL"
      />
    );
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('TOTAL')).toBeInTheDocument();
    expect(container.querySelector('svg text')).toBeNull();
  });

  it.each([
    ['no segments at all', [] as DonutSegment[]],
    ['segments that are all zero', [{ key: 'a', label: 'a', value: 0 }]],
    ['segments that are all negative', [{ key: 'a', label: 'a', value: -5 }]],
  ])('keeps a ring outline and states the empty message for %s', (_label, empty) => {
    const { container } = render(
      <DonutChart
        segments={empty}
        width={240}
        height={240}
        emptyMessage="No spend in this range."
      />
    );
    expect(wedges(container)).toHaveLength(0);
    expect(container.querySelector('svg circle')).toBeInTheDocument();
    expect(screen.getByText('No spend in this range.')).toBeInTheDocument();
  });

  it('survives a degenerate box without throwing', () => {
    const { container } = render(<DonutChart segments={segments} width={0} height={0} />);
    expect(wedges(container)).toHaveLength(0);
  });

  it('accents at most ONE wedge, even with several breached segments', () => {
    const { container } = render(
      <DonutChart
        segments={segments.map((segment) => ({ ...segment, breached: true }))}
        width={240}
        height={240}
      />
    );
    const accented = wedges(container).filter(
      (wedge) => wedge.getAttribute('fill') === 'var(--color-primary)'
    );
    expect(accented).toHaveLength(1);
  });

  it('gives selection priority over a breach for the single accent', () => {
    const { container } = render(
      <DonutChart
        segments={segments.map((segment, index) => ({ ...segment, breached: index === 0 }))}
        selectedKey="mistral"
        width={240}
        height={240}
      />
    );
    expect(wedges(container)[2].getAttribute('fill')).toBe('var(--color-primary)');
    expect(wedges(container)[0].getAttribute('fill')).not.toBe('var(--color-primary)');
  });
});

/** `static` mode — the same export/print contract `MultiSeriesSpendChart` holds
 *  (converse-frontends#453 AC-1), asserted through the server renderer for the same reason. */
describe('DonutChart — static', () => {
  const markup = (extra: Partial<React.ComponentProps<typeof DonutChart>> = {}) =>
    renderToStaticMarkup(
      <DonutChart
        segments={segments}
        width={240}
        height={240}
        centreMetric="$100.00"
        centreLabel="TOTAL"
        onSelectSegment={() => {}}
        static
        {...extra}
      />
    );

  it('renders an <svg> carrying an xmlns as its ROOT element', () => {
    const html = markup();
    expect(html.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(html.endsWith('</svg>')).toBe(true);
  });

  it('draws the ring and strips every interaction, tooltip included', () => {
    const html = markup();
    expect(html.match(/donut-wedge/g) ?? []).toHaveLength(3);
    expect(html).not.toContain('tabindex');
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain('chart-tooltip-card');
  });

  it('moves the hole’s numeral into SVG text, since there is no DOM to wrap in', () => {
    const html = markup();
    expect(html).toContain('>$100.00</text>');
    expect(html).toContain('>TOTAL</text>');
    expect(html).not.toContain('donut-centre');
  });

  it('keeps the empty ring, and puts its SENTENCE under the ring rather than in the hole', () => {
    const html = markup({ segments: [], emptyMessage: 'No spend in this range.' });
    expect(html).toContain('<circle');
    expect(html).toContain('No spend in this range.');
  });
});
