import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Toggle } from './component';

describe('Toggle', () => {
  it('renders as a switch, associated with its visible label', () => {
    render(<Toggle checked={false} onCheckedChange={vi.fn()} label="Per-model breakdown" />);

    expect(screen.getByRole('switch', { name: 'Per-model breakdown' })).toBeInTheDocument();
  });

  it('reflects the checked state via aria-checked', () => {
    render(<Toggle checked onCheckedChange={vi.fn()} label="Per-model breakdown" />);

    expect(screen.getByRole('switch', { name: 'Per-model breakdown' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('calls onCheckedChange with the next state when clicked', () => {
    const onCheckedChange = vi.fn();
    render(<Toggle checked={false} onCheckedChange={onCheckedChange} label="Auto-merge" />);

    fireEvent.click(screen.getByRole('switch', { name: 'Auto-merge' }));

    // Base UI's `Switch.Root` passes a second `eventDetails` argument alongside the next
    // checked state; only the first argument is this component's contract.
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0][0]).toBe(true);
  });

  it('does not fire onCheckedChange when disabled', () => {
    const onCheckedChange = vi.fn();
    render(
      <Toggle checked={false} onCheckedChange={onCheckedChange} label="Auto-merge" disabled />
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Auto-merge' }));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('falls back to an explicit aria-label when no visible label is supplied', () => {
    render(<Toggle checked={false} onCheckedChange={vi.fn()} aria-label="Auto-merge on green" />);

    expect(screen.getByRole('switch', { name: 'Auto-merge on green' })).toBeInTheDocument();
  });
});
