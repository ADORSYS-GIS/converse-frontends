import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from './component';
import type { SegmentedOption } from './types';

const options: SegmentedOption<'all' | 'active' | 'revoked'>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
];

describe('SegmentedControl', () => {
  it('exposes radiogroup semantics with one checked radio', () => {
    render(<SegmentedControl aria-label="Status filter" options={options} value="active" onChange={() => {}} />);

    expect(screen.getByRole('radiogroup', { name: 'Status filter' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Active' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Revoked' })).toHaveAttribute('aria-checked', 'false');
  });

  it('only the active cell is tab-reachable (roving tabindex)', () => {
    render(<SegmentedControl aria-label="Status filter" options={options} value="active" onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: 'Active' })).toHaveAttribute('tabIndex', '0');
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('tabIndex', '-1');
    expect(screen.getByRole('radio', { name: 'Revoked' })).toHaveAttribute('tabIndex', '-1');
  });

  it('calls onChange when a cell is clicked', () => {
    const handleChange = vi.fn();
    render(<SegmentedControl aria-label="Status filter" options={options} value="all" onChange={handleChange} />);

    screen.getByRole('radio', { name: 'Revoked' }).click();
    expect(handleChange).toHaveBeenCalledWith('revoked');
  });

  it('moves selection to the next option on ArrowRight and wraps at the end', () => {
    const handleChange = vi.fn();
    render(<SegmentedControl aria-label="Status filter" options={options} value="revoked" onChange={handleChange} />);

    const revoked = screen.getByRole('radio', { name: 'Revoked' });
    revoked.focus();
    fireEvent.keyDown(revoked, { key: 'ArrowRight' });

    expect(handleChange).toHaveBeenCalledWith('all');
  });

  it('moves selection to the previous option on ArrowLeft and wraps at the start', () => {
    const handleChange = vi.fn();
    render(<SegmentedControl aria-label="Status filter" options={options} value="all" onChange={handleChange} />);

    const all = screen.getByRole('radio', { name: 'All' });
    all.focus();
    fireEvent.keyDown(all, { key: 'ArrowLeft' });

    expect(handleChange).toHaveBeenCalledWith('revoked');
  });
});
