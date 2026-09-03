import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountDirectory, NO_ACCOUNTS_MESSAGE } from './component';
import {
  accountDirectoryFixture,
  namedAccountRowFixture,
  unnamedAccountRowFixture,
} from './fixtures';

function props(
  overrides: Partial<React.ComponentProps<typeof AccountDirectory>> = {}
): React.ComponentProps<typeof AccountDirectory> {
  return {
    accounts: accountDirectoryFixture,
    onCreate: vi.fn(),
    onSelectAccount: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
}

describe('AccountDirectory', () => {
  it('renders one summary row per account — label, then a status/tier line', () => {
    render(<AccountDirectory {...props()} />);

    expect(screen.getByText('Widgets Ltd')).toBeInTheDocument();
    expect(screen.getByText('active · growth')).toBeInTheDocument();
    expect(screen.getByText('acct_1b77de04')).toBeInTheDocument();
  });

  it('never renders a raw account UUID as the visible label', () => {
    render(<AccountDirectory {...props()} />);

    // The unnamed fixture's own `label` is already the short `acct_<first8>` form the caller
    // resolved — the full 36-character id string never appears in this section's own output.
    expect(screen.queryByText(unnamedAccountRowFixture.id)).not.toBeInTheDocument();
  });

  it('navigates to the row that was pressed, not the first one', () => {
    const onSelectAccount = vi.fn();
    render(<AccountDirectory {...props({ onSelectAccount })} />);

    screen.getByRole('button', { name: /acct_1b77de04/ }).click();
    expect(onSelectAccount).toHaveBeenCalledWith(unnamedAccountRowFixture.id);
    expect(onSelectAccount).not.toHaveBeenCalledWith(namedAccountRowFixture.id);
  });

  it('renders a first-run EmptyState, with a working create action, for zero accounts', () => {
    const onCreate = vi.fn();
    render(<AccountDirectory {...props({ accounts: [], onCreate })} />);

    expect(screen.getByText(NO_ACCOUNTS_MESSAGE)).toBeInTheDocument();
    screen.getByRole('button', { name: 'Create account' }).click();
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('distinguishes a failed fetch from zero accounts', () => {
    render(
      <AccountDirectory {...props({ accounts: [], error: 'Could not load your accounts.' })} />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your accounts.');
    expect(screen.queryByText(NO_ACCOUNTS_MESSAGE)).not.toBeInTheDocument();
  });

  it('retries from the error line', () => {
    const onRetry = vi.fn();
    render(<AccountDirectory {...props({ accounts: [], error: 'Boom.', onRetry })} />);

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders skeleton blocks while loading, and claims nothing', () => {
    const { container } = render(
      <AccountDirectory {...props({ accounts: [], loading: true, loadingRowCount: 4 })} />
    );

    expect(container.querySelectorAll('[role="presentation"]')).toHaveLength(4);
    expect(screen.queryByText(NO_ACCOUNTS_MESSAGE)).not.toBeInTheDocument();
  });
});
