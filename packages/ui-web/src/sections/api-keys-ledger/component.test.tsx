import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeysLedger } from './component';
import { apiKeysFixture, apiKeysNewSecret } from './fixtures';
import type { ApiKeysLedgerProps } from './types';

const baseProps: ApiKeysLedgerProps = {
  keys: apiKeysFixture,
  onDismissSecret: vi.fn(),
  onRotate: vi.fn(),
  onDelete: vi.fn(),
  onRequestRevoke: vi.fn(),
  onConfirmRevoke: vi.fn(),
  onCancelRevoke: vi.fn(),
};

describe('ApiKeysLedger', () => {
  it('renders the ledger rows from props', () => {
    render(<ApiKeysLedger {...baseProps} />);

    expect(screen.getByText('ci-deploy')).toBeInTheDocument();
    expect(screen.getByText('partner-readonly')).toBeInTheDocument();
  });

  it('renders the SecretReveal strip when secretReveal is present, and omits it otherwise', () => {
    const { rerender } = render(<ApiKeysLedger {...baseProps} secretReveal={null} />);
    expect(screen.queryByText(apiKeysNewSecret.heading)).not.toBeInTheDocument();

    rerender(<ApiKeysLedger {...baseProps} secretReveal={apiKeysNewSecret} />);

    expect(screen.getByText(apiKeysNewSecret.heading)).toBeInTheDocument();
    expect(screen.getByDisplayValue(apiKeysNewSecret.secret)).toBeInTheDocument();
  });

  it('fires onDismissSecret from the strip close control', () => {
    const onDismissSecret = vi.fn();
    render(
      <ApiKeysLedger
        {...baseProps}
        secretReveal={apiKeysNewSecret}
        onDismissSecret={onDismissSecret}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onDismissSecret).toHaveBeenCalledTimes(1);
  });

  it('renders the compact-tier trigger slot in the table toolbar', () => {
    render(<ApiKeysLedger {...baseProps} toolbarActions={<button type="button">Open filters</button>} />);

    expect(screen.getByRole('button', { name: 'Open filters' })).toBeInTheDocument();
  });

  describe('revoke gating flow', () => {
    it('opens the typed-confirm dialog and keeps the primary disabled until the name matches exactly', () => {
      const row = apiKeysFixture[0];
      const { rerender } = render(<ApiKeysLedger {...baseProps} revokeTarget={undefined} />);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      rerender(<ApiKeysLedger {...baseProps} revokeTarget={{ row }} />);
      const dialog = screen.getByRole('alertdialog');
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
      render(
        <ApiKeysLedger {...baseProps} revokeTarget={{ row }} onConfirmRevoke={onConfirmRevoke} />
      );

      const dialog = screen.getByRole('alertdialog');
      fireEvent.change(within(dialog).getByLabelText(`Type "${row.name}" to confirm`), {
        target: { value: row.name },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));

      expect(onConfirmRevoke).toHaveBeenCalledWith(row);
    });

    it('keeps the dialog open and surfaces an inline error when the confirmed revoke fails', () => {
      const row = apiKeysFixture[0];
      render(
        <ApiKeysLedger {...baseProps} revokeTarget={{ row, error: 'Revoke failed. Try again.' }} />
      );

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Revoke failed. Try again.');
    });

    it('fires onCancelRevoke on Cancel', () => {
      const row = apiKeysFixture[0];
      const onCancelRevoke = vi.fn();
      render(
        <ApiKeysLedger {...baseProps} revokeTarget={{ row }} onCancelRevoke={onCancelRevoke} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancelRevoke).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an inline empty status above the still-rendered ledger header when there are no keys', () => {
    render(<ApiKeysLedger {...baseProps} keys={[]} />);

    expect(
      screen.getByText('No keys in this project yet. Create one from the right.')
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  });

  it('renders an ErrorLine with Retry on error', () => {
    const onRetry = vi.fn();
    render(
      <ApiKeysLedger {...baseProps} keys={[]} error="Failed to load keys." onRetry={onRetry} />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load keys.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
