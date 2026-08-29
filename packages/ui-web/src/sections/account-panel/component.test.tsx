import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountPanel, UNNAMED_ACCOUNT_LABEL } from './component';

function baseProps(
  overrides: Partial<React.ComponentProps<typeof AccountPanel>> = {}
): React.ComponentProps<typeof AccountPanel> {
  return {
    account: { id: 'auth0|9f3a2c', name: 'Widgets Ltd' },
    loading: false,
    onCreate: vi.fn(),
    onRename: vi.fn(),
    ...overrides,
  };
}

describe('AccountPanel', () => {
  it('renders a named account and keeps its id visible beside the name', () => {
    render(<AccountPanel {...baseProps()} />);

    expect(screen.getByText('Widgets Ltd')).toBeInTheDocument();
    expect(screen.getByText('auth0|9f3a2c')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  describe('an account with name === null', () => {
    it('names the absence instead of rendering an empty string or the id', () => {
      render(<AccountPanel {...baseProps({ account: { id: 'auth0|9f3a2c', name: null } })} />);

      expect(screen.getByText(UNNAMED_ACCOUNT_LABEL)).toBeInTheDocument();
      // The id is still shown — but as the id, in its own slot, never standing in for the name.
      expect(screen.getByText('auth0|9f3a2c')).toBeInTheDocument();
      expect(screen.getByText(/never been named/i)).toBeInTheDocument();
    });

    it('offers "Name this account", not "Rename" — there is nothing to re-name', () => {
      render(<AccountPanel {...baseProps({ account: { id: 'auth0|9f3a2c', name: null } })} />);

      expect(screen.getByRole('button', { name: 'Name this account' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
    });

    it('styles the placeholder as absence, not as a value', () => {
      const { rerender } = render(<AccountPanel {...baseProps()} />);
      expect(screen.getByText('Widgets Ltd')).toHaveAttribute('data-named', 'true');

      rerender(<AccountPanel {...baseProps({ account: { id: 'auth0|9f3a2c', name: null } })} />);
      expect(screen.getByText(UNNAMED_ACCOUNT_LABEL)).toHaveAttribute('data-named', 'false');
    });

    it('fires onRename from the naming affordance', () => {
      const onRename = vi.fn();
      render(<AccountPanel {...baseProps({ account: { id: 'a', name: null }, onRename })} />);

      screen.getByRole('button', { name: 'Name this account' }).click();
      expect(onRename).toHaveBeenCalledTimes(1);
    });
  });

  describe('no account at all', () => {
    it('offers a way out of the dead end instead of an empty screen', () => {
      render(<AccountPanel {...baseProps({ account: null })} />);

      expect(screen.getByText(/do not have an account yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
    });

    it('is an inline status line, never a centred placard', () => {
      render(<AccountPanel {...baseProps({ account: null })} />);
      expect(screen.getByRole('status')).toHaveTextContent(/do not have an account yet/i);
    });

    it('fires onCreate', () => {
      const onCreate = vi.fn();
      render(<AccountPanel {...baseProps({ account: null, onCreate })} />);

      screen.getByRole('button', { name: 'Create account' }).click();
      expect(onCreate).toHaveBeenCalledTimes(1);
    });

    it('disables creation with a stated reason rather than failing on submit', () => {
      render(
        <AccountPanel
          {...baseProps({
            account: null,
            createDisabled: true,
            createReason: 'Sign in to create an account.',
          })}
        />
      );

      expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
      expect(screen.getByText('Sign in to create an account.')).toBeInTheDocument();
    });
  });

  it('distinguishes a failed fetch from a known-absent account', () => {
    render(
      <AccountPanel {...baseProps({ account: null, error: 'Could not load your account.' })} />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your account.');
    // "unknown" must never be rendered as "you have no account" — that would invite a
    // `createAccount` call from someone who already has one.
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
  });

  it('fires onRetry from the error line', () => {
    const onRetry = vi.fn();
    render(<AccountPanel {...baseProps({ account: null, error: 'Boom.', onRetry })} />);

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('claims nothing while the account is still loading', () => {
    render(<AccountPanel {...baseProps({ account: null, loading: true })} />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading your account/i);
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
  });
});
