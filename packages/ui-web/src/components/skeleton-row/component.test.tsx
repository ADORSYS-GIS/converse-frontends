import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SkeletonRow } from './component';

describe('SkeletonRow', () => {
  it('renders the requested number of blocks, hidden from assistive tech', () => {
    const { container } = render(<SkeletonRow columnCount={5} />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('span')).toHaveLength(5);
  });

  it('matches the 44px default row height', () => {
    const { container } = render(<SkeletonRow />);

    expect(container.firstElementChild).toHaveClass('h-11');
  });

  it('matches the 52px review-queue row height', () => {
    const { container } = render(<SkeletonRow density="review" />);

    expect(container.firstElementChild).toHaveClass('h-[52px]');
  });

  it('aligns to a supplied grid template', () => {
    const { container } = render(
      <SkeletonRow columnCount={3} gridTemplateColumns="120px 1fr 80px" />
    );

    expect(container.firstElementChild).toHaveStyle({ gridTemplateColumns: '120px 1fr 80px' });
  });

  it('paints its blocks with daisy `skeleton`, not a re-declared raised block', () => {
    const { container } = render(<SkeletonRow columnCount={3} />);

    const blocks = Array.from(container.querySelectorAll('span'));
    expect(blocks).toHaveLength(3);
    for (const block of blocks) {
      expect(block).toHaveClass('skeleton', 'h-3');
      // The class carries `--color-base-300` and `--radius-box` itself; re-declaring them would
      // be the hand-styling PRIMITIVE-MATRIX row 24 exists to remove.
      expect(block).not.toHaveClass('bg-raised');
      expect(block).not.toHaveClass('rounded-[2px]');
    }
  });

  it('never animates with a shimmer', () => {
    const { container } = render(<SkeletonRow />);

    expect(container.firstElementChild?.className).not.toMatch(/shimmer|animate-pulse/);
    // daisy's own shimmer is suppressed centrally in `theme.css` (`@utility skeleton`), so no
    // usage site may carry an animation utility of its own either.
    for (const block of container.querySelectorAll('span')) {
      expect(block.className).not.toMatch(/animate-|shimmer/);
    }
  });
});
