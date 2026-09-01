'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
  applyThemePreference,
  readStoredThemePreference,
  type ConsoleThemePreference,
} from '@lightbridge/ui-web/src/lib/theme';

/**
 * The `ThemeToggle` component's state (ADR 0010 Decision 5), read from `localStorage` via
 * `useSyncExternalStore` rather than an effect + local `useState` -- `localStorage` and
 * `prefers-color-scheme` are both external stores, which is exactly what the hook exists for
 * (calling `setState` synchronously inside an effect body is the anti-pattern it replaces:
 * `react-hooks/set-state-in-effect`). The server snapshot is fixed at `'system'` so server and
 * first client render agree; the client snapshot corrects itself on the next paint, matching the
 * pre-hydration script's own resolution order (stored preference -> `prefers-color-scheme` ->
 * `black`).
 */
export function useConsoleTheme(): {
  preference: ConsoleThemePreference;
  setPreference: (next: ConsoleThemePreference) => void;
} {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setPreference = useCallback((next: ConsoleThemePreference) => {
    applyThemePreference(next);
    // A native `storage` event only fires in OTHER tabs, never the tab that made the write, so
    // this tab's own subscribers would otherwise never re-check the snapshot. Dispatching one
    // synthetically re-triggers `getSnapshot` here too.
    window.dispatchEvent(new StorageEvent('storage'));
  }, []);

  return { preference, setPreference };
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const handleChange = () => {
    // Re-apply directly (not via React state) so the DOM attribute stays correct even when the
    // live preference is `'system'` and only `prefers-color-scheme` changed -- the stored
    // preference value itself is unchanged in that case, so `getSnapshot()` returns the same
    // primitive and React would not otherwise re-render for it.
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
