'use client';

import {
  INSPECTOR_RAIL_DEFAULT_WIDTH,
  INSPECTOR_RAIL_MAX_WIDTH,
  INSPECTOR_RAIL_MIN_WIDTH,
} from '@lightbridge/ui-web/src/lib/shell-grid';
import { useCallback, useSyncExternalStore } from 'react';

/**
 * The inspector rail's width — a per-viewer preference, not view state (ADR 0011 Decision 6's
 * "theme preference... a shared URL must not restyle the app for its recipient" reasoning applies
 * identically here: how wide ONE person likes the rail is not something a link to another person
 * should carry). Same `localStorage` + `useSyncExternalStore` shape `use-console-theme.ts`
 * establishes for the theme toggle, not a `useState` in `ConsoleShell` — `packages/ui-web` stays
 * presentational and controlled (console-ui skill "State").
 *
 * The owner's locked layout contract (2026-08-30 restatement): "Right rail shall be there... and
 * be resizable by drag" — this is the persistence half; `RailResizer` (`packages/ui-web`) is the
 * drag/keyboard-resize affordance itself.
 */
const STORAGE_KEY = 'lightbridge-console-rail-width';

function clamp(width: number): number {
  return Math.min(INSPECTOR_RAIL_MAX_WIDTH, Math.max(INSPECTOR_RAIL_MIN_WIDTH, width));
}

function readStoredWidth(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clamp(parsed) : null;
  } catch {
    // Private-browsing/site-data-blocked: render fine with no stored value.
    return null;
  }
}

function writeStoredWidth(width: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    // Same best-effort contract as every other localStorage write in this app.
  }
}

export function useRailWidth(): { value: number; setValue: (width: number) => void } {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback((width: number) => {
    const clamped = clamp(width);
    writeStoredWidth(clamped);
    // A `localStorage` write does not itself emit a `storage` event in the SAME tab — dispatching
    // one synthetically re-triggers `getSnapshot` here, the identical mechanism
    // `use-console-theme.ts`'s `setPreference` already uses for the same reason.
    window.dispatchEvent(new StorageEvent('storage'));
  }, []);

  return { value, setValue };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function getSnapshot(): number {
  return readStoredWidth() ?? INSPECTOR_RAIL_DEFAULT_WIDTH;
}

function getServerSnapshot(): number {
  return INSPECTOR_RAIL_DEFAULT_WIDTH;
}
