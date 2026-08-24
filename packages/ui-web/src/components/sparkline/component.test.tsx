import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Sparkline } from './component';

describe('Sparkline', () => {
  it('renders a polyline and a terminal dot for a series', () => {
    const { container } = render(<Sparkline data={[1, 4, 2, 8, 5]} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('polyline')).toBeInTheDocument();
    expect(container.querySelector('circle')).toBeInTheDocument();
  });

  it('renders nothing for fewer than two points', () => {
    const { container } = render(<Sparkline data={[3]} />);

    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('renders nothing for an empty series', () => {
    const { container } = render(<Sparkline data={[]} />);

    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('respects custom dimensions', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} width={40} height={12} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '12');
  });

  it('never draws a fill on the polyline', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />);

    expect(container.querySelector('polyline')).toHaveAttribute('fill', 'none');
  });
});
