import React, { useEffect, useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useChartTooltipFloating } from '../../lib/use-chart-tooltip-floating';
import { ChartTooltip } from './component';
import type { ChartTooltipProps } from './types';

/**
 * Drives `ChartTooltip`'s positioning props off a real `useChartTooltipFloating()` call over a
 * real mounted `<svg>` -- Floating UI's virtual element needs a real `contextElement`, and
 * `ChartTooltip` itself no longer owns any positioning logic (that moved to the hook so it can
 * be called from wherever a chart's actual interactive hit-region elements live -- see the
 * hook's own docstring).
 */
function Harness({
  anchorless,
  x = 10,
  y = 10,
  ...rest
}: Omit<ChartTooltipProps, 'setFloating' | 'floatingStyles' | 'getFloatingProps'> & {
  anchorless?: boolean;
  x?: number;
  y?: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [anchorElement, setAnchorElement] = useState<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!anchorless) setAnchorElement(svgRef.current);
  }, [anchorless]);

  // Mirrors every real chart: the tooltip is only ever `open` once both the caller wants it
  // visible AND the anchor has mounted -- `visible` alone (as `ChartTooltip` received pre-split)
  // is no longer the whole gate, since positioning now depends on a real `anchorElement`.
  const open = rest.visible && anchorElement !== null;

  const { setFloating, floatingStyles, getFloatingProps } = useChartTooltipFloating({
    open,
    anchorElement,
    pinnedPoint: { x, y },
  });

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} width={320} height={200} />
      <ChartTooltip
        {...rest}
        visible={open}
        setFloating={setFloating}
        floatingStyles={floatingStyles}
        getFloatingProps={getFloatingProps}
      />
    </div>
  );
}

describe('ChartTooltip', () => {
  it('renders nothing when not visible', () => {
    render(<Harness visible={false} x={10} y={10} rows={[{ key: 'a', label: 'A', value: '1' }]} />);

    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });

  it('renders nothing when there are no rows, even if visible', () => {
    render(<Harness visible x={10} y={10} rows={[]} />);

    expect(document.querySelector('.bg-surface')).not.toBeInTheDocument();
  });

  it('renders nothing when the anchor element has not mounted yet', () => {
    render(<Harness visible anchorless x={10} y={10} rows={[{ key: 'a', label: 'A', value: '1' }]} />);

    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });

  it('renders the title and one row per entry with label and value', () => {
    render(
      <Harness
        visible
        x={100}
        y={80}
        title="Aug 21"
        rows={[
          { key: 'a', label: 'project-a', value: '$212.40' },
          { key: 'b', label: 'project-b', value: '$88.00' },
        ]}
      />,
    );

    expect(screen.getByText('Aug 21')).toBeInTheDocument();
    expect(screen.getByText('project-a')).toBeInTheDocument();
    expect(screen.getByText('$212.40')).toBeInTheDocument();
    expect(screen.getByText('project-b')).toBeInTheDocument();
    expect(screen.getByText('$88.00')).toBeInTheDocument();
  });

  it('omits the title row when no title is given', () => {
    render(<Harness visible x={100} y={80} rows={[{ key: 'a', label: 'project-a', value: '$1.00' }]} />);

    expect(document.querySelectorAll('.chart-tooltip-title')).toHaveLength(0);
  });

  it('renders the tooltip card in a portal, not inline in the chart wrapper', () => {
    const { container } = render(
      <Harness visible x={100} y={80} rows={[{ key: 'a', label: 'project-a', value: '$1.00' }]} />,
    );

    expect(container.querySelector('.chart-tooltip-card')).not.toBeInTheDocument();
    expect(document.body.querySelector('.chart-tooltip-card')).toBeInTheDocument();
  });

  it('sets pointer-events: none on the card so it never blocks pointer tracking underneath', () => {
    render(<Harness visible x={100} y={80} rows={[{ key: 'a', label: 'project-a', value: '$1.00' }]} />);

    const card = document.body.querySelector('.chart-tooltip-card') as HTMLElement;
    expect(card.style.pointerEvents).toBe('none');
  });
});
