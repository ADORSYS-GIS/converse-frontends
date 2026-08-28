import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './component';

describe('Pagination', () => {
  it('renders the range label and current/total page count', () => {
    render(<Pagination current={2} pageCount={11} rangeLabel="9–12 / 41" onPageChange={vi.fn()} />);

    expect(screen.getByText('9–12 / 41')).toBeInTheDocument();
    expect(screen.getByText('3 / 11')).toBeInTheDocument();
  });

  it('disables Prev on the first page', () => {
    render(<Pagination current={0} pageCount={11} rangeLabel="1–4 / 41" onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('disables Next on the last page', () => {
    render(
      <Pagination current={10} pageCount={11} rangeLabel="41–41 / 41" onPageChange={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Prev' })).toBeEnabled();
  });

  it('calls onPageChange with the next index when Next is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination current={2} pageCount={11} rangeLabel="9–12 / 41" onPageChange={onPageChange} />
    );

    screen.getByRole('button', { name: 'Next' }).click();

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange with null when Prev clears back to the first page', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination current={1} pageCount={11} rangeLabel="5–8 / 41" onPageChange={onPageChange} />
    );

    screen.getByRole('button', { name: 'Prev' }).click();

    expect(onPageChange).toHaveBeenCalledWith(null);
  });
});
