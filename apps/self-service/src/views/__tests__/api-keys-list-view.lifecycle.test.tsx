import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { ApiKeyBackendApiKey } from '@lightbridge/api-rest';

import { ApiKeysListView } from '../api-keys-list-view';

const noop = () => undefined;

const baseItem: ApiKeyBackendApiKey = {
  id: 'key-1',
  project_id: 'project-1',
  name: 'Production',
  key_prefix: 'TEST-FIXTURE-PREFIX',
  created_at: '2026-01-01T00:00:00Z',
  status: 'active',
  billing_plan: 'free',
};

beforeAll(() => {
  initI18n('en');
});

function renderList(item: ApiKeyBackendApiKey, overrides: Partial<Record<string, unknown>> = {}) {
  return render(
    <ApiKeysListView
      items={[item]}
      onBack={noop}
      onCreate={noop}
      onDelete={noop}
      onRevoke={overrides.onRevoke as (id: string, name: string) => void}
      onRotate={overrides.onRotate as (id: string, name: string) => void}
      onSelectAccount={noop}
      onSelectProject={noop}
    />
  );
}

describe('ApiKeysListView lifecycle actions', () => {
  it('calls onRevoke with the key id and name when Revoke is pressed on an active key', async () => {
    const onRevoke = jest.fn();
    await renderList(baseItem, { onRevoke, onRotate: noop });

    await fireEvent.press(screen.getByLabelText('Revoke Production'));

    expect(onRevoke).toHaveBeenCalledWith('key-1', 'Production');
  });

  it('calls onRotate with the key id and name when Rotate is pressed on an active key', async () => {
    const onRotate = jest.fn();
    await renderList(baseItem, { onRevoke: noop, onRotate });

    await fireEvent.press(screen.getByLabelText('Rotate Production'));

    expect(onRotate).toHaveBeenCalledWith('key-1', 'Production');
  });

  it('disables Revoke and Rotate for an already-revoked key', async () => {
    const revokedItem: ApiKeyBackendApiKey = { ...baseItem, status: 'revoked' };
    await renderList(revokedItem, { onRevoke: noop, onRotate: noop });

    expect(screen.getByLabelText('Revoke Production').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText('Rotate Production').props.accessibilityState.disabled).toBe(true);
  });
});
