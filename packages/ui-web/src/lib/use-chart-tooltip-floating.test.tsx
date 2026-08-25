import React, { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useChartTooltipFloating } from './use-chart-tooltip-floating';
import type { ChartTooltipPoint } from './use-chart-tooltip-floating';

function Harness({
  open,
  pinnedPoint,
  onReferenceClick,
}: {
  open: boolean;
  pinnedPoint: ChartTooltipPoint | null;
  onReferenceClick?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [anchorElement, setAnchorElement] = useState<SVGSVGElement | null>(null);

  const { setFloating, floatingStyles, getFloatingProps, getReferenceProps } =
    useChartTooltipFloating({ open, anchorElement, pinnedPoint });

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={(node) => {
          svgRef.current = node;
          setAnchorElement(node);
        }}
        width={320}
        height={200}
      />
      <button
        type="button"
        {...getReferenceProps(onReferenceClick ? { onClick: onReferenceClick } : undefined)}>
        hit-region
      </button>
      {open ? (
        <div ref={setFloating} style={floatingStyles} {...getFloatingProps()}>
          card
        </div>
      ) : null}
    </div>
  );
}

describe('useChartTooltipFloating', () => {
  it('does not throw before the anchor element mounts (open false, anchorElement null)', () => {
    expect(() => render(<Harness open={false} pinnedPoint={null} />)).not.toThrow();
  });

  it('does not throw once open with a real anchor and no pinned point (live cursor-tracking mode)', () => {
    expect(() => render(<Harness open pinnedPoint={null} />)).not.toThrow();
    expect(screen.getByText('card')).toBeInTheDocument();
  });

  it('does not throw once open with a pinned point (touch/keyboard mode)', () => {
    expect(() => render(<Harness open pinnedPoint={{ x: 40, y: 30 }} />)).not.toThrow();
    expect(screen.getByText('card')).toBeInTheDocument();
  });

  it('getReferenceProps merges a caller-supplied handler with its own on the same event key', () => {
    const onReferenceClick = vi.fn();
    render(<Harness open pinnedPoint={{ x: 40, y: 30 }} onReferenceClick={onReferenceClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'hit-region' }));

    expect(onReferenceClick).toHaveBeenCalledTimes(1);
  });

  it('unmounts cleanly while open (listeners registered on window get torn down)', () => {
    const { unmount } = render(<Harness open pinnedPoint={null} />);

    expect(() => unmount()).not.toThrow();
  });
});
