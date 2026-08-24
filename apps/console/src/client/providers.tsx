'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import { SessionProvider } from './session-context';
import type { SessionResponse } from '../shared/session-response';

/**
 * Mounts the refine tree browser-only.
 *
 * `ssr: false` is not a convenience here, it is a correctness requirement: the generated cratestack
 * runtime resolves every request URL against an absolute origin and is constructed once, on first
 * use — so a server render would permanently bake a placeholder origin into the singleton. The
 * IndexedDB query persister has the same constraint. ADR 0009 Decision 7 puts data fetching on the
 * client anyway; server components stay reserved for the auth/proxy seam.
 */
const ConsoleProviders = dynamic(
  () => import('./console-providers').then((module) => module.ConsoleProviders),
  { ssr: false }
);

export function Providers({
  session,
  children,
}: {
  session: SessionResponse;
  children: ReactNode;
}) {
  return (
    <SessionProvider value={session}>
      <ConsoleProviders>{children}</ConsoleProviders>
    </SessionProvider>
  );
}
