import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { AppErrorBoundary } from '../app-error-boundary';

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
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('AppErrorBoundary', () => {
  it('renders the calm, translated crash fallback instead of a blank app', async () => {
    const shouldThrow = { current: true };

    await render(
      <AppErrorBoundary>
        <Bomb shouldThrow={shouldThrow} />
      </AppErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(
      screen.getByText(
        "We hit an unexpected error and couldn't finish loading this. Your data is safe."
      )
    ).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    // Deliberately no in-app navigation offered at the root level -- see the
    // component's doc comment: the navigator itself may be what failed to
    // render, so a "go home" affordance here would not be trustworthy.
    expect(screen.queryByText('Back to start')).toBeNull();
  });

  it('never shows a raw stack trace in the fallback UI', async () => {
    const shouldThrow = { current: true };

    await render(
      <AppErrorBoundary>
        <Bomb shouldThrow={shouldThrow} />
      </AppErrorBoundary>
    );

    expect(screen.queryByText(/boom: bomb detonated/)).toBeNull();
  });

  it('recovers on retry', async () => {
    const shouldThrow = { current: true };

    await render(
      <AppErrorBoundary>
        <Bomb shouldThrow={shouldThrow} />
      </AppErrorBoundary>
    );

    shouldThrow.current = false;
    await fireEvent.press(screen.getByText('Try again'));

    expect(screen.getByText('bomb defused')).toBeTruthy();
  });
});
