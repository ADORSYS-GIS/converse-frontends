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
      <SkeletonRow columnCount={3} gridTemplateColumns="120px 1fr 80px" />,
    );

    expect(container.firstElementChild).toHaveStyle({ gridTemplateColumns: '120px 1fr 80px' });
  });

  it('never animates with a shimmer', () => {
    const { container } = render(<SkeletonRow />);

    expect(container.firstElementChild?.className).not.toMatch(/shimmer|animate-pulse/);
  });
});
