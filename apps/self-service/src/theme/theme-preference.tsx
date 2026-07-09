import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'lightbridge.theme-preference';

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

// Read synchronously at first render so the initial paint already carries the
// user's choice — no flash of the wrong theme. localStorage is web-only (this
// app ships as a pure web product); the guard keeps native/SSR safe.
function readStoredPreference(): ThemePreference {
  if (typeof localStorage === 'undefined') {
    return 'system';
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  return isThemePreference(stored) ? stored : 'system';
}

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** The resolved scheme after applying `system` → OS. */
  scheme: EffectiveColorScheme;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const scheme: EffectiveColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  // Single owner of the NativeWind `.dark` class, driven by the *effective*
  // scheme — this keeps className tokens (CSS variables) in lockstep with the
  // inline `colors.*` palette that useThemeColors resolves from the same scheme.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.classList.toggle('dark', scheme === 'dark');
  }, [scheme]);

  const value = useMemo(
    () => ({ preference, setPreference, scheme }),
    [preference, setPreference, scheme]
  );

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  }
  return ctx;
}

/**
 * The effective light/dark scheme. Reads the ThemePreference context when
 * present; falls back to the raw OS scheme otherwise so isolated renders (e.g.
 * unit tests that mount a view without the provider) still resolve a scheme.
 */
export function useEffectiveColorScheme(): EffectiveColorScheme {
  const ctx = useContext(ThemePreferenceContext);
  const systemScheme = useColorScheme();
  if (ctx) {
    return ctx.scheme;
  }
  return systemScheme === 'dark' ? 'dark' : 'light';
}
