'use client';

import { ConsoleShell } from '@lightbridge/ui-web/src/components/console-shell';
import { MutationFailureBanner } from '@lightbridge/ui-web/src/components/mutation-failure-banner';
import type { ReactNode } from 'react';

import {
  ConsolePaletteDialog,
  ConsoleSidebarContent,
  ConsoleTopBarContent,
  useConsolePalette,
} from '../../client/console-chrome';
import {
  notificationText,
  useConsoleNotification,
  useDismissConsoleNotification,
} from '../../client/console-notifications';

/**
 * The console's persistent shell — mounted **exactly once**, for every route in the `(console)`
 * group (console-ui skill "Composition — sections in the library, the shell mounted once, pages
 * only in stories").
 *
 * Shell revamp phase 2 (2026-08-30): the three-rail, header-band shell is gone. `ConsoleShell` now
 * takes exactly two composed chrome slots — `sidebar` and `topBar` — plus the console-wide
 * `banner`. Both slots are fully self-contained (`ConsoleSidebarContent`/`ConsoleTopBarContent` in
 * `client/console-chrome.tsx` read the session, the scope and the pathname themselves), so this
 * layout has nothing left to compute or thread through props — no `route`, no per-route rail
 * gating, no `leftSecondary`/`rightRail` slot content. What used to live in the deleted `@rail`
 * and `@scope` parallel-route slots now lives directly inside the affected centres
 * (`containers/manage-centre.tsx`, `containers/admin-centre.tsx` render their own right-hand
 * `<aside>` at `lg`; every other screen's parameters moved into its own `PageHeader.controls`).
 *
 * The ONE piece of state this layout still owns is the command palette's open/shortcut state
 * (`useConsolePalette`) — it has to be lifted here rather than owned by either chrome zone,
 * because both the sidebar's search row and the top bar's palette icon open the SAME instance,
 * and only one of the two zones is ever visible at a given tier.
 *
 * Auth routes live OUTSIDE this group (`app/auth/*`) and get no shell at all — that is the whole
 * reason the group exists.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const palette = useConsolePalette();
  // converse-frontends#323: the console-wide default visibility path for a failed refine
  // mutation — see `console-notifications.ts`'s module doc comment for the full mechanism.
  const notification = useConsoleNotification();
  const dismissNotification = useDismissConsoleNotification();

  return (
    <>
      <ConsoleShell
        sidebar={<ConsoleSidebarContent onOpenPalette={() => palette.setOpen(true)} />}
        topBar={<ConsoleTopBarContent onOpenPalette={() => palette.setOpen(true)} />}
        banner={
          <MutationFailureBanner
            message={notificationText(notification)}
            onDismiss={dismissNotification}
          />
        }>
        {children}
      </ConsoleShell>
      <ConsolePaletteDialog
        open={palette.open}
        onOpenChange={palette.setOpen}
        groups={palette.groups}
      />
    </>
  );
}
