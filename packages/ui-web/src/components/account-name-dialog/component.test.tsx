import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountNameDialog } from './component';

function baseProps(
  overrides: Partial<React.ComponentProps<typeof AccountNameDialog>> = {}
): React.ComponentProps<typeof AccountNameDialog> {
  return {
    open: true,
    mode: 'create',
    subjectLabel: 'auth0|9f3a2c',
    name: '',
    onNameChange: vi.fn(),
    submitting: false,
    canSubmit: true,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('AccountNameDialog', () => {
  it('renders nothing when closed', () => {
    render(<AccountNameDialog {...baseProps({ open: false })} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the create dialog accessibly', async () => {
    render(<AccountNameDialog {...baseProps()} />);
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Create account');
  });

  it('echoes the signed-in subject rather than asking for an id', async () => {
    render(<AccountNameDialog {...baseProps({ subjectLabel: 'auth0|abc123' })} />);

    expect(await screen.findByText(/auth0\|abc123/)).toBeInTheDocument();
    // `CreateAccountInput` carries no id field at all — the backend decides it (ADR-0006 for a
    // first account, ADR-0026 for every one after) — so the form must never offer a way to type
    // one. This is the property that would silently regress if someone copied
    // `CreateProjectDialog`'s `createId()`-driven shape wholesale.
    expect(screen.queryByLabelText(/account id/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('asks only for the name — no quota tier picker it would have to hardcode', async () => {
    render(<AccountNameDialog {...baseProps()} />);
    await screen.findByRole('dialog');

    expect(screen.getByLabelText('Account name')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('says a blank name is legal in create mode instead of demanding one', async () => {
    render(<AccountNameDialog {...baseProps({ name: '' })} />);
    await screen.findByRole('dialog');

    expect(screen.getByText(/leave blank to create the account unnamed/i)).toBeInTheDocument();
    // The server normalises blank to NULL, so an empty field must NOT disable the primary — a
    // stricter client rule than the backend's is the failure this pins.
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('fires onNameChange as the caller types', async () => {
    const onNameChange = vi.fn();
    render(<AccountNameDialog {...baseProps({ onNameChange })} />);
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText('Account name'), { target: { value: 'Widgets Ltd' } });
    expect(onNameChange).toHaveBeenCalledWith('Widgets Ltd');
  });

  it('renders a server rejection against the name field specifically', async () => {
    render(<AccountNameDialog {...baseProps({ nameError: 'account name must not be blank' })} />);
    await screen.findByRole('dialog');

    expect(screen.getByText('account name must not be blank')).toBeInTheDocument();
    expect(screen.getByLabelText('Account name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('stays open and shows the inline error on a failure it cannot attribute to the field', async () => {
    render(
      <AccountNameDialog {...baseProps({ error: 'account already exists for this subject' })} />
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('account already exists for this subject');
    expect(screen.getByLabelText('Account name')).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a submitting label and disables the primary while in flight', async () => {
    render(<AccountNameDialog {...baseProps({ submitting: true, canSubmit: true })} />);
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
  });

  it('disables the primary when canSubmit is false', async () => {
    render(<AccountNameDialog {...baseProps({ canSubmit: false })} />);
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
  });

  it('fires onSubmit when the primary is clicked', async () => {
    const onSubmit = vi.fn();
    render(<AccountNameDialog {...baseProps({ onSubmit })} />);
    await screen.findByRole('dialog');

    screen.getByRole('button', { name: 'Create account' }).click();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<AccountNameDialog {...baseProps({ onCancel })} />);
    await screen.findByRole('dialog');

    screen.getByRole('button', { name: 'Cancel' }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel on Escape', async () => {
    const onCancel = vi.fn();
    render(<AccountNameDialog {...baseProps({ onCancel })} />);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  describe('rename mode', () => {
    it('says "Name this account" — not "Rename" — when the account has never been named', async () => {
      render(
        <AccountNameDialog {...baseProps({ mode: 'rename', currentlyNamed: false, name: '' })} />
      );

      expect(await screen.findByRole('dialog')).toHaveAccessibleName('Name this account');
      expect(screen.getByText(/never been named/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save name' })).toBeInTheDocument();
    });

    it('says "Rename account" and offers the clear-the-name path when it has one', async () => {
      render(
        <AccountNameDialog
          {...baseProps({ mode: 'rename', currentlyNamed: true, name: 'Widgets Ltd' })}
        />
      );

      expect(await screen.findByRole('dialog')).toHaveAccessibleName('Rename account');
      expect(screen.getByText(/leave blank to clear the name/i)).toBeInTheDocument();
    });

    it('shows the saving label while in flight', async () => {
      render(
        <AccountNameDialog
          {...baseProps({ mode: 'rename', currentlyNamed: true, name: 'W', submitting: true })}
        />
      );
      await screen.findByRole('dialog');

      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    });
  });
});
