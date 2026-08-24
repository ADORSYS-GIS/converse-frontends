import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorLine } from './component';

describe('ErrorLine', () => {
  it('renders the message in the signal colour', () => {
    render(<ErrorLine message="Failed to load usage." />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('text-primary');
    expect(alert).toHaveTextContent('Failed to load usage.');
  });

  it('renders a Retry ghost button when onRetry is given', () => {
    const onRetry = vi.fn();
    render(<ErrorLine message="Failed to load usage." onRetry={onRetry} />);

    const retry = screen.getByRole('button', { name: 'Retry' });
    retry.click();

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry button when onRetry is not given', () => {
    render(<ErrorLine message="That's not a valid provider response." />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('supports a custom retry label', () => {
    render(<ErrorLine message="Query failed." onRetry={() => {}} retryLabel="Try again" />);

    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
