'use client';

/**
 * `core-js/stable` — a global, eager, side-effect import.
 *
 * `providers.tsx` is `'use client'` and is mounted once by the root layout
 * (`../app/layout.tsx`) around the entire page tree, so this import (unlike the `ConsoleProviders`
 * import a few lines down, which is deliberately deferred via `next/dynamic`) is a *static* import
 * at module top level: it lands in the shared client entry chunk and runs in the browser on every
 * route, before any route-specific code. That placement matters — the root layout itself is a
 * **server** component (see its doc comment), and importing a polyfill there would patch the
 * Node.js runtime instead, shipping nothing to users while still looking like it worked.
 *
 * What this DOES: polyfills JS standard-library *built-ins/APIs* (e.g. `Array.prototype.at`,
 * `Object.groupBy`, `Promise.withResolvers`) so they exist even on a browser engine that predates
 * them.
 *
 * What this does NOT do: down-level *syntax* (optional chaining, nullish coalescing, class
 * fields, etc.) — that's Next/SWC's job, driven by `browserslist` below, and is untouched by
 * core-js entirely.
 *
 * `browserslist` in `apps/console/package.json` is deliberately left at `chrome 111` / `edge 111`
 * / `firefox 111` / `safari 16.4` for production and stays that way. Do NOT lower it to "match"
 * this polyfill: at older targets, Turbopack/LightningCSS folds daisyUI's selector lists into
 * `:is()`, whose specificity is set by its *most specific* argument, so daisyUI's stock theme
 * values silently beat this project's overrides and the whole `#DA5C2C` accent system reverts to
 * grey — no error, no warning, no failing test (see the `development` entry pinned at
 * `firefox 121` for the same reason). Net effect: this import only broadens standard-library API
 * coverage for the already-supported browser floor; it does not add support for older browsers.
 */
import 'core-js/stable';

import { ensureCborCodecReady } from '@lightbridge/authz-rpc';
import { SerwistProvider } from '@serwist/turbopack/react';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import { BrandingProvider } from './branding-context';
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
  hasLogo,
  hasLogoLight,
  children,
}: {
  session: SessionResponse;
  /** issue #368 (Phase H): whether `config.yaml`'s `branding.logo` is configured on this
   *  deployment — read server-side by the root layout, the only place `serverEnv()` runs. */
  hasLogo: boolean;
  /** Per-theme logos addendum (owner directive 2026-08-31, "White is for dark themes"): whether
   *  `config.yaml`'s `branding.logoLight` is ALSO configured. */
  hasLogoLight: boolean;
  children: ReactNode;
}) {
  return (
    // ADR 0009 Decision 7: the service worker is a production concern. `register` is gated on
    // `NODE_ENV` (Next replaces this at build time in both server and client bundles) rather than
    // left at the component's own `true` default, because in development it would serve a stale
    // precached shell over every edit — the same reasoning that used to live in `next.config.mjs`'s
    // `withSerwistInit({ disable: ... })` before `@serwist/turbopack` removed that option.
    // `reloadOnOnline={false}` preserves the old `withSerwistInit({ reloadOnOnline: false })`
    // setting: an unwanted full-page reload the instant connectivity returns is not something this
    // app wants (unlike the package's own `true` default).
    <SerwistProvider
      swUrl="/serwist/sw.js"
      register={process.env.NODE_ENV === 'production'}
      reloadOnOnline={false}>
      <SessionProvider value={session}>
        <BrandingProvider hasLogo={hasLogo} hasLogoLight={hasLogoLight}>
          <ConsoleProviders>{children}</ConsoleProviders>
        </BrandingProvider>
      </SessionProvider>
    </SerwistProvider>
  );
}
