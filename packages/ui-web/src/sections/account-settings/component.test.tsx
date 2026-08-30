import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import { AccountSettings } from './component';
import {
  accountDetailsFixture,
  accountDetailsNoQuotaFixture,
  namedAccountPanelFixture,
  noAccountPanelFixture,
  unnamedAccountPanelFixture,
} from './fixtures';

function props(
  overrides: Partial<React.ComponentProps<typeof AccountSettings>> = {}
): React.ComponentProps<typeof AccountSettings> {
  return {
    panel: namedAccountPanelFixture,
    details: accountDetailsFixture,
    onCopyId: vi.fn(),
    ...overrides,
  };
}

describe('AccountSettings', () => {
  it('renders one Card, with Rename in its header and the facts as a definition grid', () => {
    render(<AccountSettings {...props()} />);

    expect(screen.getByText('Widgets Ltd')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
    expect(screen.getByText('Account id')).toBeInTheDocument();
    // The id renders exactly once now — Copy sits beside it, and the Card header no longer
    // echoes it a second time the way the deleted `AccountPanel` did.
    expect(screen.getAllByText(accountDetailsFixture.id)).toHaveLength(1);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('Default quota tier')).toBeInTheDocument();
    expect(screen.getByText('growth')).toBeInTheDocument();
  });

  it('renders the status as text, never as a pill or badge element', () => {
    const { container } = render(<AccountSettings {...props()} />);

    expect(screen.getByText('active').tagName).toBe('DD');
    expect(container.querySelector('.badge')).toBeNull();
  });

  it('names an unassigned quota tier rather than printing a zero or an em dash', () => {
    render(<AccountSettings {...props({ details: accountDetailsNoQuotaFixture })} />);

    expect(screen.getByText(NO_QUOTA_TIER_LABEL)).toBeInTheDocument();
  });

  it('copies the account id through the caller, never through the clipboard itself', () => {
    const onCopyId = vi.fn();
    render(<AccountSettings {...props({ onCopyId })} />);

    screen.getByRole('button', { name: 'Copy account id' }).click();
    expect(onCopyId).toHaveBeenCalledWith(accountDetailsFixture.id);
  });

  it('drops the copy affordance rather than rendering a dead button', () => {
    render(<AccountSettings {...props({ onCopyId: undefined })} />);

    expect(screen.queryByRole('button', { name: 'Copy account id' })).not.toBeInTheDocument();
    expect(screen.getAllByText(accountDetailsFixture.id).length).toBeGreaterThan(0);
  });

  it('restyles the no-account prompt as an EmptyState block, with no dead Rename in the header', () => {
    render(<AccountSettings {...props({ panel: noAccountPanelFixture, details: null })} />);

    expect(screen.getByText('No account yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
    // A row reading "Status —" would claim a fourth state next to the panel's three.
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('restyles the never-named prompt as an EmptyState block with the naming CTA', () => {
    render(
      <AccountSettings
        {...props({ panel: unnamedAccountPanelFixture, details: accountDetailsNoQuotaFixture })}
      />
    );

    expect(screen.getByText('Unnamed account')).toBeInTheDocument();
    expect(
      screen.getByText('This account has never been named, so it shows as its id across the console.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Name this account' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
  });

  it('preserves the panel’s three distinct states — loading is not "no account"', () => {
    const { rerender } = render(
      <AccountSettings
        {...props({ panel: { ...noAccountPanelFixture, loading: true }, details: null })}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent(/loading your account/i);
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();

    rerender(
      <AccountSettings
        {...props({
          panel: { ...noAccountPanelFixture, error: 'Could not load your account.' },
          details: null,
        })}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your account.');
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
  });

  it('names the region distinctly from the Card’s own "Account" title', () => {
    render(<AccountSettings {...props()} />);

    expect(screen.getByRole('region', { name: 'Account settings' })).toBeInTheDocument();
  });
});
