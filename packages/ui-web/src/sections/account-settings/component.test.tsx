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
  it('renders the account panel and the read-only facts around it', () => {
    render(<AccountSettings {...props()} />);

    expect(screen.getByText('Widgets Ltd')).toBeInTheDocument();
    expect(screen.getByText('Account id')).toBeInTheDocument();
    // Twice on this screen by design: the panel keeps the id beside the name, and the row below
    // is the addressable, copyable one.
    expect(screen.getAllByText(accountDetailsFixture.id)).toHaveLength(2);
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
    render(
      <AccountSettings
        {...props({ panel: unnamedAccountPanelFixture, details: accountDetailsNoQuotaFixture })}
      />
    );

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
    // The id itself is still on screen — it is the only way to address an account.
    expect(screen.getAllByText(accountDetailsFixture.id).length).toBeGreaterThan(0);
  });

  it('omits the fact rows entirely when there is no account to describe', () => {
    render(<AccountSettings {...props({ panel: noAccountPanelFixture, details: null })} />);

    // A row reading "Status —" would claim a fourth state next to the panel's three.
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
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
});
