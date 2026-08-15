import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { ApiKeyCreateView } from '../api-key-create-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

describe('ApiKeyCreateView createError', () => {
  it('renders nothing when there is no error', async () => {
    await render(<ApiKeyCreateView onBack={noop} onCreate={noop} onCopy={noop} />);

    // Sanity: the form itself rendered.
    expect(screen.getByPlaceholderText('Production')).toBeTruthy();
    expect(
      screen.queryByText("Creating API keys here requires being this project's lead or its owning account.")
    ).toBeNull();
  });

  it('renders the resolved error copy the screen hands it', async () => {
    await render(
      <ApiKeyCreateView
        onBack={noop}
        onCreate={noop}
        onCopy={noop}
        createError="Creating API keys here requires being this project's lead or its owning account."
      />
    );

    expect(
      screen.getByText("Creating API keys here requires being this project's lead or its owning account.")
    ).toBeTruthy();
  });
});
