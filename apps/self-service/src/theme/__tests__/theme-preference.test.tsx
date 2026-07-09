import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import useColorScheme from 'react-native/Libraries/Utilities/useColorScheme';
import {
  ThemePreferenceProvider,
  useEffectiveColorScheme,
  useThemePreference,
} from '../theme-preference';

const mockUseColorScheme = useColorScheme as jest.Mock;

// The jest-expo env is node (no jsdom) → no `localStorage`. The provider guards
// for that; here we give it a minimal in-memory one so persistence is testable.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}
(globalThis as { localStorage?: Storage }).localStorage = new MemoryStorage() as unknown as Storage;

function Probe() {
  const { preference, setPreference, scheme } = useThemePreference();
  return (
    <>
      <Text testID="scheme">{scheme}</Text>
      <Text testID="pref">{preference}</Text>
      <Pressable testID="set-dark" onPress={() => setPreference('dark')}>
        <Text>dark</Text>
      </Pressable>
      <Pressable testID="set-light" onPress={() => setPreference('light')}>
        <Text>light</Text>
      </Pressable>
      <Pressable testID="set-system" onPress={() => setPreference('system')}>
        <Text>system</Text>
      </Pressable>
    </>
  );
}

function FallbackProbe() {
  return <Text testID="scheme">{useEffectiveColorScheme()}</Text>;
}

beforeEach(() => {
  mockUseColorScheme.mockReset();
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
});

describe('ThemePreference', () => {
  it('resolves system → the OS scheme', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    await render(
      <ThemePreferenceProvider>
        <Probe />
      </ThemePreferenceProvider>
    );

    expect(screen.getByTestId('pref').props.children).toBe('system');
    expect(screen.getByTestId('scheme').props.children).toBe('dark');
  });

  it('lets an explicit choice override the OS scheme, and persists it', async () => {
    mockUseColorScheme.mockReturnValue('light');
    await render(
      <ThemePreferenceProvider>
        <Probe />
      </ThemePreferenceProvider>
    );

    expect(screen.getByTestId('scheme').props.children).toBe('light');

    await fireEvent.press(screen.getByTestId('set-dark'));

    expect(screen.getByTestId('scheme').props.children).toBe('dark');
    expect(localStorage.getItem('lightbridge.theme-preference')).toBe('dark');

    await fireEvent.press(screen.getByTestId('set-system'));
    expect(screen.getByTestId('scheme').props.children).toBe('light'); // back to OS (light)
  });

  it('hydrates the persisted preference on mount', async () => {
    localStorage.setItem('lightbridge.theme-preference', 'dark');
    mockUseColorScheme.mockReturnValue('light');

    await render(
      <ThemePreferenceProvider>
        <Probe />
      </ThemePreferenceProvider>
    );

    expect(screen.getByTestId('pref').props.children).toBe('dark');
    expect(screen.getByTestId('scheme').props.children).toBe('dark');
  });

  it('useEffectiveColorScheme falls back to the OS scheme without a provider', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    await render(<FallbackProbe />);

    expect(screen.getByTestId('scheme').props.children).toBe('dark');
  });
});
