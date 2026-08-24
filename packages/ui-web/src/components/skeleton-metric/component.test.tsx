import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SkeletonMetric } from './component';

describe('SkeletonMetric', () => {
  it('renders a raised block hidden from assistive tech', () => {
    const { container } = render(<SkeletonMetric />);

    const block = container.firstElementChild;
    expect(block).toHaveClass('bg-raised');
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
