'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
  applyThemePreference,
  readStoredThemePreference,
  type ConsoleThemePreference,
} from '@lightbridge/ui-web/src/lib/theme';

// Ported verbatim from apps/console/src/client/use-console-theme.ts — the shared theme lib
// (`packages/ui-web/src/lib/theme.ts`) was promoted specifically so more than one app could
// reuse this exact contract without re-deriving it.
export function useTheme(): {
  preference: ConsoleThemePreference;
  setPreference: (next: ConsoleThemePreference) => void;
} {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setPreference = useCallback((next: ConsoleThemePreference) => {
    applyThemePreference(next);
    window.dispatchEvent(new StorageEvent('storage'));
  }, []);

  return { preference, setPreference };
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const handleChange = () => {
    applyThemePreference(getSnapshot());
    onChange();
  };
  window.addEventListener('storage', handleChange);
  media.addEventListener('change', handleChange);
  return () => {
    window.removeEventListener('storage', handleChange);
    media.removeEventListener('change', handleChange);
  };
}

function getSnapshot(): ConsoleThemePreference {
  return readStoredThemePreference() ?? 'system';
}

function getServerSnapshot(): ConsoleThemePreference {
  return 'system';
}
