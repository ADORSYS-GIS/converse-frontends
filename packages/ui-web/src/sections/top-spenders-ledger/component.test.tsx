import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TopSpendersLedger } from './component';
import { topSpendersFixture } from './fixtures';

describe('TopSpendersLedger', () => {
  it('ranks rows by spend, largest first, regardless of the order given', () => {
    render(<TopSpendersLedger rows={[...topSpendersFixture].reverse()} />);

    const nameCells = screen.getAllByRole('row').slice(1).map((row) => row.textContent ?? '');
    expect(nameCells[0]).toContain('acme-labs');
    expect(nameCells[1]).toContain('gateway-prod');
  });

  it('labels an account row and a project row by their own scope', () => {
    render(<TopSpendersLedger rows={topSpendersFixture} />);

    expect(screen.getAllByText('Account').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Project').length).toBeGreaterThan(0);
  });

  it('carries the owning account beside a project row, never beside an account row', () => {
    render(<TopSpendersLedger rows={topSpendersFixture} />);

    expect(screen.getByText(/gateway-prod/)).toBeInTheDocument();
    expect(screen.getByText(/— northwind-ai/)).toBeInTheDocument();
  });

  it('renders the delta as a glyph plus wording, never a colour class', () => {
    render(<TopSpendersLedger rows={topSpendersFixture} />);

    expect(screen.getByText('22% vs prev period')).toBeInTheDocument();
    const deltaText = screen.getByText('22% vs prev period').closest('span');
    expect(deltaText?.className).not.toMatch(/text-error|text-success|green|red/);
  });

  it('keeps the table headers rendered over an inline status line when nothing was spent', () => {
    render(<TopSpendersLedger rows={[]} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No spend recorded across the estate this period.'
    );
  });

  it('replaces the rows with a retryable signal line on error, not with zeros', () => {
    render(<TopSpendersLedger rows={topSpendersFixture} error="Backend unreachable." onRetry={() => {}} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Backend unreachable.');
    expect(screen.queryByText('acme-labs')).not.toBeInTheDocument();
  });
});
