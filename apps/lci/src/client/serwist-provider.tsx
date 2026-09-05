'use client';

import { SerwistProvider } from '@serwist/turbopack/react';
import type { ReactNode } from 'react';

/**
 * Registers `/serwist/sw.js` for the whole app. `register` is gated on `NODE_ENV` (Next replaces
 * this at build time in both server and client bundles) rather than left at the component's own
 * `true` default, because in development it would serve a stale precached shell over every edit.
 * `reloadOnOnline={false}`: an unwanted full-page reload the instant connectivity returns is not
 * something this app wants (unlike the package's own `true` default).
 */
export function LciServiceWorker({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      register={process.env.NODE_ENV === 'production'}
      reloadOnOnline={false}>
      {children}
    </SerwistProvider>
  );
}
