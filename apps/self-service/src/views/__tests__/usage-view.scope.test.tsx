import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';
import type { ApiKeyBackendApiKey } from '@lightbridge/api-rest';

import { UsageView } from '../usage-view';

const noop = () => undefined;

const baseTotals = {
  cost: 12.5,
  requests: 100,
  tokens: 2000,
  promptTokens: 1000,
  completionTokens: 1000,
};

const testApiKeys: ApiKeyBackendApiKey[] = [
  {
    id: 'key-1',
    project_id: 'project-1',
    name: 'Production',
    key_prefix: 'TEST-PREFIX-1',
    created_at: '2026-01-01T00:00:00Z',
    status: 'active',
  },
];

beforeAll(() => {
  initI18n('en');
});

describe('UsageView scope selector', () => {
  it('defaults to project scope and shows the usage KPIs (no regression)', async () => {
    await render(
      <UsageView
        scope="project"
        onScopeChange={noop}
        totals={baseTotals}
        isTrendLoading={false}
        isModelLoading={false}
        isApiKeyLoading={false}
      />
    );

    expect(screen.getByText('Total Cost')).toBeTruthy();
    expect(screen.getByLabelText('Project').props.accessibilityState.selected).toBe(true);
  });

  it('calls onScopeChange when a different scope segment is pressed', async () => {
    const onScopeChange = jest.fn();
    await render(
      <UsageView
        scope="project"
        onScopeChange={onScopeChange}
        totals={baseTotals}
        isTrendLoading={false}
        isModelLoading={false}
        isApiKeyLoading={false}
      />
    );

    await fireEvent.press(screen.getByLabelText('Account'));

    expect(onScopeChange).toHaveBeenCalledWith('account');
  });

  it('prompts for an API key and hides the KPIs when api_key scope has no key selected', async () => {
    await render(
      <UsageView
        scope="api_key"
        onScopeChange={noop}
        scopeApiKeyId={null}
        onScopeApiKeyChange={noop}
        apiKeys={testApiKeys}
        totals={baseTotals}
        isTrendLoading={false}
        isModelLoading={false}
        isApiKeyLoading={false}
      />
    );

    expect(screen.getByText('Select an API key to view its usage.')).toBeTruthy();
    expect(screen.queryByText('Total Cost')).toBeNull();
  });

  it('shows the KPIs once an API key is selected for api_key scope', async () => {
    const onScopeApiKeyChange = jest.fn();
    await render(
      <UsageView
        scope="api_key"
        onScopeChange={noop}
        scopeApiKeyId={null}
        onScopeApiKeyChange={onScopeApiKeyChange}
        apiKeys={testApiKeys}
        totals={baseTotals}
        isTrendLoading={false}
        isModelLoading={false}
        isApiKeyLoading={false}
      />
    );

    await fireEvent.press(screen.getByText('Production'));

    expect(onScopeApiKeyChange).toHaveBeenCalledWith('key-1');
  });

  it('shows a "no API keys" message when api_key scope has none to pick from', async () => {
    await render(
      <UsageView
        scope="api_key"
        onScopeChange={noop}
        scopeApiKeyId={null}
        onScopeApiKeyChange={noop}
        apiKeys={[]}
        totals={baseTotals}
        isTrendLoading={false}
        isModelLoading={false}
        isApiKeyLoading={false}
      />
    );

    expect(screen.getByText('This project has no API keys yet.')).toBeTruthy();
  });
});
