'use client';

import { ensureCborCodecReady } from '@lightbridge/authz-rpc';
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
 *
 * This is also where the app's CBOR codec gets its one-time async init out of the way.
 * `@lightbridge/authz-rpc`'s single codec (`@cratestack/cbor`, see `packages/authz-rpc/src/
 * codec.ts`) has a one-time async WASM instantiation — see that module's doc comment for why.
 * `ensureCborCodecReady()` is awaited alongside the `./console-providers` chunk itself, so
 * `ConsoleProviders` (and the `useConsoleAuthzClient`/`useConsoleBudgetClient` hooks it calls,
 * which construct their `AuthzRpcRuntime` without an explicit `codec` override and so need the
 * default codec synchronously) never renders until the codec is ready. This adds no NEW loading
 * state: the `ssr: false` boundary already shows nothing until the dynamic import resolves, so
 * extending that same wait by the codec's one-time init is not a first-render regression, just a
 * slightly longer version of a wait that already existed.
 */
const ConsoleProviders = dynamic(
  () =>
    Promise.all([import('./console-providers'), ensureCborCodecReady()]).then(
      ([module]) => module.ConsoleProviders
    ),
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
