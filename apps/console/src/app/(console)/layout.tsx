'use client';

import { AccountNameDialog } from '@lightbridge/ui-web/src/components/account-name-dialog';
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
import { useCreateAccountDialog } from '../../containers/use-create-account-dialog';

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
 * and `@scope` parallel-route slots now lives directly inside the affected centres: every screen's
 * parameters are its own `PageHeader.controls`, and phase 3 (2026-08-30, right rail out) replaced
 * `containers/projects-centre.tsx`/`containers/admin-centre.tsx`'s temporary right-hand `<aside>`
 * (their own phase-2 placeholder for the deleted `@rail` slot) with a `DetailSheet` that opens on
 * row selection, at every tier — the console has no persistent rail anywhere any more.
 *
 * Two pieces of state this layout owns rather than either chrome zone or any one routed screen,
 * both for the same reason — two structurally separate triggers have to open the identical
 * instance, and only one trigger is ever visible/reachable at a time:
 *
 *  - the command palette's open/shortcut state (`useConsolePalette`) — the sidebar's search row
 *    and the top bar's palette icon;
 *  - the create-account dialog (`useCreateAccountDialog`, ADR-0026 — lightbridge-authz#564, one
 *    identity may own several accounts) — the workspace switcher's `+ New account` row (any
 *    route) and `/settings/account`'s own `PageHeader` action. Unlike the palette, its open state
 *    is real view state driven by the URL (`?new-account=`), not a lifted local `useState`,
 *    because it also has to open from INSIDE a routed screen's own subtree, which this layout
 *    cannot hand a prop to — see `use-create-account-dialog.ts`'s own doc comment.
 *
 * Auth routes live OUTSIDE this group (`app/auth/*`) and get no shell at all — that is the whole
 * reason the group exists.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const palette = useConsolePalette();
  const createAccount = useCreateAccountDialog();
  // converse-frontends#323: the console-wide default visibility path for a failed refine
  // mutation — see `console-notifications.ts`'s own module doc comment for the full mechanism.
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
      <AccountNameDialog {...createAccount.dialog} />
    </>
  );
}
