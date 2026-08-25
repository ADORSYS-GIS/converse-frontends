import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeysPage } from './component';
import { apiKeysFixture, apiKeysHygiene, apiKeysNavItems, apiKeysScopeAccounts, apiKeysScopeProjects, apiKeysScopeSelectValue, apiKeysStatusFilterOptions } from './fixtures';
import type { ApiKeysPageProps } from './types';

const baseProps: ApiKeysPageProps = {
  header: <div>Header</div>,
  nav: { items: apiKeysNavItems },
  scope: { accountLabel: 'adorsys-gis', projectLabel: 'gateway-prod' },
  keys: apiKeysFixture,
  onDismissSecret: vi.fn(),
  onRotate: vi.fn(),
  onDelete: vi.fn(),
  onRequestRevoke: vi.fn(),
  onConfirmRevoke: vi.fn(),
  onCancelRevoke: vi.fn(),
  onCreateKey: vi.fn(),
  scopeSelect: {
    accounts: apiKeysScopeAccounts,
    projects: apiKeysScopeProjects,
    value: apiKeysScopeSelectValue,
    onChange: vi.fn(),
  },
  statusFilterOptions: apiKeysStatusFilterOptions,
  statusFilterValue: 'all',
  onStatusFilterChange: vi.fn(),
  search: '',
  onSearchChange: vi.fn(),
  hygiene: apiKeysHygiene,
};

describe('ApiKeysPage', () => {
  it('renders the ledger rows from props', () => {
    render(<ApiKeysPage {...baseProps} />);

    expect(screen.getByText('ci-deploy')).toBeInTheDocument();
    expect(screen.getByText('partner-readonly')).toBeInTheDocument();
  });

  it('fires onCreateKey from the right-rail CTA', () => {
    const onCreateKey = vi.fn();
    render(<ApiKeysPage {...baseProps} onCreateKey={onCreateKey} />);

    // New key renders twice — once in the persistent `lg` rail, once as a visible primary in
    // the compact-tier title row (console-ui skill "Shape and layout", 2026-08-25 revision:
    // "New key stays a visible primary in the title row at compact") — both fire the same prop.
    const buttons = screen.getAllByRole('button', { name: '+ New key' });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(onCreateKey).toHaveBeenCalledTimes(1);
  });

  it('renders the SecretReveal strip when secretReveal is present, and omits it otherwise', () => {
    const { rerender } = render(<ApiKeysPage {...baseProps} secretReveal={null} />);
    expect(screen.queryByText('New key created — shown once')).not.toBeInTheDocument();

    rerender(
      <ApiKeysPage
        {...baseProps}
        secretReveal={{ heading: 'New key created — shown once', description: 'Copy it now.', secret: 'sk-lb-test' }}
      />,
    );
    expect(screen.getByText('New key created — shown once')).toBeInTheDocument();
    expect(screen.getByDisplayValue('sk-lb-test')).toBeInTheDocument();
  });

  it('fires onDismissSecret from the strip close control', () => {
    const onDismissSecret = vi.fn();
    render(
      <ApiKeysPage
        {...baseProps}
        secretReveal={{ heading: 'New key created — shown once', description: 'Copy it now.', secret: 'sk-lb-test' }}
        onDismissSecret={onDismissSecret}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismissSecret).toHaveBeenCalledTimes(1);
  });

  describe('revoke gating flow', () => {
    it('opens the typed-confirm dialog via onRequestRevoke and keeps the primary disabled until the name matches exactly', () => {
      const row = apiKeysFixture[0];
      const { rerender } = render(<ApiKeysPage {...baseProps} revokeTarget={undefined} />);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      rerender(<ApiKeysPage {...baseProps} revokeTarget={{ row }} />);
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText(`Revoke ${row.name}?`)).toBeInTheDocument();

      const confirmButton = within(dialog).getByRole('button', { name: 'Revoke' });
      expect(confirmButton).toBeDisabled();

      const input = within(dialog).getByLabelText(`Type "${row.name}" to confirm`);
      fireEvent.change(input, { target: { value: 'wrong-name' } });
      expect(confirmButton).toBeDisabled();

      fireEvent.change(input, { target: { value: row.name } });
      expect(confirmButton).toBeEnabled();
    });

    it('fires onConfirmRevoke with the row once the typed name matches', () => {
      const row = apiKeysFixture[0];
      const onConfirmRevoke = vi.fn();
      render(<ApiKeysPage {...baseProps} revokeTarget={{ row }} onConfirmRevoke={onConfirmRevoke} />);

      const dialog = screen.getByRole('alertdialog');
      const input = within(dialog).getByLabelText(`Type "${row.name}" to confirm`);
      fireEvent.change(input, { target: { value: row.name } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));

      expect(onConfirmRevoke).toHaveBeenCalledWith(row);
    });

    it('keeps the dialog open and surfaces an inline error when the confirmed revoke fails', () => {
      const row = apiKeysFixture[0];
      render(<ApiKeysPage {...baseProps} revokeTarget={{ row, error: 'Revoke failed. Try again.' }} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Revoke failed. Try again.');
    });

    it('fires onCancelRevoke on Cancel', () => {
      const row = apiKeysFixture[0];
      const onCancelRevoke = vi.fn();
      render(<ApiKeysPage {...baseProps} revokeTarget={{ row }} onCancelRevoke={onCancelRevoke} />);

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancelRevoke).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an inline empty status above the still-rendered ledger header when there are no keys', () => {
    render(<ApiKeysPage {...baseProps} keys={[]} />);

    expect(screen.getByText('No keys in this project yet. Create one from the right.')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'NAME' })).toBeInTheDocument();
  });

  it('renders an ErrorLine with Retry on error', () => {
    const onRetry = vi.fn();
    render(<ApiKeysPage {...baseProps} keys={[]} error="Failed to load keys." onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load keys.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // Compact-tier contextual sheet triggers (console-ui skill "Shape and layout", 2026-08-25
  // revision) — no persistent right-rail footer/peek bar; SCOPE and FILTERS are each reached
  // via a trigger placed in context, opening only that one rail section as a SectionSheet.
  describe('compact-tier contextual sheet triggers', () => {
    it('opens the SCOPE sheet from the trigger beside the title subtitle', () => {
      render(<ApiKeysPage {...baseProps} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Open scope' }));

      const dialog = screen.getByRole('dialog', { name: 'SCOPE' });
      expect(within(dialog).getByLabelText('Account')).toBeInTheDocument();
    });

    it('opens the FILTERS sheet from the trigger in the table toolbar row', () => {
      render(<ApiKeysPage {...baseProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));

      const dialog = screen.getByRole('dialog', { name: 'FILTERS' });
      expect(within(dialog).getByLabelText('Search')).toBeInTheDocument();
    });

    it('dismisses a sheet via its close control', () => {
      render(<ApiKeysPage {...baseProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));
      expect(screen.getByRole('dialog', { name: 'FILTERS' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
