'use client';

import { AccountBadge } from '@lightbridge/ui-web/src/components/account-badge';
import { ConsoleShell } from '@lightbridge/ui-web/src/components/console-shell';
import { MutationFailureBanner } from '@lightbridge/ui-web/src/components/mutation-failure-banner';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  ConsoleHeaderBar,
  adminNavItems,
  navItems,
  routeFromPathname,
} from '../../client/console-chrome';
import {
  notificationText,
  useConsoleNotification,
  useDismissConsoleNotification,
} from '../../client/console-notifications';
import { useConsoleScope } from '../../client/use-console-scope';
import { useConsoleSession } from '../../client/session-context';

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
 * **No state providers wrap any of this any more (ADR 0011 Decision 2).** `ConsoleScopeProvider`
 * and `ConsoleViewStateProviders` existed only to move view state between the centre and the two
 * slots; the query string does that natively and above all three subtrees, so both are deleted
 * rather than wrapped. The layout's client boundary is now the chrome and nothing else — this
 * component reads `useConsoleScope()` directly for the header's org label, exactly the way any
 * other zone does.
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
  const pathname = usePathname();
  const route = routeFromPathname(pathname);
  const session = useConsoleSession();
  const consoleScope = useConsoleScope();
  // converse-frontends#323: the console-wide default visibility path for a failed refine
  // mutation — see `console-notifications.ts`'s module doc comment for the full mechanism.
  const notification = useConsoleNotification();
  const dismissNotification = useDismissConsoleNotification();

  // `allAccounts` (raw rows), NOT `accounts` (flattened to `{id, label}` by `accountScopeLabel`,
  // which renders an unnamed account as "Unnamed account · <full uuid>"). Feeding that label to
  // `AccountBadge` as a `name` put the raw UUID back in the header AND appended the short form
  // beside it — longer and noisier than what the badge replaced. The badge owns its own fallback;
  // it needs the real `name`, or nothing.
  const activeAccount = consoleScope.allAccounts.find(
    (account) => account.id === consoleScope.value.accountId
  );

  // Every route fills the left rail's secondary section: Manage/Admin with a sub-nav, Overview
  // and Api-Keys with their own controls (owner, 2026-08-29 — one rail carries navigation AND the
  // screen's parameters; the content column is content only).
  const LEFT_SECONDARY_LABELS: Record<typeof route, string> = {
    manage: 'Manage',
    settings: 'Settings',
    admin: 'Admin',
    'api-keys': 'Keys',
    overview: 'View',
  };
  const leftSecondaryLabel = LEFT_SECONDARY_LABELS[route];

  // Which routes get the RIGHT rail is decided here, not by whether the slot renders something.
  //
  // A parallel-route slot is always a React element, even when its segment returns `null` — so
  // `ConsoleShell`'s `rightRail ? …` gate is truthy on every route, and Overview/Api-Keys were
  // reserving an empty 280px column (owner screenshot, live). Worse, Next only falls back to
  // `default.tsx` on a HARD navigation: a client-side Admin → Api-Keys move keeps the previously
  // matched `@rail/admin` segment mounted, so Api-Keys rendered Admin's "Select a request to
  // review it." Passing `undefined` for rail-less routes fixes both.
  //
  // Only selection-driven content earns the right rail: Manage and Admin retarget it on the row
  // you pick. Everything else lives in the LEFT rail's secondary section — including `/settings`,
  // whose two sections are both always on screen and neither of which retargets on a selection.
  const hasRightRail = route === 'manage' || route === 'admin';

  return (
    <ConsoleShell
      header={
        <ConsoleHeaderBar
          orgSwitcher={
            // The console's one rendering of which account you are in, and the only place it can
            // be changed. The LABEL, never the raw id: `accounts.id` is the caller's opaque JWT
            // `sub` (ADR-0006), and `accountScopeLabel` keeps a never-named account readable
            // (lightbridge-authz#551 — a nullable name with no truthful backfill).
            <AccountBadge
              accountId={consoleScope.value.accountId}
              name={activeAccount?.name}
              accounts={consoleScope.allAccounts.map((account) => ({
                id: account.id,
                label: account.name,
              }))}
              onSelectAccount={(accountId) => consoleScope.setValue({ accountId, projectId: null })}
              onCopyId={(accountId) => {
                // Best-effort: `navigator.clipboard` is undefined on insecure origins. A failed
                // copy leaves the id in the tooltip, so there is nothing to recover.
                void navigator.clipboard?.writeText?.(accountId).catch(() => undefined);
              }}
            />
          }
        />
      }
      banner={
        <MutationFailureBanner
          message={notificationText(notification)}
          onDismiss={dismissNotification}
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
      rightRail={hasRightRail ? rail : undefined}>
      {children}
    </ConsoleShell>
  );
}
