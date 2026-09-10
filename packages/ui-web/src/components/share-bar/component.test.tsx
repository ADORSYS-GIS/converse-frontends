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
      />
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
      />
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
      />
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
      <ShareBar segments={segments} selectedKey={null} onSelectSegment={onSelectSegment} />
    );

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onSelectSegment).toHaveBeenCalledWith('a');

    rerender(<ShareBar segments={segments} selectedKey="a" onSelectSegment={onSelectSegment} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onSelectSegment).toHaveBeenLastCalledWith(null);
  });

  /**
   * `hrefFor` (2026-09-03) — a share bar's rows name real entities, and until this existed the only
   * way to open one was to find it again in a table somewhere else on the page.
   */
  describe('hrefFor', () => {
    it('renders a linked row as an anchor rather than a button', () => {
      render(<ShareBar segments={segments} hrefFor={(s) => `/models/${s.key}`} />);

      const link = screen.getByRole('link', { name: /atlas-prod/ });
      expect(link).toHaveAttribute('href', '/models/a');
      // The row is the anchor, not an anchor INSIDE a button — exactly one tab stop per segment.
      expect(screen.queryAllByRole('button')).toHaveLength(0);
      expect(screen.getAllByRole('link')).toHaveLength(2);
    });

    it('leaves a segment with no destination as an ordinary row', () => {
      render(
        <ShareBar
          segments={segments}
          onSelectSegment={() => {}}
          hrefFor={(s) => (s.key === 'a' ? '/models/a' : undefined)}
        />
      );

      expect(screen.getAllByRole('link')).toHaveLength(1);
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    /** A LINK wins over selection: a row that navigated and toggled on one click would do two
     *  things the reader asked for one of. */
    it('does not also toggle selection', () => {
      const onSelectSegment = vi.fn();
      render(
        <ShareBar
          segments={segments}
          selectedKey={null}
          onSelectSegment={onSelectSegment}
          hrefFor={(s) => `/models/${s.key}`}
        />
      );

      const link = screen.getByRole('link', { name: /atlas-prod/ });
      expect(link).not.toHaveAttribute('aria-pressed');
      fireEvent.click(link);
      expect(onSelectSegment).not.toHaveBeenCalled();
    });

    /** The collapsed tail is several entities at once, and there is no page for "several". The
     *  caller folds it in (`collapseSegmentsTail`); refusing it here is what stops every caller
     *  having to remember. */
    it('never links the collapsed Other segment', () => {
      render(
        <ShareBar
          segments={[segments[0], { key: '__other__', label: 'Other (4)', value: 25 }]}
          hrefFor={(s) => `/models/${s.key}`}
        />
      );

      expect(screen.getAllByRole('link')).toHaveLength(1);
      expect(screen.getByRole('button', { name: /Other \(4\)/ })).toBeInTheDocument();
    });
  });

  it('marks a breached segment for assistive tech even when it is not the selected one', () => {
    render(
      <ShareBar
        segments={[segments[0], { ...segments[1], breached: true }]}
        selectedKey="a"
        onSelectSegment={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'ledger-api, over ceiling' })).toBeInTheDocument();
  });
});
