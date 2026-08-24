import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
    />,
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
      />,
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('names the object in an accessible dialog', () => {
    renderDialog();

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Revoke ci-deploy?');
  });

  it('keeps the primary action disabled until the object name matches exactly', () => {
    renderDialog();

    const confirmButton = screen.getByRole('button', { name: 'Revoke' });
    const input = screen.getByLabelText('Type "ci-deploy" to confirm');

    expect(confirmButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'ci-dep' } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'ci-deployed' } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'ci-deploy' } });
    expect(confirmButton).toBeEnabled();
  });

  it('fires onConfirm only once the name matches and the button is clicked', () => {
    const { onConfirm } = renderDialog();

    const input = screen.getByLabelText('Type "ci-deploy" to confirm');
    fireEvent.change(input, { target: { value: 'ci-deploy' } });
    screen.getByRole('button', { name: 'Revoke' }).click();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel when Cancel is clicked', () => {
    const { onCancel } = renderDialog();

    screen.getByRole('button', { name: 'Cancel' }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel on Escape', () => {
    const { onCancel } = renderDialog();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('stays open and shows the inline error on failure', () => {
    renderDialog({ error: 'Could not revoke the key — the server returned a 500. Nothing changed.' });

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not revoke the key');
  });
});
