import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

import { RouteErrorBoundary } from '../route-error-boundary';

function Bomb({ shouldThrow }: Readonly<{ shouldThrow: { current: boolean } }>) {
  if (shouldThrow.current) {
    throw new Error('boom: bomb detonated');
  }
  return <Text>bomb defused</Text>;
}

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockReplace.mockClear();
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('RouteErrorBoundary', () => {
  it('renders the calm, translated per-screen fallback with both recovery actions', async () => {
    const shouldThrow = { current: true };

    await render(
      <RouteErrorBoundary>
        <Bomb shouldThrow={shouldThrow} />
      </RouteErrorBoundary>
    );

    expect(screen.getByText('This screen ran into a problem')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByText('Back to start')).toBeTruthy();
  });

  it('"Back to start" navigates to `/` instead of reloading the whole app', async () => {
    const shouldThrow = { current: true };

    await render(
      <RouteErrorBoundary>
        <Bomb shouldThrow={shouldThrow} />
      </RouteErrorBoundary>
    );

    await fireEvent.press(screen.getByText('Back to start'));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('"Try again" recovers in place, remounting only the crashed screen', async () => {
    const shouldThrow = { current: true };

    await render(
      <RouteErrorBoundary>
        <Bomb shouldThrow={shouldThrow} />
      </RouteErrorBoundary>
    );

    shouldThrow.current = false;
    await fireEvent.press(screen.getByText('Try again'));

    expect(screen.getByText('bomb defused')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
