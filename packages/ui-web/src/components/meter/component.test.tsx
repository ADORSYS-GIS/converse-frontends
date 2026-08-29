import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatUsdOf } from '../../lib/money';
import { Meter } from './component';

describe('Meter', () => {
  // testing-library's default text normalizer collapses all Unicode whitespace (including the
  // thin space, U+2009 — a JS `\s` match) to a plain space, so an exact-string query needs its
  // own normalization disabled to compare the raw, un-collapsed rendered text faithfully.
  const exact = { normalizer: (text: string) => text };

  it('renders the paired "$X of $Y" caption with thin-space thousands', () => {
    render(<Meter value={142.55} ceiling={500} />);

    expect(screen.getByText(formatUsdOf(142.55, 500), exact)).toBeInTheDocument();
  });

  it('formats larger amounts with a thin-space thousands separator', () => {
    render(<Meter value={1131.8} ceiling={2250} />);

    expect(screen.getByText(formatUsdOf(1131.8, 2250), exact)).toBeInTheDocument();
  });

  it('renders the body-grey fill under the threshold', () => {
    render(<Meter value={142.55} ceiling={500} />);

    const meter = screen.getByRole('meter');
    const fill = meter.firstElementChild;
    expect(fill).toHaveClass('bg-soft');
    expect(fill).not.toHaveClass('bg-primary');
  });

  it('renders the signal fill at or past the threshold', () => {
    render(<Meter value={455.2} ceiling={500} threshold={0.9} />);

    const meter = screen.getByRole('meter');
    expect(meter.firstElementChild).toHaveClass('bg-primary');
  });

  it('clamps the fill width to 100% even when value exceeds ceiling', () => {
    render(<Meter value={600} ceiling={500} />);

    const meter = screen.getByRole('meter');
    expect(meter.firstElementChild).toHaveStyle({ width: '100%' });
  });

  it('omits the caption when showCaption is false', () => {
    render(<Meter value={10} ceiling={100} showCaption={false} />);

    expect(screen.queryByText(/of \$/)).not.toBeInTheDocument();
  });

  it('exposes the value range for assistive tech', () => {
    render(<Meter value={25} ceiling={100} label="Budget consumption" />);

    const meter = screen.getByRole('meter', { name: 'Budget consumption' });
    expect(meter).toHaveAttribute('aria-valuenow', '25');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });
});
