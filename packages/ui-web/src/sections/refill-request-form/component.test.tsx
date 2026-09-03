import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RefillRequestForm } from './component';
import {
  refillFormEmpty,
  refillFormError,
  refillFormLoading,
  refillFormReady,
  refillFormSubmitError,
  refillFormUnavailable,
} from './fixtures';

describe('RefillRequestForm', () => {
  it('fires onSubmit from the primary action once an amount is selected', () => {
    const onSubmit = vi.fn();
    render(<RefillRequestForm state={{ ...refillFormReady, onSubmit }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Request refill' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the submit action while submitting, and shows the pending label', () => {
    render(
      <RefillRequestForm state={{ ...refillFormReady, submitting: true, canSubmit: false }} />
    );

    expect(screen.getByRole('button', { name: 'Requesting…' })).toBeDisabled();
  });

  it('surfaces a submit-time error inline without leaving the form', () => {
    render(<RefillRequestForm state={refillFormSubmitError} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The request could not be sent — try again.'
    );
    expect(screen.getByRole('button', { name: 'Request refill' })).toBeInTheDocument();
  });

  it('renders the honest home-account-only gap instead of a ladder for a non-home account', () => {
    render(<RefillRequestForm state={refillFormUnavailable} />);

    expect(screen.getByText(/lightbridge-authz#577/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request refill' })).not.toBeInTheDocument();
  });

  it('renders the empty-policy caption rather than an amount select with no options', () => {
    render(<RefillRequestForm state={refillFormEmpty} />);

    expect(
      screen.getByText('The active refill policy currently offers no amount for this account.')
    ).toBeInTheDocument();
  });

  it('renders a retryable error line for a failed ladder fetch', () => {
    const onRetry = vi.fn();
    render(<RefillRequestForm state={{ ...refillFormError, onRetry }} />);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders a loading skeleton, never a fabricated amount', () => {
    render(<RefillRequestForm state={refillFormLoading} />);

    expect(screen.queryByRole('button', { name: 'Request refill' })).not.toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });
});
