import type { Metadata, Viewport } from 'next';

import { Providers } from '../client/providers';
import { readSession } from '../server/session-store';
import { isAdmin } from '../server/tokens';
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
 * `.dark` on `<html>` is unconditional: the console runs dark-only at launch (ADR 0009 Decision 5),
 * and the `.dark` block of `@lightbridge/ui`'s preset is the operative ramp.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  const sessionResponse: SessionResponse = session
    ? {
        authenticated: true,
        user: {
          sub: session.user.sub,
          name: session.user.name,
          preferredUsername: session.user.preferredUsername,
          email: session.user.email,
          roles: session.user.roles,
        },
        isAdmin: isAdmin(session.user.roles),
      }
    : ANONYMOUS_SESSION;

  return (
    // suppressHydrationWarning is scoped to this element's ATTRIBUTES only (children still
    // warn): browser extensions inject attributes like `data-google-analytics-opt-out` on <html>
    // before React hydrates, and Next dev re-logs the false mismatch on every render.
    <html lang="en" className="dark" suppressHydrationWarning>
      {/* `@serwist/next` injects the service-worker registration itself, and only in a production
          build (`disable` in next.config.mjs) — no registration component belongs here. */}
      {/* No `bg-muted font-mono text-soft` here any more: the package stylesheet's own base layer
          already sets exactly that on `body`, and `globals.css` now imports it (console-ui skill
          "One style pipeline"). Repeating it in the app was the second declaration of the same
          rule. */}
      <body>
        <Providers session={sessionResponse}>{children}</Providers>
      </body>
    </html>
  );
}
