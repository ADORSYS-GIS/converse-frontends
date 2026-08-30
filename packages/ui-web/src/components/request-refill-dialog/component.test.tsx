import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RequestRefillDialog } from './component';

const AMOUNT_OPTIONS = [
  { value: '5000000', label: '+$5.00' },
  { value: '12000000', label: '+$12.00' },
];

function baseProps(
  overrides: Partial<React.ComponentProps<typeof RequestRefillDialog>> = {}
): React.ComponentProps<typeof RequestRefillDialog> {
  return {
    open: true,
    onOpenChange: vi.fn(),
    accountLabel: 'adorsys-gis',
    amountOptions: AMOUNT_OPTIONS,
    amountMicros: AMOUNT_OPTIONS[0].value,
    onAmountChange: vi.fn(),
    submitting: false,
    canSubmit: true,
    onSubmit: vi.fn(),
    ...overrides,
  };
}

describe('RequestRefillDialog', () => {
  it('renders nothing when closed', () => {
    render(<RequestRefillDialog {...baseProps({ open: false })} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the dialog accessibly and echoes which account it targets', async () => {
    render(<RequestRefillDialog {...baseProps()} />);

    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Request a budget refill');
    expect(screen.getByText(/adorsys-gis/)).toBeInTheDocument();
  });

  it('offers the amount select populated from the allowed amounts, never a free-text field', async () => {
    render(<RequestRefillDialog {...baseProps()} />);
    await screen.findByRole('dialog');

    expect(screen.getByRole('combobox', { name: 'Amount' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('has no requester-note field — the backend has nowhere honest to send one (lightbridge-authz#559)', async () => {
    render(<RequestRefillDialog {...baseProps()} />);
    await screen.findByRole('dialog');

    expect(screen.queryByLabelText(/note/i)).not.toBeInTheDocument();
  });

  it('shows a submitting label and disables the primary while in flight', async () => {
    render(<RequestRefillDialog {...baseProps({ submitting: true })} />);
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Requesting…' })).toBeDisabled();
  });

  it('disables the primary when canSubmit is false', async () => {
    render(<RequestRefillDialog {...baseProps({ canSubmit: false })} />);
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Request refill' })).toBeDisabled();
  });

  it('fires onSubmit when the primary is clicked', async () => {
    const onSubmit = vi.fn();
    render(<RequestRefillDialog {...baseProps({ onSubmit })} />);
    await screen.findByRole('dialog');

    screen.getByRole('button', { name: 'Request refill' }).click();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('surfaces a server-rejected submit inline, without closing the dialog', async () => {
    render(
      <RequestRefillDialog
        {...baseProps({ error: 'The active refill policy no longer allows this amount.' })}
      />
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The active refill policy no longer allows this amount.'
    );
  });

  it('fires onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = vi.fn();
    render(<RequestRefillDialog {...baseProps({ onOpenChange })} />);
    await screen.findByRole('dialog');

    screen.getByRole('button', { name: 'Cancel' }).click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('fires onOpenChange(false) on Escape', async () => {
    const onOpenChange = vi.fn();
    render(<RequestRefillDialog {...baseProps({ onOpenChange })} />);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
