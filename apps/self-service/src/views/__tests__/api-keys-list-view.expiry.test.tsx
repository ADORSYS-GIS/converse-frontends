import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { ApiKey } from '@lightbridge/hooks';

import { ApiKeysListView } from '../api-keys-list-view';

const noop = () => undefined;

const baseItem: ApiKey = {
  id: 'key-1',
  projectId: 'project-1',
  name: 'Production',
  keyPrefix: 'TEST-FIXTURE-PREFIX',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  status: 'active',
  billingPlan: 'free',
};

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-15T00:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

async function renderList(item: ApiKey) {
  return render(
    <ApiKeysListView
      items={[item]}
      onBack={noop}
      onCreate={noop}
      onDelete={noop}
      onRevoke={noop}
      onRotate={noop}
      onSelectAccount={noop}
      onSelectProject={noop}
      onOpenAccountPicker={noop}
      onOpenProjectPicker={noop}
    />
  );
}

describe('ApiKeysListView expiry legibility', () => {
  it('renders no expiry caption, and does not crash or show "No expiry", for a legacy null-expiry key', async () => {
    await renderList({ ...baseItem, expiresAt: null });

    // Every key this app creates or edits now requires a real expiration, so this state is only
    // reachable for a key that predates that cutover -- there is no "No expiry"/"Never expires"
    // label to reintroduce here, and the row must still render the rest of the key honestly.
    expect(screen.queryByText('No expiry')).toBeNull();
    expect(screen.queryByText(/Never expires/i)).toBeNull();
    expect(screen.getByText('Production')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('shows a plain "Expires on" caption for a far-out expiration', async () => {
    await renderList({ ...baseItem, expiresAt: '2027-01-01T00:00:00.000Z' });

    expect(screen.getByText(/Expires Jan 01, 2027/)).toBeTruthy();
    // Still reads as "Active" -- far out is not urgent.
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('flags an expiring-soon key with a warning-toned days-remaining badge', async () => {
    // 5 days out from the frozen "now" -- inside the 14-day soon window.
    await renderList({ ...baseItem, expiresAt: '2026-06-20T00:00:00.000Z' });

    expect(screen.getByText('Expires in 5 days')).toBeTruthy();
    // The key is still functionally active -- this is a warning, not an error state.
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('makes an expired-but-not-revoked key unmistakable via the header badge', async () => {
    await renderList({ ...baseItem, status: 'active', expiresAt: '2026-01-01T00:00:00.000Z' });

    // The raw backend status is still "active", but the badge must read "Expired", not "Active".
    expect(screen.queryByText('Active')).toBeNull();
    expect(screen.getByText('Expired')).toBeTruthy();
    expect(screen.getByText(/Expired Jan 01, 2026/)).toBeTruthy();
  });

  it('still lets an expired-but-not-revoked key be rotated and revoked', async () => {
    await renderList({ ...baseItem, status: 'active', expiresAt: '2026-01-01T00:00:00.000Z' });

    expect(screen.getByLabelText('Rotate Production').props.accessibilityState.disabled).toBe(
      false
    );
    expect(screen.getByLabelText('Revoke Production').props.accessibilityState.disabled).toBe(
      false
    );
  });

  it('shows "Revoked" (not "Expired") for a revoked key, even if it is also past its expiry', async () => {
    await renderList({
      ...baseItem,
      status: 'revoked',
      expiresAt: '2026-01-01T00:00:00.000Z',
      revokedAt: '2026-01-02T00:00:00.000Z',
    });

    expect(screen.getByText('Revoked')).toBeTruthy();
    expect(screen.queryByText('Expired')).toBeNull();
  });
});
