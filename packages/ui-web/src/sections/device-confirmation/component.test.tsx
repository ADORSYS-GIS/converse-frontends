import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DeviceConfirmation } from './component';
import {
  deviceConfirmationAction,
  deviceConfirmationClientName,
  deviceConfirmationErrorMessage,
  deviceConfirmationUserCode,
} from './fixtures';

describe('DeviceConfirmation', () => {
  it('defaults to the ready status', () => {
    render(
      <DeviceConfirmation
        action={deviceConfirmationAction}
        userCode={deviceConfirmationUserCode}
        clientName={deviceConfirmationClientName}
      />
    );

    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('formats the displayed code as XXXX-XXXX while the hidden input carries the raw value', () => {
    const { container } = render(
      <DeviceConfirmation
        action={deviceConfirmationAction}
        userCode={deviceConfirmationUserCode}
        clientName={deviceConfirmationClientName}
      />
    );

    expect(screen.getByText('WDJB-MJHT')).toBeInTheDocument();
    const hidden = container.querySelector('input[type="hidden"]');
    expect(hidden).toHaveAttribute('name', 'user_code');
    expect(hidden).toHaveAttribute('value', deviceConfirmationUserCode);
  });

  it('renders the requesting client name as plain text, never a badge', () => {
    render(
      <DeviceConfirmation
        action={deviceConfirmationAction}
        userCode={deviceConfirmationUserCode}
        clientName={deviceConfirmationClientName}
      />
    );

    expect(screen.getByText(deviceConfirmationClientName)).toBeInTheDocument();
  });

  it('posts a plain method="post" form to the given action', () => {
    const { container } = render(
      <DeviceConfirmation
        action={deviceConfirmationAction}
        userCode={deviceConfirmationUserCode}
        clientName={deviceConfirmationClientName}
      />
    );

    const form = container.querySelector('form');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('action', deviceConfirmationAction);
  });

  it('accepts a custom field name and continue label', () => {
    render(
      <DeviceConfirmation
        action={deviceConfirmationAction}
        fieldName="custom_code"
        userCode={deviceConfirmationUserCode}
        continueLabel="Approve"
      />
    );

    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });

  it('renders skeleton geometry in the loading status, with no spinner and no daisy skeleton class', () => {
    const { container } = render(
      <DeviceConfirmation status="loading" action={deviceConfirmationAction} />
    );

    expect(container.querySelector('form')).not.toBeInTheDocument();
    expect(container.querySelector('.skeleton')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders the error message as an alert and a back link in the error status', () => {
    render(
      <DeviceConfirmation
        status="error"
        action={deviceConfirmationAction}
        errorMessage={deviceConfirmationErrorMessage}
        backHref="/device"
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(deviceConfirmationErrorMessage);
    const link = screen.getByRole('link', { name: 'Enter the code again' });
    expect(link).toHaveAttribute('href', '/device');
  });

  it('omits the back link when no backHref is given in the error status', () => {
    render(<DeviceConfirmation status="error" action={deviceConfirmationAction} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('falls back to a default error message when none is given', () => {
    render(<DeviceConfirmation status="error" action={deviceConfirmationAction} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This confirmation is no longer available.'
    );
  });
});
