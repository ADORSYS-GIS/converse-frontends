import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './component';

function renderDialog(overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open
      title="Replace your draft with the example policy?"
      description="Everything you have typed on this form is discarded."
      confirmLabel="Replace my draft"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    renderDialog({ open: false });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('names the action and states what is lost', () => {
    renderDialog();

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Replace your draft with the example policy?')).toBeInTheDocument();
    expect(
      screen.getByText('Everything you have typed on this form is discarded.')
    ).toBeInTheDocument();
  });

  it('confirms without demanding a typed object name — the light sibling of TypedConfirmDialog', () => {
    const { onConfirm } = renderDialog();

    const confirm = screen.getByRole('button', { name: 'Replace my draft' });
    expect(confirm).toBeEnabled();
    confirm.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels through the cancel button', () => {
    const { onCancel } = renderDialog();

    screen.getByRole('button', { name: 'Cancel' }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
