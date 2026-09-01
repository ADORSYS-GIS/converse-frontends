import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatCard } from './component';

describe('StatCard', () => {
  it('renders the label and metric', () => {
    render(<StatCard label="Spend this month" metric="$142.55" />);

    expect(screen.getByText('Spend this month')).toBeInTheDocument();
    expect(screen.getByText('$142.55')).toBeInTheDocument();
  });

  it('renders an up delta with the soft tone, never a colour-coded one', () => {
    render(
      <StatCard
        label="SPEND"
        metric="$1.00"
        delta={{ direction: 'up', label: '18% vs prev 30d' }}
      />,
    );

    const delta = screen.getByText(/18% vs prev 30d/);
    expect(delta).toHaveClass('text-soft');
    expect(delta).not.toHaveClass('text-primary');
  });

  it('renders a flat delta with the subtle tone', () => {
    render(<StatCard label="Projects" metric="6" delta={{ direction: 'flat', label: 'no change' }} />);

    const delta = screen.getByText(/no change/);
    expect(delta).toHaveClass('text-subtle');
  });

  it('omits the delta line when none is given', () => {
    render(<StatCard label="Projects" metric="6" />);

    expect(screen.queryByText('▲')).not.toBeInTheDocument();
    expect(screen.queryByText('▼')).not.toBeInTheDocument();
  });

  it('renders the sparkline slot when given', () => {
    render(<StatCard label="SPEND" metric="$1.00" sparkline={<svg data-testid="spark" />} />);

    expect(screen.getByTestId('spark')).toBeInTheDocument();
  });
});
