'use client';

import { ConsoleShell } from '@lightbridge/ui-web/src/components/console-shell';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { ConsoleHeaderBar, adminNavItems, navItems, routeFromPathname } from '../../client/console-chrome';
import { ConsoleScopeProvider, useConsoleScopeContext } from '../../client/console-scope-context';
import { useConsoleSession } from '../../client/session-context';
import { ConsoleViewStateProviders } from '../../client/view-state';

/**
 * The console's persistent shell — mounted **exactly once**, for every route in the `(console)`
 * group (console-ui skill "Composition — sections in the library, the shell mounted once, pages
 * only in stories").
 *
 * Before this, every route imported a monolithic `*Page` that mounted its own
 * ConsoleShell/ConsoleHeader/NavSpine, so navigating rebuilt the entire chrome, no shell state
 * could survive a route change, and every route bundled the whole shell. Now the chrome lives
 * here and the routes supply only content, through three zones:
 *
 *  - `children` — the centre column, from `(console)/<route>/page.tsx`.
 *  - `rail` — the right rail, from the `@rail` parallel-route slot.
 *  - `scope` — the left rail's secondary section (the SCOPE echo, or a section sub-nav), from the
 *    `@scope` parallel-route slot. It is a slot rather than something derived from the pathname
 *    here because its content is per-route *data* (a sub-nav's counts), not just a label.
 *
 * Both slots carry a `default.tsx`, so a route that has nothing to put in a rail simply renders
 * nothing there rather than 404-ing the whole segment.
 *
 * Auth routes live OUTSIDE this group (`app/auth/*`) and get no shell at all — that is the whole
 * reason the group exists.
 *
 * Nav active state comes from `usePathname()`: nothing remounts on navigation any more, so there
 * is no mount-time route prop to read it from.
 */
export default function ConsoleLayout({
  children,
  rail,
  scope,
}: {
  children: ReactNode;
  rail: ReactNode;
  scope: ReactNode;
}) {
  return (
    <ConsoleScopeProvider>
      <ConsoleViewStateProviders>
        <ConsoleChrome rail={rail} scope={scope}>
          {children}
        </ConsoleChrome>
      </ConsoleViewStateProviders>
    </ConsoleScopeProvider>
  );
}

/** Inside the providers, so the header's org switcher can read the live scope. */
function ConsoleChrome({
  children,
  rail,
  scope,
}: {
  children: ReactNode;
  rail: ReactNode;
  scope: ReactNode;
}) {
  const pathname = usePathname();
  const route = routeFromPathname(pathname);
  const session = useConsoleSession();
  const consoleScope = useConsoleScopeContext();

  const leftSecondaryLabel =
    route === 'manage' ? 'Manage' : route === 'admin' ? 'Admin' : 'Scope';

  return (
    <ConsoleShell
      header={
        <ConsoleHeaderBar
          orgSwitcher={
            <span className="font-mono text-xs text-soft">
              {consoleScope.value.accountId || '—'}
            </span>
          }
        />
      }
      nav={{
        items: navItems(route),
        adminItems: adminNavItems(route),
        showAdmin: session.isAdmin,
        // `next/link` (not the `<a href>` `NavSpine` falls back to): the App Router only
        // intercepts clicks on its own `Link` for a client-side transition. Without this, every
        // nav click was a full document reload — the console's actual "black screen between
        // navigations" root cause (README §"Composition" persistent-shell contract was correct in
        // the code, just never exercised because navigation itself never went through it).
        linkComponent: Link,
      }}
      leftSecondary={scope}
      leftSecondaryLabel={leftSecondaryLabel}
      rightRail={rail}>
      {children}
    </ConsoleShell>
  );
}
