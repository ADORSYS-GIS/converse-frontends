'use client';

import { AccountNameDialog } from '@lightbridge/ui-web/src/components/account-name-dialog';
import { ConsoleShell } from '@lightbridge/ui-web/src/components/console-shell';
import { CreateProjectDialog } from '@lightbridge/ui-web/src/components/create-project-dialog';
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
import { useCreateProjectDialog } from '../../containers/use-create-project-dialog';
import { useRenameAccountDialog } from '../../containers/use-rename-account-dialog';

/**
 * The console's persistent shell — mounted **exactly once**, for every route in the `(console)`
 * group (console-ui skill "Composition — sections in the library, the shell mounted once, pages
 * only in stories").
 *
 * Shell revamp phase 2 (2026-08-30): the three-rail, header-band shell is gone. `ConsoleShell` now
 * takes `{ sidebar, topBar, rail?, railWidth?, onRailWidthChange?, banner?, children }`. Both
 * `sidebar`/`topBar` are fully self-contained (`ConsoleSidebarContent`/`ConsoleTopBarContent` in
 * `client/console-chrome.tsx` read the session, the scope and the pathname themselves).
 *
 * **The rail is gone from this app entirely, IA v3 phase E** (the `/settings/accounts` move):
 * `ConsoleShell`'s `rail`/`railWidth`/`onRailWidthChange` props still exist on the primitive
 * itself (a reusable shell shape `packages/ui-web`'s own stories still exercise), but nothing in
 * `apps/console` feeds them any more. The rail's own contract was always narrower than "a right
 * column" — ADR 0013 D2/D3 pinned it to exactly ONE case, `/accounts/<id>/projects` with a row
 * selected, everywhere else collapsed rather than shown empty. That one case moved wholesale to
 * `/settings/accounts/<id>/projects` (this phase), which — like every `/settings/*` route — has
 * no right rail at any tier by construction (ADR 0013 D2: "no right rail in settings, at any
 * tier"). With its one live case gone, the rail has no remaining destination to resolve content
 * for, so the resolver (`containers/inspector-rail.tsx`), its `showRail` pathname/selection check,
 * and the persisted-width hook (`client/use-rail-width.ts`) are deleted outright rather than kept
 * as dead branches that would always evaluate to "no rail" — the same "hide it if empty" instinct
 * this layout already applied to the rail's CONTENT, now applied to whether it is wired at all.
 * `/settings/accounts/<id>/projects`' own selection detail is `BottomSheet` at every tier instead
 * — the same surface `/admin/refills-queue` already uses for the identical reason.
 *
 * Four dialogs mount here, alongside the shell, for the identical reason each time: two or more
 * structurally separate subtrees need to open the SAME instance, which only a layout-level mount
 * makes possible (`use-create-account-dialog.ts`'s own doc comment is the canonical explanation;
 * `use-rename-account-dialog.ts` and `use-create-project-dialog.ts` follow it for their own verbs
 * — account rename and project creation, each reachable from more than one screen). Budget refill
 * is NOT a fifth: IA v3 phase 3 deletes `RequestRefillDialog` outright — every refill trigger now
 * navigates to its own page, `/settings/accounts/<id>/request-refill`, rather than opening a
 * shared dialog instance.
 *
 * Auth routes live OUTSIDE this group (`app/auth/*`) and get no shell at all — that is the whole
 * reason the group exists.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const palette = useConsolePalette();
  const createAccount = useCreateAccountDialog();
  const createProject = useCreateProjectDialog();
  const renameAccount = useRenameAccountDialog();
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
      <AccountNameDialog {...renameAccount.dialog} />
      <CreateProjectDialog {...createProject.dialog} />
    </>
  );
}
