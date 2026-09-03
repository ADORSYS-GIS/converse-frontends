import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { CONSOLE_THEME_NO_FLASH_SCRIPT } from '@lightbridge/ui-web/src/lib/theme';

import { Providers } from '../client/providers';
import { loadLocaleBundle } from '../i18n/resources';
import { getServerLocale } from '../i18n/server';
import { chunkCookieName } from '../server/cookie-names';
import { serverEnv } from '../server/env';
import { readSession } from '../server/session-store';
import { GUARDED_PATHNAME_HEADER } from '../shared/request-headers';
import { ANONYMOUS_SESSION, type SessionResponse } from '../shared/session-response';

import './globals.css';

export const metadata: Metadata = {
  title: 'Lightbridge Console',
  description: 'Accounts, projects, API keys and budgets for the Lightbridge AI gateway.',
  manifest: '/manifest.json',
  applicationName: 'Lightbridge Console',
  appleWebApp: { capable: true, title: 'Lightbridge', statusBarStyle: 'black-translucent' },
};

/** Mobile-first (ADR 0009 Decision 6): the phone is a designed target, so the viewport says so. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

/**
 * The root layout is a **server** component, and the only place a page tree touches the session
 * cookie: it decrypts the session once and hands the client tree the sanitized identity — never a
 * token (ADR 0009 Decision 2). Everything below it fetches on the client (Decision 7).
 *
 * The console now has a first-class light theme (ADR 0010 Decision 5): `data-theme` on `<html>`
 * selects `black` (dark, default) or `wireframe` (light) — daisyUI's theme mechanism, never a
 * `dark:`/`.dark` class (console-ui skill "Light theme rules"). No attribute is set here in JSX;
 * the blocking inline script below sets it before first paint (stored preference ->
 * `prefers-color-scheme` -> `black`), so there is no flash and no server/client mismatch to
 * suppress beyond the usual extension-injected-attribute noise.
 */
/**
 * A session cookie that is present but does not open — an expired seal (ADR 0016 D3.1), or one
 * sealed under a secret that has been rotated away (D3.2) — must land the person on sign-in, the
 * same place having no cookie at all lands them.
 *
 * `middleware.ts` cannot make that call: it runs on the edge runtime, where `node:crypto`'s HKDF
 * does not exist, so it checks the first chunk's PRESENCE and nothing more. Before seals carried
 * an `exp` that gap was nearly unreachable and cost only a stale-looking shell. With a 12-hour
 * sliding TTL it is the ordinary end of every working day, so it needs an answer: the root layout
 * is the one place that has both facts — a cookie was sent, and it does not decrypt.
 *
 * Gated on `GUARDED_PATHNAME_HEADER` so this only fires on a request the middleware's matcher
 * actually guarded. `/auth/error` and `/auth/signed-out` are pages under this same layout and are
 * outside that matcher, so a stale cookie cannot bounce someone off the page that explains why
 * their session ended — and there is no redirect loop, because `/auth/login` is a route handler
 * with no layout at all.
 */
