'use client';

import { AccountNameDialog } from '@lightbridge/ui-web/src/components/account-name-dialog';
import { ConsoleShell } from '@lightbridge/ui-web/src/components/console-shell';
import { CreateProjectDialog } from '@lightbridge/ui-web/src/components/create-project-dialog';
import { MutationFailureBanner } from '@lightbridge/ui-web/src/components/mutation-failure-banner';
import { RequestRefillDialog } from '@lightbridge/ui-web/src/components/request-refill-dialog';
import { usePathname, useSearchParams } from 'next/navigation';
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
import { useRailWidth } from '../../client/use-rail-width';
import { InspectorRail } from '../../containers/inspector-rail';
import { useCreateAccountDialog } from '../../containers/use-create-account-dialog';
import { useCreateProjectDialog } from '../../containers/use-create-project-dialog';
import { useRenameAccountDialog } from '../../containers/use-rename-account-dialog';
import { useRequestRefillDialog } from '../../containers/use-request-refill-dialog';

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
 * **The rail returned** (2026-08-30 owner round: "I liked it when the right rail was there... We
 * could display settings there"), and the owner's SAME-DAY follow-up fixed its content policy:
 * "the right rail was empty depending on the situation. Solution: hide it if empty. Simple." —
 * `containers/inspector-rail.tsx` resolves what goes in it (a selection's detail on `/projects`/
 * `/admin`, the scope quick-settings panel standing on `/`, nothing everywhere else), but WHETHER
 * to mount it at all is decided HERE, not inside that component: `ConsoleShell` collapses its rail
 * column when `rail` is falsy, and a React element is always truthy regardless of what it renders
 * internally — so `<InspectorRail />` itself can never be the value passed to `rail`, or the
 * column would show (chrome, border, resizer) even on a route with nothing to put in it. This
 * layout reads the pathname and the raw selection query params — cheap, no data fetching of its
 * own — to decide only WHETHER to mount `InspectorRail` at all; the component decides WHAT once
 * mounted. This also means `InspectorRail`'s own route-specific screen hooks
 * (`useProjectsScreen`/`useRefillsQueueScreen`) never fire on a route where their content would not be
 * shown anyway — no wasted query on `/api-keys`, `/settings/*`, or an unselected `/projects`.
 *
 * The owner's locked layout contract (2026-08-30 restatement): "Right rail shall be there... and
 * be resizable by drag" — `railWidth`/`onRailWidthChange` (`use-rail-width.ts`, a per-viewer
 * `localStorage` preference) is the persistence half; `RailResizer` (inside `ConsoleShell`) is the
 * drag/keyboard affordance.
 *
 * Below `lg`, `ConsoleShell` never renders the rail column at all (`INSPECTOR_RAIL_CLASS`'s own
 * `hidden lg:flex`) — the SAME selection-driven content instead opens as a `BottomSheet` from each
 * route's own centre (`projects-centre.tsx`, `refills-queue-centre.tsx`), and the quick-settings panel has
 * no below-`lg` equivalent at all (its actions are reachable via the Budget card, the switcher and
 * `/settings` directly there).
 *
 * Five dialogs mount here, alongside the shell, for the identical reason each time: two or more
 * structurally separate subtrees need to open the SAME instance, which only a layout-level mount
 * makes possible (`use-create-account-dialog.ts`'s own doc comment is the canonical explanation;
 * `use-rename-account-dialog.ts`, `use-request-refill-dialog.ts` and `use-create-project-dialog.ts`
 * follow it for their own verbs — account rename, budget refill request and project creation, each
 * now reachable from the inspector rail and/or a second screen in addition to their original
 * screen-local trigger).
 *
 * Auth routes live OUTSIDE this group (`app/auth/*`) and get no shell at all — that is the whole
 * reason the group exists.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const palette = useConsolePalette();
  const createAccount = useCreateAccountDialog();
  const createProject = useCreateProjectDialog();
  const renameAccount = useRenameAccountDialog();
  const requestRefill = useRequestRefillDialog();
  const railWidth = useRailWidth();
  // converse-frontends#323: the console-wide default visibility path for a failed refine
  // mutation — see `console-notifications.ts`'s own module doc comment for the full mechanism.
  const notification = useConsoleNotification();
  const dismissNotification = useDismissConsoleNotification();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Raw query-param reads, not `useManageParams`/`useAdminParams` — this layout only needs to
  // know WHETHER a selection exists to decide whether to mount `InspectorRail` at all (see this
  // file's own doc comment); the typed parsers, and the actual data fetch, live inside the
  // screen hooks `InspectorRail` itself calls once mounted.
  //
  // `/accounts/<id>/overview|projects` segment matches (IA v3 phase 1).
  //
  // IA v3 phase 2 ("the settings area") adds the FIRST clause: `/settings/*` never shows a rail,
  // at any tier, on any selection — the deliverable is explicit ("no right rail anywhere in
  // settings"). This also retires the old `pathname === '/admin' && …'request'` clause outright
  // rather than translating it to `/settings/refills-queue`: `/admin` itself is gone (moved
  // wholesale, `git mv … settings/refills-queue`), and its selection-driven review detail is now
  // ALWAYS a `BottomSheet` — `refills-queue-centre.tsx`'s own doc comment on why its sheet lost
  // its `lg:hidden` gating: with no rail to hand off to at `lg`+, the sheet is the review surface
  // at every tier, not only below it.
  const accountScopedSegment = pathname.match(/^\/accounts\/[^/]+\/([^/]+)/)?.[1];
  const showRail =
    !pathname.startsWith('/settings') &&
    (accountScopedSegment === 'overview' ||
      (accountScopedSegment === 'projects' && Boolean(searchParams.get('row'))));

  return (
    <>
      <ConsoleShell
        sidebar={<ConsoleSidebarContent onOpenPalette={() => palette.setOpen(true)} />}
        topBar={<ConsoleTopBarContent onOpenPalette={() => palette.setOpen(true)} />}
        rail={showRail ? <InspectorRail /> : undefined}
        railWidth={railWidth.value}
        onRailWidthChange={railWidth.setValue}
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
      <RequestRefillDialog {...requestRefill.dialog} />
    </>
  );
}
