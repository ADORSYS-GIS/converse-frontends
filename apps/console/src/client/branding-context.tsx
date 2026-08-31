'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * What runtime white-label logo(s) are configured on this deployment (issue #368, Phase H;
 * extended by the per-theme logos addendum, owner directive 2026-08-31 "White is for dark
 * themes"). Mirrors `session-context.tsx`'s shape/purpose exactly, a small booleans-only value
 * instead of an identity. Seeded by the root layout (a server component, the only place
 * `serverEnv()` is read) so `BrandMark` (`client/console-chrome.tsx`) renders the right mark(s) on
 * first paint instead of always issuing `/branding/logo`/`/branding/logo-light` requests and
 * falling back on a 404 — that would both flash the built-in mark on every unbranded deployment
 * (the common case) and cost wasted round trips on every navigation.
 *
 * `hasLogoLight` is only ever `true` alongside `hasLogo`: `env.ts`'s `buildBrandingConfig` fails
 * config parsing outright on a `branding.logoLight`-without-`branding.logo` deployment (a
 * light-theme-only brand has no mark for `black`, the default theme), so there is no
 * light-only-branded state for this context to represent.
 *
 * Deliberately its own context, not a field bolted onto `SessionResponse`: that type's own doc
 * comment scopes it to identity ("who is signed in... never a token"), and branding configuration
 * is neither a secret nor session-derived — it is the same for every visitor, signed in or not.
 */
export type ConsoleBranding = {
  /** Whether `config.yaml`'s `branding.logo` is configured — the default mark, and the dark-theme
   *  (`black`) mark when `hasLogoLight` is also true. */
  hasLogo: boolean;
  /** Whether `config.yaml`'s `branding.logoLight` is ALSO configured — the light-theme
   *  (`wireframe`) counterpart to `hasLogo`. */
  hasLogoLight: boolean;
};

const BrandingContext = createContext<ConsoleBranding>({ hasLogo: false, hasLogoLight: false });

export function BrandingProvider({
  hasLogo,
  hasLogoLight,
  children,
}: ConsoleBranding & { children: ReactNode }) {
  return (
    <BrandingContext.Provider value={{ hasLogo, hasLogoLight }}>
      {children}
    </BrandingContext.Provider>
  );
}

/** What runtime logo(s) `config.yaml`'s `branding` block configures on this deployment. */
export function useConsoleBranding(): ConsoleBranding {
  return useContext(BrandingContext);
}
