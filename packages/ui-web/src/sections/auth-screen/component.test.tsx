import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthScreen } from './component';

describe('AuthScreen', () => {
  it('renders the wordmark, page title and one primary sign-in button', () => {
    render(<AuthScreen onSignIn={() => {}} />);

    expect(screen.getByText('LIGHTBRIDGE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in to Lightbridge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to sign in' })).toBeInTheDocument();
  });

  it('fires onSignIn when the primary button is pressed', () => {
    const onSignIn = vi.fn();
    render(<AuthScreen onSignIn={onSignIn} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue to sign in' }));

    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('does not render a signed-out status line by default', () => {
    render(<AuthScreen onSignIn={() => {}} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the signed-out status line above the button, not a modal or toast', () => {
    render(
      <AuthScreen
        onSignIn={() => {}}
        signedOutMessage="Your session ended · signed out 2 minutes ago"
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Your session ended · signed out 2 minutes ago'
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mutes the button and swaps its label while redirecting, with no spinner', () => {
    render(<AuthScreen onSignIn={() => {}} status="redirecting" />);

    const button = screen.getByRole('button', { name: 'Redirecting…' });
    expect(button).toBeDisabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders exactly one control on callback error -- the primary button relabelled "Try again"', () => {
    const onRetry = vi.fn();
    render(
      <AuthScreen
        onSignIn={() => {}}
        status="error"
        errorMessage="adorsys-gis declined the sign-in request."
        onRetry={onRetry}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('adorsys-gis declined the sign-in request.');
    // Never a nested Retry ghost button inside the ErrorLine itself -- that would be a second
    // control duplicating the primary button below it.
    expect(within(alert).queryByRole('button')).not.toBeInTheDocument();

    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('places the error message above the primary button in document order', () => {
    render(<AuthScreen onSignIn={() => {}} status="error" errorMessage="Sign-in failed." />);

    const alert = screen.getByRole('alert');
    const button = screen.getByRole('button', { name: 'Try again' });
    expect(alert.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('falls back to onSignIn when no onRetry is given on callback error', () => {
    const onSignIn = vi.fn();
    render(<AuthScreen onSignIn={onSignIn} status="error" />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('falls back to a default sentence when no errorMessage is given', () => {
    render(<AuthScreen onSignIn={() => {}} status="error" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in failed. Please try again.');
  });

  it('omits the support link when no supportHref is given', () => {
    render(<AuthScreen onSignIn={() => {}} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a subtle support link under the primary control when supportHref is given', () => {
    render(<AuthScreen onSignIn={() => {}} supportHref="https://docs.example.com/sign-in" />);

    const link = screen.getByRole('link', { name: 'Need help signing in?' });
    expect(link).toHaveAttribute('href', 'https://docs.example.com/sign-in');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('falls back to the wordmark when no logoSrc is given', () => {
    render(<AuthScreen onSignIn={() => {}} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('LIGHTBRIDGE')).toBeInTheDocument();
  });
});
