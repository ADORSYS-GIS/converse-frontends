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
  onRequestRevoke: vi.fn(),
  onConfirmRevoke: vi.fn(),
  onCancelRevoke: vi.fn(),
  isAdmin: true,
  onRequestDelete: vi.fn(),
  onConfirmDelete: vi.fn(),
  onCancelDelete: vi.fn(),
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

  describe('delete gating flow (ticket #321)', () => {
    it('does not delete on a single click — it only requests confirmation', () => {
      const row = apiKeysFixture[0];
      const onRequestDelete = vi.fn();
      const onConfirmDelete = vi.fn();
      render(
        <ApiKeysLedger
          {...baseProps}
          onRequestDelete={onRequestDelete}
          onConfirmDelete={onConfirmDelete}
        />
      );

      const group = screen.getByRole('group', { name: `${row.name} actions` });
      fireEvent.click(within(group).getByRole('button', { name: 'Del' }));

      expect(onRequestDelete).toHaveBeenCalledWith(row);
      expect(onConfirmDelete).not.toHaveBeenCalled();
    });

    it('opens the typed-confirm dialog and keeps the primary disabled until the name matches exactly', () => {
      const row = apiKeysFixture[0];
      const { rerender } = render(<ApiKeysLedger {...baseProps} deleteTarget={undefined} />);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      rerender(<ApiKeysLedger {...baseProps} deleteTarget={{ row }} />);
      const dialog = screen.getByRole('alertdialog');
      expect(within(dialog).getByText(`Delete ${row.name}?`)).toBeInTheDocument();

      const confirmButton = within(dialog).getByRole('button', { name: 'Delete' });
      expect(confirmButton).toBeDisabled();

      const input = within(dialog).getByLabelText(`Type "${row.name}" to confirm`);
      fireEvent.change(input, { target: { value: 'wrong-name' } });
      expect(confirmButton).toBeDisabled();

      fireEvent.change(input, { target: { value: row.name } });
      expect(confirmButton).toBeEnabled();
    });

    it('fires onConfirmDelete with the row only once the typed name matches exactly', () => {
      const row = apiKeysFixture[0];
      const onConfirmDelete = vi.fn();
      render(
        <ApiKeysLedger {...baseProps} deleteTarget={{ row }} onConfirmDelete={onConfirmDelete} />
      );

      const dialog = screen.getByRole('alertdialog');
      const confirmButton = within(dialog).getByRole('button', { name: 'Delete' });
      const input = within(dialog).getByLabelText(`Type "${row.name}" to confirm`);

      // A near-miss must not enable the destructive action — this is the whole point of the gate.
      fireEvent.change(input, { target: { value: `${row.name}!` } });
      fireEvent.click(confirmButton);
      expect(onConfirmDelete).not.toHaveBeenCalled();

      fireEvent.change(input, { target: { value: row.name } });
      fireEvent.click(confirmButton);
      expect(onConfirmDelete).toHaveBeenCalledWith(row);
    });

    it('keeps the dialog open and surfaces an inline error when the confirmed delete fails', () => {
      const row = apiKeysFixture[0];
      render(
        <ApiKeysLedger {...baseProps} deleteTarget={{ row, error: 'Delete failed. Try again.' }} />
      );

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Delete failed. Try again.');
    });

    it('fires onCancelDelete on Cancel', () => {
      const row = apiKeysFixture[0];
      const onCancelDelete = vi.fn();
      render(
        <ApiKeysLedger {...baseProps} deleteTarget={{ row }} onCancelDelete={onCancelDelete} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancelDelete).toHaveBeenCalledTimes(1);
    });

    it('is reachable for a revoked key — ADR 0003 makes delete the cleanup step after revoke, not blocked by it', () => {
      const revoked = apiKeysFixture.find((row) => row.status === 'revoked');
      expect(revoked).toBeDefined();
      const onRequestDelete = vi.fn();
      render(<ApiKeysLedger {...baseProps} onRequestDelete={onRequestDelete} />);

      const group = screen.getByRole('group', { name: `${revoked!.name} actions` });
      const delButton = within(group).getByRole('button', { name: 'Del' });

      expect(delButton).toBeEnabled();
      fireEvent.click(delButton);
      expect(onRequestDelete).toHaveBeenCalledWith(revoked);
    });

    it('is unavailable to a non-admin — omitted, not shown disabled with no explanation', () => {
      render(<ApiKeysLedger {...baseProps} isAdmin={false} />);

      // Rotate and Revoke stay reachable; only the admin-gated Delete action disappears.
      const group = screen.getByRole('group', { name: `${apiKeysFixture[0].name} actions` });
      expect(within(group).getByRole('button', { name: 'Rotate' })).toBeInTheDocument();
      expect(within(group).getByRole('button', { name: 'Revoke' })).toBeInTheDocument();
      expect(within(group).queryByRole('button', { name: 'Del' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Del' })).not.toBeInTheDocument();
    });
  });

  it('shows an inline empty status above the still-rendered ledger header when there are no keys', () => {
    render(<ApiKeysLedger {...baseProps} keys={[]} />);

    expect(
      screen.getByText('No keys in this project yet. Create one from the right.')
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'NAME' })).toBeInTheDocument();
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
