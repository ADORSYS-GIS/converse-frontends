import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SkeletonMetric } from './component';

describe('SkeletonMetric', () => {
  it('renders a daisy `skeleton` block hidden from assistive tech', () => {
    const { container } = render(<SkeletonMetric />);

    const block = container.firstElementChild;
    // `skeleton` resolves to `--color-base-300` (`raised`) at `--radius-box` (2px) on its own —
    // PRIMITIVE-MATRIX row 25 is about deleting the re-declaration, not adding to it.
    expect(block).toHaveClass('skeleton', 'inline-block', 'h-[22px]');
    expect(block).not.toHaveClass('bg-raised');
    expect(block).not.toHaveClass('rounded-[2px]');
    expect(block).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies a custom width', () => {
    const { container } = render(<SkeletonMetric width={120} />);

    expect(container.firstElementChild).toHaveStyle({ width: '120px' });
  });

  it('never animates with a shimmer', () => {
    const { container } = render(<SkeletonMetric />);

    expect(container.firstElementChild?.className).not.toMatch(/shimmer|animate-pulse/);
  });
});