async function redirectTargetForStaleSession(session: unknown): Promise<string | null> {
  if (session) return null;

  const guardedPathname = (await headers()).get(GUARDED_PATHNAME_HEADER);
  if (guardedPathname === null) return null;

  const store = await cookies();
  if (!store.has(chunkCookieName(0))) return null;

  return guardedPathname && guardedPathname !== '/'
    ? `/auth/login?returnTo=${encodeURIComponent(guardedPathname)}`
    : '/auth/login';
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();

  const staleSessionTarget = await redirectTargetForStaleSession(session);
  if (staleSessionTarget) redirect(staleSessionTarget);

  // ADR 0017 (i18n). The locale is resolved ONCE per request, here, from the `lb.locale` cookie
  // then `Accept-Language` then `en` — there is no `/[locale]/…` path segment (ADR 0013 keeps
  // console paths stable), so this layout is the only place that resolution can happen. It sits
  // AFTER the stale-session redirect on purpose: a request that is about to be bounced to
  // `/auth/login` renders nothing, so loading a message bundle for it would be work thrown away.
  // The whole bundle for the resolved locale then travels down with the tree, so the client
  // instance initializes SYNCHRONOUSLY and the first client paint is already translated (see
  // `i18n/client.tsx`).
  const locale = await getServerLocale();
  const messages = await loadLocaleBundle(locale);
  const sessionResponse: SessionResponse = session
    ? {
        authenticated: true,
        user: {
          sub: session.user.sub,
          platformUserId: session.user.platformUserId,
          name: session.user.name,
          preferredUsername: session.user.preferredUsername,
          email: session.user.email,
          roles: session.user.roles,
        },
        permissions: session.user.permissions,
        accessVerified: session.user.accessVerified,
      }
    : ANONYMOUS_SESSION;

  // issue #368 (Phase H, runtime white-label branding; per-theme logos addendum, owner directive
  // 2026-08-31 "White is for dark themes"): these reads are cheap (`serverEnv()` is cached for the
  // process lifetime after its first call) and decide, once per request, whether this
  // deployment's chrome has anything to override at all.
  const branding = serverEnv().branding;
  const hasLogo = Boolean(branding?.logoPath);
  const hasLogoLight = Boolean(branding?.logoLightPath);
  const hasCustomStyle = Boolean(branding?.stylePath);

  return (
    // suppressHydrationWarning is scoped to this element's ATTRIBUTES only (children still
    // warn): browser extensions inject attributes like `data-google-analytics-opt-out` on <html>
    // before React hydrates, and Next dev re-logs the false mismatch on every render -- the same
    // reason it also covers the no-flash script below setting `data-theme` pre-hydration.
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Blocking (no `async`/`defer`) and first in `<head>`: runs before any paint, so
            `data-theme` is already correct by the time the stylesheet's `[data-theme]` rules
            apply -- no dark<->light flash (ADR 0010 Decision 5). */}
        <script dangerouslySetInnerHTML={{ __html: CONSOLE_THEME_NO_FLASH_SCRIPT }} />
        {/* issue #368 (Phase H): the operator's own daisyUI custom-property overrides
            (`GET /branding/override.css` -- already filtered server-side, see that route's own
            doc comment) as the LAST stylesheet `<head>` renders, after `globals.css`'s import
            (which Next hoists ahead of any author-written `<head>` content) and after this
            layout's own JSX, so the cascade's normal "later wins" rule -- not specificity -- is
            what lets it override `theme.css`'s own variable values for the SAME theme name. No
            `precedence` prop: that would opt this sheet into React's stylesheet-dedup ordering,
            which reorders by precedence-group rather than document position -- the opposite of
            what "after the app's own styles" needs here. */}
        {hasCustomStyle ? <link rel="stylesheet" href="/branding/override.css" /> : null}
      </head>
      {/* Service-worker registration is `SerwistProvider`, mounted inside `Providers`
          (`../client/providers.tsx`) — it needs `'use client'`, and this layout is a server
          component, so it cannot be rendered directly here. */}
      {/* No `bg-muted font-mono text-soft` here any more: the package stylesheet's own base layer
          already sets exactly that on `body`, and `globals.css` now imports it (console-ui skill
          "One style pipeline"). Repeating it in the app was the second declaration of the same
          rule. */}
      <body>
        {/* nuqs' App Router adapter (ADR 0011): it binds `useQueryState`/`useQueryStates` to
            Next's router and to `useSearchParams`, and it is mounted HERE, outside `Providers`,
            for two reasons. It is the outermost thing any zone can need — the `(console)` layout's
            own chrome reads scope from the URL — and unlike `Providers` it is not
            `ssr: false`-dynamic, so the query string is readable on the server render too. It is
            not a store: the URL is the state, this only wires the reads and writes to it. */}
        <NuqsAdapter>
          <Providers
            session={sessionResponse}
            hasLogo={hasLogo}
            hasLogoLight={hasLogoLight}
            locale={locale}
            messages={messages}>
            {children}
          </Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
