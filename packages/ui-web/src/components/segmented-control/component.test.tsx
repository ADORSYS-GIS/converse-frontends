import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from './component';
import type { SegmentedOption } from './types';

const options: SegmentedOption<'all' | 'active' | 'revoked'>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
];

describe('SegmentedControl', () => {
  it('exposes a named group with one pressed toggle button', () => {
    render(<SegmentedControl aria-label="Status filter" options={options} value="active" onChange={() => {}} />);

    expect(screen.getByRole('group', { name: 'Status filter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Revoked' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange when a cell is clicked', () => {
    const handleChange = vi.fn();
    render(<SegmentedControl aria-label="Status filter" options={options} value="all" onChange={handleChange} />);

    screen.getByRole('button', { name: 'Revoked' }).click();
    expect(handleChange).toHaveBeenCalledWith('revoked');
  });

  it('does not call onChange when the already-active cell is clicked (no empty selection)', () => {
    const handleChange = vi.fn();
    render(<SegmentedControl aria-label="Status filter" options={options} value="active" onChange={handleChange} />);

    screen.getByRole('button', { name: 'Active' }).click();

    expect(handleChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves keyboard focus between cells with the arrow keys (Base UI composite roving focus)', async () => {
    render(<SegmentedControl aria-label="Status filter" options={options} value="all" onChange={() => {}} />);

    const all = screen.getByRole('button', { name: 'All' });
    const active = screen.getByRole('button', { name: 'Active' });
    all.focus();
    expect(all).toHaveFocus();

    fireEvent.keyDown(all, { key: 'ArrowRight' });
    await waitFor(() => expect(active).toHaveFocus());
  });

  it('renders the 2px signal underline only on the active cell', () => {
    const { container } = render(
      <SegmentedControl aria-label="Status filter" options={options} value="active" onChange={() => {}} />,
    );

    expect(container.querySelectorAll('.bg-primary')).toHaveLength(1);
  });
});
