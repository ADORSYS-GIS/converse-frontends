import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { Account, ApiKey, Project } from '@lightbridge/hooks';

import { ApiKeySettingsView } from '../api-key-settings-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

const account: Account = {
  id: 'acc-1',
  defaultQuota: 't-m',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const project: Project = {
  id: 'proj-1',
  accountId: 'acc-1',
  name: 'production',
  billingPlan: 'free',
  billingIdentity: 'acme-inc',
  projectQuota: undefined,
  allowedModels: [],
  modelPolicy: 'allow_all',
  defaultLimits: {},
  status: 'active',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

const activeKey: ApiKey = {
  id: 'key-1',
  projectId: 'proj-1',
  name: 'ci-runner',
  keyPrefix: 'sk_live_abcd',
  status: 'active',
  expiresAt: '2026-12-31T00:00:00Z',
  lastUsedAt: '2026-08-01T00:00:00Z',
  lastIp: '203.0.113.5',
  revokedAt: null,
  deletedAt: null,
  billingPlan: 'free',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const revokedKey: ApiKey = {
  ...activeKey,
  id: 'key-2',
  name: 'old-key',
  status: 'revoked',
  revokedAt: '2026-02-01T00:00:00Z',
};

// Stands in for a key created before every key was required to carry an expiration -- the
// backend can still hand back `expiresAt: null` for these until they're rotated/edited forward.
const legacyNoExpiryKey: ApiKey = {
  ...activeKey,
  id: 'key-3',
  name: 'legacy-key',
  expiresAt: null,
};

function renderView(overrides: Partial<React.ComponentProps<typeof ApiKeySettingsView>> = {}) {
  return render(
    <ApiKeySettingsView
      onBack={noop}
      onSelectAccount={noop}
      onSelectProject={noop}
      onSelectKey={noop}
      onSaveDetails={noop}
      onRevoke={noop}
      onDelete={noop}
      onGoToApiKeys={noop}
      accounts={[account]}
      projects={[project]}
      apiKeys={[activeKey]}
      selectedAccountId="acc-1"
      selectedProjectId="proj-1"
      selectedKeyId="key-1"
      apiKey={activeKey}
      {...overrides}
    />
  );
}

describe('ApiKeySettingsView', () => {
  it('renders the account/project/key selectors and the selected key details', async () => {
    await renderView();

    expect(screen.getByText('acc-1')).toBeTruthy();
    expect(screen.getByText('production')).toBeTruthy();
    expect(screen.getByDisplayValue('ci-runner')).toBeTruthy();
    // The expiry picker seeds "Custom" pre-filled with the key's existing expiration.
    expect(screen.getByRole('button', { name: 'Custom' }).props.accessibilityState.selected).toBe(
      true
    );
    expect(screen.getByLabelText('Expiration date').props.value).toBe('2026-12-31');
  });

  it('calls onSelectKey when a key chip is pressed', async () => {
    const onSelectKey = jest.fn();
    await renderView({
      apiKeys: [activeKey, revokedKey],
      onSelectKey,
    });

    await fireEvent.press(screen.getByText('old-key'));

    expect(onSelectKey).toHaveBeenCalledWith('key-2');
  });

  it('disables Save until name or expiration actually changed', async () => {
    await renderView();

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      true
    );

    await fireEvent.changeText(screen.getByDisplayValue('ci-runner'), 'ci-runner-2');

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      false
    );
  });

  it('calls onSaveDetails with the trimmed name and the unchanged expiration', async () => {
    const onSaveDetails = jest.fn();
    await renderView({ onSaveDetails });

    await fireEvent.changeText(screen.getByDisplayValue('ci-runner'), '  ci-runner-2  ');
    await fireEvent.press(screen.getByText('Save'));

    expect(onSaveDetails).toHaveBeenCalledWith({
      name: 'ci-runner-2',
      expiresAt: '2026-12-31T00:00:00.000Z',
    });
  });

  it('has no reachable "No expiry" option', async () => {
    await renderView();

    expect(screen.queryByText('No expiry')).toBeNull();
  });

  it('does not crash for a legacy key with a null expiresAt, and seeds a real 30-day expiration instead of "No expiry"', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    await renderView({ apiKey: legacyNoExpiryKey, apiKeys: [legacyNoExpiryKey] });

    expect(screen.getByDisplayValue('legacy-key')).toBeTruthy();
    expect(screen.queryByText('No expiry')).toBeNull();
    expect(screen.getByRole('button', { name: '30 days' }).props.accessibilityState.selected).toBe(
      true
    );
    jest.useRealTimers();
  });

  it('allows saving a new in-range custom expiration', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onSaveDetails = jest.fn();
    await renderView({ onSaveDetails });

    await fireEvent(screen.getByLabelText('Expiration date'), 'change', {
      target: { value: '2026-07-01' },
    });
    await fireEvent.press(screen.getByText('Save'));

    expect(onSaveDetails).toHaveBeenCalledWith({
      name: 'ci-runner',
      expiresAt: '2026-07-01T00:00:00.000Z',
    });
    jest.useRealTimers();
  });

  it('disables Save when the custom expiration draft is not a valid date', async () => {
    await renderView();

    await fireEvent(screen.getByLabelText('Expiration date'), 'change', {
      target: { value: 'not-a-date' },
    });

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      true
    );
  });

  it('disables Save when the edited custom expiration exceeds the 90-day cap', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onSaveDetails = jest.fn();
    await renderView({ onSaveDetails });

    // 91 days out from the frozen "now" -- one day past the cap.
    await fireEvent(screen.getByLabelText('Expiration date'), 'change', {
      target: { value: '2026-08-31' },
    });

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      true
    );
    await fireEvent.press(screen.getByText('Save'));
    expect(onSaveDetails).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('still allows saving a name-only change on a key whose existing expiration is now beyond the 90-day cap', async () => {
    // `activeKey.expiresAt` is `2026-12-31T00:00:00Z`, well over 90 days out from this frozen
    // "now" -- a stand-in for a key whose expiration was set (validly, at the time) before the
    // 90-day cap existed. Editing only the name must not be blocked by a client-side re-check of
    // an expiration nobody is trying to change -- see `handleSaveDetails`'s `expiryChanged` guard.
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onSaveDetails = jest.fn();
    await renderView({ onSaveDetails });

    await fireEvent.changeText(screen.getByDisplayValue('ci-runner'), 'ci-runner-renamed');
    await fireEvent.press(screen.getByText('Save'));

    expect(onSaveDetails).toHaveBeenCalledWith({
      name: 'ci-runner-renamed',
      expiresAt: '2026-12-31T00:00:00.000Z',
    });
    jest.useRealTimers();
  });

  it('renders last-used metadata as read-only KeyValue rows', async () => {
    await renderView();

    expect(screen.getByText('sk_live_abcd')).toBeTruthy();
    expect(screen.getByText('203.0.113.5')).toBeTruthy();
    expect(screen.getByText('free')).toBeTruthy();
  });

  it('shows "Never used" when a key has no lastUsedAt', async () => {
    await renderView({ apiKey: { ...activeKey, lastUsedAt: null } });

    expect(screen.getByText('Never used')).toBeTruthy();
  });

  it('shows the revoked notice and disables Revoke for a revoked key', async () => {
    await renderView({ apiKey: revokedKey, apiKeys: [revokedKey] });

    expect(screen.getByText('This key has already been revoked.')).toBeTruthy();
    expect(screen.getByLabelText('Revoke old-key').props.accessibilityState.disabled).toBe(true);
  });

  it('renders a Revoked badge and a revoked-on row for a revoked key', async () => {
    await renderView({ apiKey: revokedKey, apiKeys: [revokedKey] });

    expect(screen.getAllByText('Revoked').length).toBeGreaterThan(0);
  });

  it('shows an Expired badge and the expired notice for an active-but-past-expiry key, while keeping Revoke enabled', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
    const expiredKey: ApiKey = { ...activeKey, expiresAt: '2026-12-31T00:00:00Z' };
    await renderView({ apiKey: expiredKey, apiKeys: [expiredKey] });

    // Appears twice by design: the header status pill, and the metadata section's "Status" row
    // (which now shows the same derived status rather than the raw, possibly-stale backend
    // value, so the two never contradict each other on the same screen).
    expect(screen.getAllByText('Expired').length).toBe(2);
    expect(screen.queryByText('Active')).toBeNull();
    expect(
      screen.getByText(
        'This key expired and can no longer authenticate requests. Extend or clear its expiration above to restore it.'
      )
    ).toBeTruthy();
    expect(screen.getByLabelText('Revoke ci-runner').props.accessibilityState.disabled).toBe(false);

    jest.useRealTimers();
  });

  it('calls onRevoke and onDelete from the danger zone', async () => {
    const onRevoke = jest.fn();
    const onDelete = jest.fn();
    await renderView({ onRevoke, onDelete });

    await fireEvent.press(screen.getByText('Revoke'));
    expect(onRevoke).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('hides the danger-zone actions without apikey:revoke/apikey:delete', async () => {
    await renderView({ canRevoke: false, canDelete: false });

    expect(screen.queryByText('Revoke')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('hides the editable details section without apikey:update, but still shows metadata', async () => {
    await renderView({ canUpdate: false });

    expect(screen.queryByDisplayValue('ci-runner')).toBeNull();
    expect(screen.getByText('sk_live_abcd')).toBeTruthy();
  });

  it('links to the API Keys list for rotation instead of duplicating a control', async () => {
    const onGoToApiKeys = jest.fn();
    await renderView({ onGoToApiKeys });

    await fireEvent.press(screen.getByText('Go to API Keys'));

    expect(onGoToApiKeys).toHaveBeenCalledTimes(1);
  });

  it('renders an empty state when no key is selected', async () => {
    await renderView({ apiKey: undefined, apiKeys: [] });

    expect(screen.getByText('Select an API key above to view its settings.')).toBeTruthy();
  });

  /**
   * Same class of bug as `AccountSettingsView`'s `TypeError: f.trim is not a function`
   * production incident (`f` was `defaultQuota`, an RPC-sourced optional string reaching
   * `.trim()` unguarded via `?? ''`). `apiKey.name` gets the identical treatment here.
   */
  it('does not crash when the api key name arrives as a non-string value', async () => {
    await renderView({ apiKey: { ...activeKey, name: 99 as unknown as string } });

    expect(screen.getByDisplayValue('')).toBeTruthy();
  });
});
