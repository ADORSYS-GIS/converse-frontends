import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { Account, ApiKey, Project } from '@lightbridge/hooks';

import { ApiKeySettingsView, parseExpirationDraft } from '../api-key-settings-view';

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

describe('parseExpirationDraft', () => {
  it('maps an empty draft to null (no expiration)', () => {
    expect(parseExpirationDraft('')).toBeNull();
    expect(parseExpirationDraft('   ')).toBeNull();
  });

  it('parses a valid YYYY-MM-DD date to an ISO datetime', () => {
    expect(parseExpirationDraft('2026-12-31')).toBe('2026-12-31T00:00:00.000Z');
  });

  it('rejects malformed input as undefined (invalid)', () => {
    expect(parseExpirationDraft('12/31/2026')).toBeUndefined();
    expect(parseExpirationDraft('not-a-date')).toBeUndefined();
    expect(parseExpirationDraft('2026-13-40')).toBeUndefined();
  });
});

describe('ApiKeySettingsView', () => {
  it('renders the account/project/key selectors and the selected key details', async () => {
    await renderView();

    expect(screen.getByText('acc-1')).toBeTruthy();
    expect(screen.getByText('production')).toBeTruthy();
    expect(screen.getByDisplayValue('ci-runner')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-12-31')).toBeTruthy();
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

  it('calls onSaveDetails with the trimmed name and parsed expiration', async () => {
    const onSaveDetails = jest.fn();
    await renderView({ onSaveDetails });

    await fireEvent.changeText(screen.getByDisplayValue('ci-runner'), '  ci-runner-2  ');
    await fireEvent.press(screen.getByText('Save'));

    expect(onSaveDetails).toHaveBeenCalledWith({
      name: 'ci-runner-2',
      expiresAt: '2026-12-31T00:00:00.000Z',
    });
  });

  it('allows clearing the expiration to "no expiration"', async () => {
    const onSaveDetails = jest.fn();
    await renderView({ onSaveDetails });

    await fireEvent.changeText(screen.getByDisplayValue('2026-12-31'), '');
    await fireEvent.press(screen.getByText('Save'));

    expect(onSaveDetails).toHaveBeenCalledWith({ name: 'ci-runner', expiresAt: null });
  });

  it('disables Save when the expiration draft is not a valid date', async () => {
    await renderView();

    await fireEvent.changeText(screen.getByDisplayValue('2026-12-31'), 'not-a-date');

    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(
      true
    );
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
    expect(
      screen.getByLabelText('Revoke old-key').props.accessibilityState.disabled
    ).toBe(true);
  });

  it('renders a Revoked badge and a revoked-on row for a revoked key', async () => {
    await renderView({ apiKey: revokedKey, apiKeys: [revokedKey] });

    expect(screen.getAllByText('Revoked').length).toBeGreaterThan(0);
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
});
