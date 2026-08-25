'use client';

import { useSyncExternalStore } from 'react';

/**
 * Connectivity, for the header's inline status line.
 *
 * `navigator.onLine` plus the `online`/`offline` events is an **external store**, so it is read
 * with `useSyncExternalStore` rather than mirrored into local state by an effect — the same
 * treatment `use-console-theme.ts` gives `localStorage`/`prefers-color-scheme`, and the reason
 * neither hook needs the `useState` that ADR 0011 would otherwise require a justification for
 * (calling `setState` synchronously from an effect body is the `react-hooks/set-state-in-effect`
 * anti-pattern this replaces).
 *
 * The server snapshot is optimistically `true`: there is no navigator during a server render, and
 * a fixed value keeps the first paint deterministic — the client snapshot corrects it on the next
 * paint if the browser really is offline.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}
