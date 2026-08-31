import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RefillPolicyManual } from './component';

describe('RefillPolicyManual', () => {
  it('renders the trigger and hides the prose when closed', () => {
    render(<RefillPolicyManual open={false} onOpenChange={vi.fn()} />);

    expect(screen.getByText('How refill policies work')).toBeInTheDocument();
    expect(screen.queryByText(/versioned rule data/)).not.toBeInTheDocument();
  });

  it('renders the prose and the lifecycle stages when open', () => {
    render(<RefillPolicyManual open onOpenChange={vi.fn()} />);

    expect(screen.getByText(/versioned rule data/)).toBeInTheDocument();
    expect(screen.getByText('Author')).toBeInTheDocument();
    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Evaluate')).toBeInTheDocument();
    expect(screen.getByText('Approve / Queue')).toBeInTheDocument();
  });

  it('fires onOpenChange from the trigger', () => {
    const onOpenChange = vi.fn();
    render(<RefillPolicyManual open={false} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'How refill policies work' }));

    // Base UI's Collapsible passes a second `eventDetails` argument alongside the boolean —
    // only the boolean is this component's own contract.
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.calls[0][0]).toBe(true);
  });
});
