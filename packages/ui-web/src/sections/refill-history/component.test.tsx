import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RefillHistory } from './component';
import {
  refillHistoryEmpty,
  refillHistoryError,
  refillHistoryReady,
  refillHistoryUnavailable,
} from './fixtures';

describe('RefillHistory', () => {
  it('renders one row per past request, amount and status included', () => {
    render(<RefillHistory state={refillHistoryReady} />);

    expect(screen.getByText('+$12.00')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Declined')).toBeInTheDocument();
  });

  it('renders a genuine first-run EmptyState for zero requests, not InlineStatus', () => {
    render(<RefillHistory state={refillHistoryEmpty} />);

    expect(screen.getByText('No refill requests yet')).toBeInTheDocument();
  });

  it('renders a retryable error line on failure', () => {
    render(<RefillHistory state={refillHistoryError} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your refill history.');
  });

  it('renders the honest home-account-only gap for a non-home account, never a fabricated table', () => {
    render(<RefillHistory state={refillHistoryUnavailable} />);

    expect(screen.getByText(/lightbridge-authz#577/)).toBeInTheDocument();
    expect(screen.queryByText('No refill requests yet')).not.toBeInTheDocument();
  });
});
