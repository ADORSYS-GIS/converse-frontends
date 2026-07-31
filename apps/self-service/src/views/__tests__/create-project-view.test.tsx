import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { CreateProjectView } from '../create-project-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

describe('CreateProjectView', () => {
  it('keeps Create disabled until both a name and a billing identity are entered', async () => {
    const onConfirm = jest.fn();
    await render(<CreateProjectView onConfirm={onConfirm} onCancel={noop} />);

    expect(
      screen.getByRole('button', { name: 'Create project' }).props.accessibilityState.disabled
    ).toBe(true);

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), '  staging  ');

    // Name alone is no longer enough: billing identity moved from the account to the project
    // (lightbridge-authz ADR-0006) and is required + unique server-side.
    expect(
      screen.getByRole('button', { name: 'Create project' }).props.accessibilityState.disabled
    ).toBe(true);

    await fireEvent.changeText(screen.getByPlaceholderText('Who is paying — name, email, or client reference'), 'acme-inc');

    expect(
      screen.getByRole('button', { name: 'Create project' }).props.accessibilityState.disabled
    ).toBe(false);
  });

  it('calls onConfirm with the trimmed name and defaults the billing plan', async () => {
    const onConfirm = jest.fn();
    await render(<CreateProjectView onConfirm={onConfirm} onCancel={noop} />);

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), '  staging  ');
    await fireEvent.changeText(screen.getByPlaceholderText('Who is paying — name, email, or client reference'), '  acme-inc  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Create project' }));

    expect(onConfirm).toHaveBeenCalledWith({
      name: 'staging',
      billingPlan: 'free',
      billingIdentity: 'acme-inc',
    });
  });

  it('passes a custom billing plan through', async () => {
    const onConfirm = jest.fn();
    await render(<CreateProjectView onConfirm={onConfirm} onCancel={noop} />);

    await fireEvent.changeText(screen.getByPlaceholderText('Production'), 'staging');
    await fireEvent.changeText(screen.getByPlaceholderText('Who is paying — name, email, or client reference'), 'acme-inc');
    await fireEvent.changeText(screen.getByPlaceholderText('free'), 'enterprise');
    await fireEvent.press(screen.getByRole('button', { name: 'Create project' }));

    expect(onConfirm).toHaveBeenCalledWith({
      name: 'staging',
      billingPlan: 'enterprise',
      billingIdentity: 'acme-inc',
    });
  });

  it('calls onCancel when Cancel is pressed', async () => {
    const onCancel = jest.fn();
    await render(<CreateProjectView onConfirm={noop} onCancel={onCancel} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
