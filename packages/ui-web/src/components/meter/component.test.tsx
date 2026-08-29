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

  // Base UI's `Meter.Root` is the `role="meter"` element and renders `Label`, `Track` and `Value`
  // as siblings beneath it, so the fill is no longer the root's first child. The track is the one
  // `--raised` block inside the meter; the indicator is its only child.
  function trackOf(): HTMLElement {
    const track = screen.getByRole('meter').querySelector('.bg-raised');
    expect(track).not.toBeNull();
    return track as HTMLElement;
  }

  function indicatorOf(): HTMLElement {
    return trackOf().firstElementChild as HTMLElement;
  }

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

    const fill = indicatorOf();
    expect(fill).toHaveClass('bg-soft');
    expect(fill).not.toHaveClass('bg-primary');
  });

  it('renders the signal fill at or past the threshold', () => {
    render(<Meter value={455.2} ceiling={500} threshold={0.9} />);

    expect(indicatorOf()).toHaveClass('bg-primary');
  });

  it('keeps the 4px square track — never a rounded, animated daisy `progress`', () => {
    render(<Meter value={142.55} ceiling={500} />);

    const track = trackOf();
    expect(track).toHaveClass('h-1', 'rounded-[2px]');
    expect(track.className).not.toMatch(/progress|rounded-full/);
  });

  it('clamps the fill width to 100% even when value exceeds ceiling', () => {
    render(<Meter value={600} ceiling={500} />);

    expect(indicatorOf()).toHaveStyle({ width: '100%' });
  });

  it('omits the caption when showCaption is false', () => {
    render(<Meter value={10} ceiling={100} showCaption={false} />);

    expect(screen.queryByText(/of \$/)).not.toBeInTheDocument();
  });

  it('exposes the value range for assistive tech', () => {
    render(<Meter value={25} ceiling={100} label="Budget consumption" />);

    const meter = screen.getByRole('meter', { name: 'Budget consumption' });
    expect(meter).toHaveAttribute('aria-valuenow', '25');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });

  // The regression Base UI's Meter fixes: the hand-rolled version passed `aria-valuenow` through
  // unclamped, so an over-ceiling account advertised a value outside its own declared range while
  // the bar sat at 100%.
  it('clamps aria-valuenow to the ceiling when the value overshoots it', () => {
    render(<Meter value={600} ceiling={500} label="Account ceiling" />);

    expect(screen.getByRole('meter', { name: 'Account ceiling' })).toHaveAttribute(
      'aria-valuenow',
      '500'
    );
  });

  // `aria-valuetext` must be the money pair, not Base UI's default bare percentage — the breach is
  // judged in dollars, and the caption is `aria-hidden` precisely so this is the single spoken
  // form of it.
  it('speaks the money pair as aria-valuetext, and speaks it only once', () => {
    render(<Meter value={0.006338} ceiling={12} label="Account ceiling" />);

    const meter = screen.getByRole('meter', { name: 'Account ceiling' });
    expect(meter).toHaveAttribute('aria-valuetext', formatUsdOf(0.006338, 12));
    expect(screen.getByText(formatUsdOf(0.006338, 12), exact)).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('names the meter without drawing the label', () => {
    render(<Meter value={25} ceiling={100} label="gateway-prod ceiling" />);

    expect(screen.getByText('gateway-prod ceiling')).toHaveClass('sr-only');
  });
});
