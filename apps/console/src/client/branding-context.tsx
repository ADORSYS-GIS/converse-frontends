'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Whether a runtime white-label logo is configured (issue #368, Phase H) — mirrors
 * `session-context.tsx`'s shape/purpose exactly, one boolean instead of an identity. Seeded by
 * the root layout (a server component, the only place `serverEnv()` is read) so `BrandMark`
 * (`client/console-chrome.tsx`) renders the right mark on first paint instead of always issuing a
 * `/branding/logo` request and falling back on a 404 — that would both flash the built-in mark on
 * every unbranded deployment (the common case) and cost a wasted round trip on every navigation.
 *
 * Deliberately its own context, not a field bolted onto `SessionResponse`: that type's own doc
 * comment scopes it to identity ("who is signed in... never a token"), and branding configuration
 * is neither a secret nor session-derived — it is the same for every visitor, signed in or not.
 */
const BrandingContext = createContext<boolean>(false);

export function BrandingProvider({
  hasCustomLogo,
  children,
}: {
  hasCustomLogo: boolean;
  children: ReactNode;
}) {
  return <BrandingContext.Provider value={hasCustomLogo}>{children}</BrandingContext.Provider>;
}

/** Whether `config.yaml`'s `branding.logo` is configured on this deployment. */
export function useConsoleBrandingLogo(): boolean {
  return useContext(BrandingContext);
}
