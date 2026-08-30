import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import { InspectorSettingsPanel } from './component';
import { inspectorSettingsAccount, inspectorSettingsUnnamedAccount } from './fixtures';

function props(
  overrides: Partial<React.ComponentProps<typeof InspectorSettingsPanel>> = {}
): React.ComponentProps<typeof InspectorSettingsPanel> {
  return {
    account: inspectorSettingsAccount,
    loading: false,
    onRetry: vi.fn(),
    onRename: vi.fn(),
    onCopyId: vi.fn(),
    onNewAccount: vi.fn(),
    onNewProject: vi.fn(),
    onRequestRefill: vi.fn(),
    ...overrides,
  };
}

describe('InspectorSettingsPanel', () => {
  it('titles the panel with the scoped account label and renders its rows', () => {
    render(<InspectorSettingsPanel {...props()} />);

    expect(screen.getAllByText('adorsys-gis').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
    expect(screen.getByText('Account id')).toBeInTheDocument();
    expect(screen.getByText('acct_9f3a2b1c')).toBeInTheDocument();
    // IA v3 phase 2: this panel is now the one standing place the scoped account's status is
    // visible, following `AccountSettings`/`/settings/account`'s retirement.
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('growth')).toBeInTheDocument();
  });

  it('renders an unnamed account as a named absence with a naming action, never the raw id', () => {
    render(<InspectorSettingsPanel {...props({ account: inspectorSettingsUnnamedAccount })} />);

    expect(screen.getByText('Not set')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Name this account' })).toBeInTheDocument();
    expect(screen.getByText(NO_QUOTA_TIER_LABEL)).toBeInTheDocument();
  });

  it('offers a way out even with no account', () => {
    render(<InspectorSettingsPanel {...props({ account: null })} />);

    expect(screen.getByText('You do not have an account yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ New account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ New project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request refill…' })).toBeInTheDocument();
  });

  it('shows a loading status while the account is resolving, not a stale row set', () => {
    render(<InspectorSettingsPanel {...props({ account: null, loading: true })} />);

    expect(screen.getByText('Loading your account…')).toBeInTheDocument();
  });

  it('shows a genuine fetch failure through ErrorLine, with retry', () => {
    const onRetry = vi.fn();
    render(
      <InspectorSettingsPanel
        {...props({ account: null, error: 'Could not load your account.', onRetry })}
      />
    );

    expect(screen.getByText('Could not load your account.')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(onRetry).toHaveBeenCalled();
  });

  it('copies the account id through the caller, never through the clipboard itself', () => {
    const onCopyId = vi.fn();
    render(<InspectorSettingsPanel {...props({ onCopyId })} />);

    screen.getByRole('button', { name: 'Copy account id' }).click();
    expect(onCopyId).toHaveBeenCalledWith('acct_9f3a2b1c');
  });

  it('wires the standing New account, New project and Request refill rows to their own triggers', () => {
    const onNewAccount = vi.fn();
    const onNewProject = vi.fn();
    const onRequestRefill = vi.fn();
    render(<InspectorSettingsPanel {...props({ onNewAccount, onNewProject, onRequestRefill })} />);

    screen.getByRole('button', { name: '+ New account' }).click();
    expect(onNewAccount).toHaveBeenCalled();

    screen.getByRole('button', { name: '+ New project' }).click();
    expect(onNewProject).toHaveBeenCalled();

    screen.getByRole('button', { name: 'Request refill…' }).click();
    expect(onRequestRefill).toHaveBeenCalled();
  });
});
