import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { McpBuilderView } from '../mcp-builder-view';

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

describe('McpBuilderView', () => {
  it('renders the platform switcher, defaulting to VS Code', async () => {
    await render(<McpBuilderView onBack={noop} onCopy={noop} onCreateKey={noop} />);

    expect(screen.getByLabelText('VS Code').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Cursor').props.accessibilityState.selected).toBe(false);
  });

  it('switches the generated config when a different platform segment is pressed', async () => {
    await render(<McpBuilderView onBack={noop} onCopy={noop} onCreateKey={noop} />);

    await fireEvent.press(screen.getByLabelText('Cursor'));

    expect(screen.getByLabelText('Cursor').props.accessibilityState.selected).toBe(true);
    expect(screen.getByText('mcpServers')).toBeTruthy();
  });
});
