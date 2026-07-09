import React from 'react';
import { render } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import useColorScheme from 'react-native/Libraries/Utilities/useColorScheme';
import { ApiKeyCreateView } from '../api-key-create-view';

const mockUseColorScheme = useColorScheme as jest.Mock;

const noop = () => undefined;

beforeAll(() => {
  initI18n('en');
});

describe('ApiKeyCreateView theme', () => {
  it('renders with the dark palette when the system scheme is dark', async () => {
    mockUseColorScheme.mockReturnValue('dark');

    const view = await render(<ApiKeyCreateView onBack={noop} onCreate={noop} onCopy={noop} />);

    const tree = JSON.stringify(view.toJSON());
    expect(tree).toContain('rgb(125 160 255)'); // dark primary (inline via useThemeColors)
    expect(tree).not.toContain('rgb(62 99 221)'); // light primary must not leak in
  });

  it('renders with the light palette when the system scheme is light', async () => {
    mockUseColorScheme.mockReturnValue('light');

    const view = await render(<ApiKeyCreateView onBack={noop} onCreate={noop} onCopy={noop} />);

    const tree = JSON.stringify(view.toJSON());
    expect(tree).toContain('rgb(62 99 221)'); // light primary (inline via useThemeColors)
    expect(tree).not.toContain('rgb(125 160 255)'); // dark primary must not leak in
  });
});
