import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DeviceCodeEntry } from './component';
import {
  deviceCodeEntryAction,
  deviceCodeEntryInvalidCodeMessage,
  deviceCodeEntryPrefilledCode,
} from './fixtures';

describe('DeviceCodeEntry', () => {
  it('renders a plain method="post" form targeting the given action', () => {
    const { container } = render(<DeviceCodeEntry action={deviceCodeEntryAction} />);

    const form = container.querySelector('form');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('action', deviceCodeEntryAction);
  });

  it('names the input field "user_code" by default', () => {
    render(<DeviceCodeEntry action={deviceCodeEntryAction} />);

    const input = screen.getByLabelText('Device code');
    expect(input).toHaveAttribute('name', 'user_code');
  });

  it('accepts a custom field name', () => {
    render(<DeviceCodeEntry action={deviceCodeEntryAction} fieldName="custom_code" />);

    expect(screen.getByLabelText('Device code')).toHaveAttribute('name', 'custom_code');
  });

  it('carries autocomplete="one-time-code" on the code input -- the live wire contract', () => {
    render(<DeviceCodeEntry action={deviceCodeEntryAction} />);

    expect(screen.getByLabelText('Device code')).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('is required and marked as text input mode with no spellcheck/autocapitalize surprises', () => {
    render(<DeviceCodeEntry action={deviceCodeEntryAction} />);

    const input = screen.getByLabelText('Device code');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('inputmode', 'text');
    expect(input).toHaveAttribute('autocapitalize', 'characters');
    expect(input).toHaveAttribute('spellcheck', 'false');
  });

  it('pre-fills the input with defaultUserCode', () => {
    render(
      <DeviceCodeEntry
        action={deviceCodeEntryAction}
        defaultUserCode={deviceCodeEntryPrefilledCode}
      />
    );

    expect(screen.getByLabelText('Device code')).toHaveValue(deviceCodeEntryPrefilledCode);
  });

  it('omits the error line by default', () => {
    render(<DeviceCodeEntry action={deviceCodeEntryAction} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the error message above the field when given', () => {
    render(
      <DeviceCodeEntry
        action={deviceCodeEntryAction}
        errorMessage={deviceCodeEntryInvalidCodeMessage}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(deviceCodeEntryInvalidCodeMessage);

    const input = screen.getByLabelText('Device code');
    expect(alert.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders a native submit button, "Continue" by default', () => {
    render(<DeviceCodeEntry action={deviceCodeEntryAction} />);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('accepts a custom submit label', () => {
    render(<DeviceCodeEntry action={deviceCodeEntryAction} submitLabel="Verify code" />);

    expect(screen.getByRole('button', { name: 'Verify code' })).toBeInTheDocument();
  });
});
