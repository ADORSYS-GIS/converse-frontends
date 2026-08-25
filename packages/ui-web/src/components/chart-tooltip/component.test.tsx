import React, { useEffect, useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChartTooltip } from './component';
import type { ChartTooltipProps } from './types';

/** Drives `anchorElement` off a real mounted `<svg>` -- Floating UI's virtual element needs a real `contextElement`. */
function Harness(props: Omit<ChartTooltipProps, 'anchorElement'> & { anchorless?: boolean }) {
  const { anchorless, ...rest } = props;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [anchorElement, setAnchorElement] = useState<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!anchorless) setAnchorElement(svgRef.current);
  }, [anchorless]);

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} width={320} height={200} />
      <ChartTooltip anchorElement={anchorElement} {...rest} />
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

    expect(document.querySelectorAll('.text-subtle')).toHaveLength(0);
  });

  it('renders the tooltip card in a portal, not inline in the chart wrapper', () => {
    const { container } = render(
      <Harness visible x={100} y={80} rows={[{ key: 'a', label: 'project-a', value: '$1.00' }]} />,
    );

    expect(container.querySelector('.bg-surface')).not.toBeInTheDocument();
    expect(document.body.querySelector('.bg-surface')).toBeInTheDocument();
  });

  it('sets pointer-events: none on the card so it never blocks pointer tracking underneath', () => {
    render(<Harness visible x={100} y={80} rows={[{ key: 'a', label: 'project-a', value: '$1.00' }]} />);

    const card = document.body.querySelector('.bg-surface') as HTMLElement;
    expect(card.style.pointerEvents).toBe('none');
  });
});
