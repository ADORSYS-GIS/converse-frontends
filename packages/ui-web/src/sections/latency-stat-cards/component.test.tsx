import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LatencyStatCards } from './component';
import { latencyStatRows, latencyStatRowsEmpty } from './fixtures';

/** The card a model's name sits in — every assertion below is scoped to one card, because the
 *  panel draws three of them and `p95` now appears once per card as a real column label rather
 *  than once as a fragment of a run-on meta line. */
function cardFor(model: string): HTMLElement {
  const label = screen.getByText(model);
  const card = label.closest('.latency-card');
  if (!card) throw new Error(`no .latency-card around "${model}"`);
  return card as HTMLElement;
}

describe('LatencyStatCards', () => {
  it('renders a card per model with a real sample count', () => {
    render(<LatencyStatCards rows={latencyStatRows} />);
    expect(cardFor('gpt-4o')).toHaveTextContent('n=4,210');
    expect(cardFor('gpt-4o-mini')).toHaveTextContent('n=1,890');
  });

  it('hides a model with zero latency-bearing samples entirely', () => {
    render(<LatencyStatCards rows={latencyStatRows} />);
    expect(screen.queryByText('embed-3')).not.toBeInTheDocument();
  });

  it('suppresses the p99 column below the 100-sample floor, but still shows p50/p95', () => {
    render(<LatencyStatCards rows={latencyStatRows} />);
    const card = cardFor('claude-opus-4');
    expect(card).toHaveTextContent('n=42');
    expect(card.textContent).toContain('p50');
    expect(card.textContent).toContain('p95');
    expect(card.textContent).not.toContain('p99');
  });

  it('shows p99 once samples reach the floor', () => {
    render(<LatencyStatCards rows={latencyStatRows} />);
    expect(cardFor('gpt-4o').textContent).toContain('p99');
  });

  /**
   * The owner's 2026-09-03 legibility directive, as a mechanical assertion: the unit is a SIBLING
   * of the numeral, not part of its text. A card that rendered `812 ms` as one string would put
   * `ms` at the numeral's own 20px mono, which is the thing this changed.
   */
  it('sets the unit beside the numeral rather than inside it', () => {
    render(<LatencyStatCards rows={latencyStatRows} />);
    const card = cardFor('gpt-4o');
    // 812ms and 2140ms/3820ms — the first stays in the ms band, the other two roll into seconds.
    const p50 = card.querySelectorAll('.latency-card-value')[0];
    expect(p50.children).toHaveLength(2);
    expect(p50.children[0].textContent).toBe('812');
    expect(p50.children[1].textContent).toBe('ms');
    expect(card).toHaveTextContent('2.14');
    expect(card).toHaveTextContent('3.82');
  });

  it('renders three aligned figure columns per card, one per percentile it states', () => {
    render(<LatencyStatCards rows={latencyStatRows} />);
    expect(cardFor('gpt-4o').querySelectorAll('.latency-card-figure')).toHaveLength(3);
    // p99 suppressed — two figures, and the grid still reserves three tracks so the cards line up.
    expect(cardFor('claude-opus-4').querySelectorAll('.latency-card-figure')).toHaveLength(2);
  });

  it('renders one inline status line when every row is zero-sample', () => {
    render(<LatencyStatCards rows={latencyStatRowsEmpty} emptyMessage="Nothing yet." />);
    expect(screen.getByText('Nothing yet.')).toBeInTheDocument();
  });
});
