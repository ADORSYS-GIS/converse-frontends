import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SpendShareSection } from './component';
import { formatOverviewSpendShareCentre, overviewSpendShareSlices } from './fixtures';

const base = {
  slices: overviewSpendShareSlices,
  size: 200,
  centreMetric: formatOverviewSpendShareCentre(),
  centreLabel: 'TOTAL',
};

// testing-library's default text normalizer collapses all Unicode whitespace (including the thin
// space, U+2009 — a JS `\s` match) to a plain space, so an exact-string query against
// `formatUsd`'s thin-space thousands separator needs its own normalization disabled (same
// pattern as `meter/component.test.tsx`).
const exact = { normalizer: (text: string) => text };

describe('SpendShareSection', () => {
  it('renders its heading and the donut', () => {
    const { container } = render(<SpendShareSection {...base} />);

    expect(screen.getByText('SPEND — SHARE BY PROJECT')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelectorAll('path[role="button"]').length).toBe(
      overviewSpendShareSlices.length
    );
  });

  it('renders the centre metric and label', () => {
    render(<SpendShareSection {...base} />);

    expect(screen.getByText(formatOverviewSpendShareCentre(), exact)).toBeInTheDocument();
    expect(screen.getByText('TOTAL')).toBeInTheDocument();
  });

  it('replaces the donut with a ring-geometry skeleton and a status line while loading', () => {
    const { container } = render(<SpendShareSection {...base} status="loading" />);

    expect(screen.getByText('Querying usage…')).toBeInTheDocument();
    expect(container.querySelectorAll('path[role="button"]')).toHaveLength(0);
    expect(container.querySelector('circle')).toBeInTheDocument();
  });

  it('replaces the donut with an ErrorLine + Retry on failure', () => {
    const onRetry = vi.fn();
    render(
      <SpendShareSection
        {...base}
        status="error"
        errorMessage="Failed to load spend share."
        onRetry={onRetry}
      />
    );

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Failed to load spend share.')).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('is controlled: selectedKey syncs the highlighted wedge with an external state', () => {
    const { container, rerender } = render(
      <SpendShareSection {...base} selectedKey={null} onSelectSlice={() => {}} />
    );

    const key = overviewSpendShareSlices[0].key;
    rerender(<SpendShareSection {...base} selectedKey={key} onSelectSlice={() => {}} />);

    const selectedWedge = container.querySelector('path[aria-pressed="true"]');
    expect(selectedWedge).toBeInTheDocument();
  });

  it('selecting a wedge calls onSelectSlice', () => {
    let selected: string | null = null;
    const { container } = render(
      <SpendShareSection
        {...base}
        selectedKey={null}
        onSelectSlice={(key) => {
          selected = key;
        }}
      />
    );

    const firstWedge = container.querySelector('path[role="button"]');
    if (!firstWedge) throw new Error('expected at least one wedge');
    fireEvent.click(firstWedge);

    expect(selected).toBe(overviewSpendShareSlices[0].key);
  });

  // Regression for #272 — see `spend-dashboard`'s equivalent block for the full rationale.
  describe('status="unwired"', () => {
    it('keeps the ring rendered above an inline status line naming the real reason', () => {
      const { container } = render(<SpendShareSection slices={[]} size={200} status="unwired" />);

      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(screen.getByText('Not wired — see banner above.')).toBeInTheDocument();
      expect(screen.queryByText('No spend in this range.')).not.toBeInTheDocument();
    });

    it('never routes through ErrorLine — nothing failed, there is nothing to retry', () => {
      render(<SpendShareSection slices={[]} size={200} status="unwired" />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('never shows the loading "Querying usage…" line — no request is actually in flight', () => {
      render(<SpendShareSection slices={[]} size={200} status="unwired" />);

      expect(screen.queryByText('Querying usage…')).not.toBeInTheDocument();
    });
  });
});
