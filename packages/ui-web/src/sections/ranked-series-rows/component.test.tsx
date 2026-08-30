import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RankedSeriesRows } from './component';
import type { RankedSeriesRow } from './types';
import {
  rankedRowsDominantModel,
  rankedRowsEmpty,
  rankedRowsEstateAccounts,
  rankedRowsSparseAccount,
} from './fixtures';

describe('RankedSeriesRows', () => {
  it('renders the empty message over no rows at all', () => {
    render(<RankedSeriesRows rows={rankedRowsEmpty} emptyMessage="Nothing here yet." />);
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('ranks by value regardless of input order, and folds anything past topN into "Other"', () => {
    render(
      <RankedSeriesRows
        rows={[...rankedRowsEstateAccounts].reverse()}
        topN={8}
        otherLabel={(count) => `Other (${count} accounts)`}
      />
    );

    const names = screen
      .getAllByRole('button')
      .map((button) => button.textContent ?? '')
      .filter((text) => /nova-labs|brightline|ember-cloud|Other/.test(text));

    // First visible row is the largest spender; the two smallest (9th/10th) fold into "Other".
    expect(screen.getByRole('button', { name: /nova-labs/ })).toBeInTheDocument();
    expect(screen.getByText('Other (2 accounts)')).toBeInTheDocument();
    expect(screen.queryByText('ember-cloud')).not.toBeInTheDocument();
    expect(names.length).toBeGreaterThan(0);
  });

  it('marks the "Other" row unselectable', () => {
    const onSelect = () => {
      throw new Error('Other must never fire onSelect');
    };
    render(
      <RankedSeriesRows
        rows={rankedRowsEstateAccounts}
        topN={8}
        onSelect={onSelect}
        otherLabel={(count) => `Other (${count})`}
      />
    );
    const otherButton = screen.getByText(/^Other \(/).closest('button');
    expect(otherButton).toBeDisabled();
    if (otherButton) fireEvent.click(otherButton);
  });

  it('suppresses the share micro-bar and shows a percentage once the leading row is >=95%', () => {
    const { container } = render(<RankedSeriesRows rows={rankedRowsDominantModel} />);
    expect(container.querySelector('.ranked-share-bar')).toBeNull();
    expect(screen.getByText('97%')).toBeInTheDocument();
  });

  it('does not suppress the share micro-bar when no row dominates', () => {
    const { container } = render(<RankedSeriesRows rows={rankedRowsEstateAccounts} />);
    expect(container.querySelectorAll('.ranked-share-bar').length).toBeGreaterThan(0);
  });

  it('renders a flat dash, not a broken path, for a single-point sparkline', () => {
    const rows: RankedSeriesRow[] = [
      { key: 'a', label: 'solo', value: 4, formattedValue: '$4.00', sparklinePoints: [4] },
    ];
    const { container } = render(<RankedSeriesRows rows={rows} />);
    const svg = container.querySelector('svg.ranked-sparkline');
    expect(svg?.querySelector('line')).not.toBeNull();
    expect(svg?.querySelector('path')).toBeNull();
  });

  it('collapses a genuine zero-value tail behind one expandable line', () => {
    render(<RankedSeriesRows rows={rankedRowsSparseAccount} />);
    // Three of the five fixture rows are $0 this period.
    const disclosure = screen.getByText('3 more · no spend this period');
    expect(screen.queryByText('unused-preview')).not.toBeInTheDocument();
    fireEvent.click(disclosure);
    expect(screen.getByText('unused-preview')).toBeInTheDocument();
  });

  it('drives selection through onSelect, toggling off on a second click', () => {
    let selected: string | null = null;
    const onSelect = (key: string | null) => {
      selected = key;
    };
    render(
      <RankedSeriesRows
        rows={rankedRowsEstateAccounts}
        selectedKey={selected}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /nova-labs/ }));
    expect(selected).toBe('acct_1');
  });
});
