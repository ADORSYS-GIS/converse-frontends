import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SpendShareSection } from './component';
import { formatOverviewSpendShareTotal, overviewSpendShareSegments } from './fixtures';

const base = {
  segments: overviewSpendShareSegments,
  total: formatOverviewSpendShareTotal(),
};

// testing-library's default text normalizer collapses all Unicode whitespace (including the thin
// space, U+2009 — a JS `\s` match) to a plain space, so an exact-string query against
// `formatMoney`'s thin-space thousands separator needs its own normalization disabled (same
// pattern as `meter/component.test.tsx`).
const exact = { normalizer: (text: string) => text };

describe('SpendShareSection', () => {
  it('renders its heading and one list row per segment', () => {
    render(<SpendShareSection {...base} />);

    expect(screen.getByText('Spend — share by project')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(overviewSpendShareSegments.length);
  });

  it('renders the total beside the heading', () => {
    render(<SpendShareSection {...base} />);

    expect(screen.getByText(formatOverviewSpendShareTotal(), exact)).toBeInTheDocument();
  });

  it('replaces the bar with matching skeleton geometry and a status line while loading', () => {
    render(<SpendShareSection {...base} status="loading" />);

    expect(screen.getByText('Querying usage…')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('replaces the bar with an ErrorLine + Retry on failure', () => {
    const onRetry = vi.fn();
    render(
      <SpendShareSection
        {...base}
        status="error"
        errorMessage="Failed to load spend share."
        onRetry={onRetry}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Failed to load spend share.')).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('is controlled: selectedKey drives which row is pressed', () => {
    const key = overviewSpendShareSegments[0].key;
    const { rerender } = render(
      <SpendShareSection {...base} selectedKey={null} onSelectSegment={() => {}} />,
    );
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();

    rerender(<SpendShareSection {...base} selectedKey={key} onSelectSegment={() => {}} />);
    expect(screen.getByRole('button', { pressed: true })).toBeInTheDocument();
  });

  it('selecting a row calls onSelectSegment, and re-selecting it clears the selection', () => {
    let selected: string | null = null;
    const key = overviewSpendShareSegments[0].key;
    const { rerender } = render(
      <SpendShareSection
        {...base}
        selectedKey={null}
        onSelectSegment={(next) => {
          selected = next;
        }}
      />,
    );

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(selected).toBe(key);

    rerender(
      <SpendShareSection
        {...base}
        selectedKey={key}
        onSelectSegment={(next) => {
          selected = next;
        }}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(selected).toBeNull();
  });

  // Regression for #272 — see `spend-dashboard`'s equivalent block for the full rationale.
  describe('status="unwired"', () => {
    it('keeps the bar rendered above an inline status line naming the real reason', () => {
      render(<SpendShareSection segments={[]} status="unwired" />);

      expect(screen.getByText('Not wired — see banner above.')).toBeInTheDocument();
      expect(screen.queryByText('No spend in this range.')).not.toBeInTheDocument();
    });

    it('prints no total — an unwired zone must never show a figure, not even zero', () => {
      render(<SpendShareSection segments={[]} total="$0.00" status="unwired" />);

      expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    });

    it('never routes through ErrorLine — nothing failed, there is nothing to retry', () => {
      render(<SpendShareSection segments={[]} status="unwired" />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('never shows the loading "Querying usage…" line — no request is actually in flight', () => {
      render(<SpendShareSection segments={[]} status="unwired" />);

      expect(screen.queryByText('Querying usage…')).not.toBeInTheDocument();
    });
  });
});
