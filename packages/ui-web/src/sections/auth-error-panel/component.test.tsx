import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthErrorPanel } from './component';
import { authErrorPanelMessage, authErrorPanelRetryHref } from './fixtures';

describe('AuthErrorPanel', () => {
  it('renders the default sentence-case message as an alert', () => {
    render(<AuthErrorPanel />);

    expect(screen.getByRole('alert')).toHaveTextContent(authErrorPanelMessage);
  });

  it('renders a custom message when given', () => {
    render(<AuthErrorPanel message="adorsys-gis declined the sign-in request." />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'adorsys-gis declined the sign-in request.'
    );
  });

  it('omits the retry link when no retryHref is given', () => {
    render(<AuthErrorPanel />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a plain link, not a button, when retryHref is given', () => {
    render(<AuthErrorPanel retryHref={authErrorPanelRetryHref} />);

    const link = screen.getByRole('link', { name: 'Start over' });
    expect(link).toHaveAttribute('href', authErrorPanelRetryHref);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('accepts a custom retry label', () => {
    render(<AuthErrorPanel retryHref={authErrorPanelRetryHref} retryLabel="Try again" />);

    expect(screen.getByRole('link', { name: 'Try again' })).toBeInTheDocument();
  });
});
