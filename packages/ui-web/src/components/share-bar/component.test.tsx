import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShareBar } from './component';
import type { ShareBarSegment } from './types';

const segments: ShareBarSegment[] = [
  { key: 'a', label: 'atlas-prod', value: 75, formattedValue: '$75.00' },
  { key: 'b', label: 'ledger-api', value: 25, formattedValue: '$25.00' },
];

describe('ShareBar', () => {
  it('renders one row per segment, with label, value and share', () => {
    render(<ShareBar segments={segments} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('atlas-prod')).toBeInTheDocument();
    expect(screen.getByText('$75.00')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('computes shares from the segment total, not from a caller-supplied percent', () => {
    render(
      <ShareBar
        segments={[
          { key: 'a', label: 'a', value: 1 },
          { key: 'b', label: 'b', value: 3 },
        ]}
      />,
    );

    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('spells a non-zero sub-1% share as "<1%" rather than rounding it to 0%', () => {
    render(
      <ShareBar
        segments={[
          { key: 'big', label: 'big', value: 1000 },
          { key: 'tiny', label: 'tiny', value: 1 },
        ]}
      />,
    );

    expect(screen.getByText('<1%')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('reports every share as 0% when the total is zero, without dividing by zero', () => {
    render(
      <ShareBar
        segments={[
          { key: 'a', label: 'a', value: 0 },
          { key: 'b', label: 'b', value: 0 },
        ]}
      />,
    );

    expect(screen.getAllByText('0%')).toHaveLength(2);
  });

  it('the bar itself is hidden from assistive tech — the list is the accessible representation', () => {
    const { container } = render(<ShareBar segments={segments} />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    // Exactly one tab stop per segment (the list rows), never two.
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('is read-only without onSelectSegment: rows are disabled and expose no pressed state', () => {
    render(<ShareBar segments={segments} />);

    const [first] = screen.getAllByRole('button');
    expect(first).toBeDisabled();
    expect(first).not.toHaveAttribute('aria-pressed');
  });

  it('selects on click and clears when the already-selected row is clicked again', () => {
    const onSelectSegment = vi.fn();
    const { rerender } = render(
      <ShareBar segments={segments} selectedKey={null} onSelectSegment={onSelectSegment} />,
    );

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onSelectSegment).toHaveBeenCalledWith('a');

    rerender(<ShareBar segments={segments} selectedKey="a" onSelectSegment={onSelectSegment} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onSelectSegment).toHaveBeenLastCalledWith(null);
  });

  it('marks a breached segment for assistive tech even when it is not the selected one', () => {
    render(
      <ShareBar
        segments={[segments[0], { ...segments[1], breached: true }]}
        selectedKey="a"
        onSelectSegment={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'ledger-api, over ceiling' })).toBeInTheDocument();
  });
});
