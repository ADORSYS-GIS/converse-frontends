import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { BillingPlanInfo } from '@lightbridge/authz-rpc';

import { ApiKeyCreateView } from '../api-key-create-view';

const noop = () => undefined;

const PLANS: BillingPlanInfo[] = [
  { id: 'free', name: 'Free' },
  { id: 'pro', name: 'Pro' },
];

beforeAll(() => {
  initI18n('en');
});

async function nameField() {
  return fireEvent.changeText(screen.getByPlaceholderText('Production'), 'CI key');
}

describe('ApiKeyCreateView billing plan gating', () => {
  it('creates keys on the free plan when the user cannot choose a plan', async () => {
    const onCreate = jest.fn();
    await render(<ApiKeyCreateView onBack={noop} onCreate={onCreate} onCopy={noop} />);

    // No plan field is offered at all -- not even a disabled one -- and a locked note explains
    // the fixed plan instead.
    expect(screen.queryByText('Billing plan')).toBeNull();
    expect(screen.getByText('New keys are created on the free plan.')).toBeTruthy();

    await nameField();
    await fireEvent.press(screen.getByText('Save key'));

    // Third arg is the resolved expiresAt -- defaults to the 30-day preset (see
    // api-key-create-view.expiry.test.tsx for dedicated coverage of that value).
    expect(onCreate).toHaveBeenCalledWith('CI key', 'free', expect.any(String));
  });
});

describe('ApiKeyCreateView billing plan selector', () => {
  it('shows a loading state and blocks Save while the catalogue is still loading', async () => {
    await render(
      <ApiKeyCreateView onBack={noop} onCreate={noop} onCopy={noop} canChoosePlan isPlansLoading />
    );

    expect(screen.getByText('Loading plans...')).toBeTruthy();
    expect(screen.queryByLabelText('Billing plan')).toBeNull();
    await nameField();
    expect(screen.getByRole('button', { name: 'Save key' }).props.accessibilityState.disabled).toBe(
      true
    );
  });

  it('shows a real error state and blocks Save when the catalogue fails to load', async () => {
    await render(
      <ApiKeyCreateView onBack={noop} onCreate={noop} onCopy={noop} canChoosePlan isPlansError />
    );

    expect(screen.getByText("Couldn't load billing plans. Please try again.")).toBeTruthy();
    expect(screen.queryByLabelText('Billing plan')).toBeNull();
    await nameField();
    expect(screen.getByRole('button', { name: 'Save key' }).props.accessibilityState.disabled).toBe(
      true
    );
  });

  it('shows a real empty state and blocks Save when no plans are configured', async () => {
    await render(
      <ApiKeyCreateView onBack={noop} onCreate={noop} onCopy={noop} canChoosePlan plans={[]} />
    );

    expect(screen.getByText('No billing plans are configured.')).toBeTruthy();
    expect(screen.queryByLabelText('Billing plan')).toBeNull();
    await nameField();
    expect(screen.getByRole('button', { name: 'Save key' }).props.accessibilityState.disabled).toBe(
      true
    );
  });

  it('defaults to the operator-first-listed plan and forwards its id', async () => {
    const onCreate = jest.fn();
    await render(
      <ApiKeyCreateView
        onBack={noop}
        onCreate={onCreate}
        onCopy={noop}
        canChoosePlan
        plans={PLANS}
      />
    );

    await nameField();
    await fireEvent.press(screen.getByText('Save key'));

    expect(onCreate).toHaveBeenCalledWith('CI key', 'free', expect.any(String));
  });

  it('lets the caller pick a different plan and forwards its id, not its label', async () => {
    const onCreate = jest.fn();
    await render(
      <ApiKeyCreateView
        onBack={noop}
        onCreate={onCreate}
        onCopy={noop}
        canChoosePlan
        plans={PLANS}
      />
    );

    await nameField();
    await fireEvent.press(screen.getByText('Pro'));
    await fireEvent.press(screen.getByText('Save key'));

    expect(onCreate).toHaveBeenCalledWith('CI key', 'pro', expect.any(String));
  });

  it('marks the selected plan for accessibility', async () => {
    await render(
      <ApiKeyCreateView onBack={noop} onCreate={noop} onCopy={noop} canChoosePlan plans={PLANS} />
    );

    // Auto-selected to the first plan on load (see the preceding test).
    expect(screen.getByLabelText('Free').props.accessibilityState.selected).toBeTruthy();
    expect(screen.getByLabelText('Pro').props.accessibilityState.selected).toBeFalsy();

    await fireEvent.press(screen.getByText('Pro'));

    expect(screen.getByLabelText('Pro').props.accessibilityState.selected).toBeTruthy();
    expect(screen.getByLabelText('Free').props.accessibilityState.selected).toBeFalsy();
  });
});
