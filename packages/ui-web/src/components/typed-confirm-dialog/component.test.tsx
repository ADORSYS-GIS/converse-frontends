import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TypedConfirmDialog } from './component';

function renderDialog(overrides: Partial<React.ComponentProps<typeof TypedConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <TypedConfirmDialog
      open
      title="Revoke ci-deploy?"
      description="The old secret stops working immediately."
      objectName="ci-deploy"
      confirmLabel="Revoke"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />
  );
  return { onConfirm, onCancel };
}

describe('TypedConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <TypedConfirmDialog
        open={false}
        title="Revoke ci-deploy?"
        description="…"
        objectName="ci-deploy"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('names the object in an accessible dialog', async () => {
    renderDialog();

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Revoke ci-deploy?');
  });

  it('keeps the primary action disabled until the object name matches exactly', async () => {
    renderDialog();

    const confirmButton = await screen.findByRole('button', { name: 'Revoke' });
    const input = screen.getByLabelText('Type "ci-deploy" to confirm');

    expect(confirmButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'ci-dep' } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'ci-deployed' } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'ci-deploy' } });
    expect(confirmButton).toBeEnabled();
  });

  it('fires onConfirm only once the name matches and the button is clicked', async () => {
    const { onConfirm } = renderDialog();

    const input = await screen.findByLabelText('Type "ci-deploy" to confirm');
    fireEvent.change(input, { target: { value: 'ci-deploy' } });
    screen.getByRole('button', { name: 'Revoke' }).click();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel when Cancel is clicked', async () => {
    const { onCancel } = renderDialog();

    (await screen.findByRole('button', { name: 'Cancel' })).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel on Escape', async () => {
    const { onCancel } = renderDialog();
    await screen.findByRole('alertdialog');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  it('stays open and shows the inline error on failure', async () => {
    renderDialog({
      error: 'Could not revoke the key — the server returned a 500. Nothing changed.',
    });

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not revoke the key');
  });

  it('clears the typed value on every reopen, so a stale match cannot survive a new target', async () => {
    const props = (overrides: Partial<React.ComponentProps<typeof TypedConfirmDialog>>) => (
      <TypedConfirmDialog
        open
        title="Revoke ci-deploy?"
        description="…"
        objectName="ci-deploy"
        confirmLabel="Revoke"
        onConfirm={() => {}}
        onCancel={() => {}}
        {...overrides}
      />
    );
    const { rerender } = render(props({}));

    fireEvent.change(await screen.findByLabelText('Type "ci-deploy" to confirm'), {
      target: { value: 'ci-deploy' },
    });
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeEnabled();

    rerender(props({ open: false }));
    rerender(
      props({ objectName: 'legacy-import', confirmLabel: 'Delete', title: 'Delete legacy-import?' })
    );

    expect(await screen.findByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});
