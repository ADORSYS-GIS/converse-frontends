'use client';

import { AccountNameDialog } from '@lightbridge/ui-web/src/components/account-name-dialog';
import { ConsoleShell } from '@lightbridge/ui-web/src/components/console-shell';
import { CreateProjectDialog } from '@lightbridge/ui-web/src/components/create-project-dialog';
import { MutationFailureBanner } from '@lightbridge/ui-web/src/components/mutation-failure-banner';
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
 * `containers/inspector-rail.tsx` resolves what goes in it (a selected project's detail on
 * `/projects`, nothing everywhere else — IA v3 phase 3 deletes the standing quick-settings panel
 * that used to be `/accounts/<id>/overview`'s own "otherwise" content, owner: "account
 * mutations/creation/refill on the Overview rail makes no sense"), but WHETHER to mount it at all
 * is decided HERE, not inside that component: `ConsoleShell` collapses its rail column when `rail`
 * is falsy, and a React element is always truthy regardless of what it renders internally — so
 * `<InspectorRail />` itself can never be the value passed to `rail`, or the column would show
 * (chrome, border, resizer) even on a route with nothing to put in it. This layout reads the
 * pathname and the raw selection query params — cheap, no data fetching of its own — to decide
 * only WHETHER to mount `InspectorRail` at all; the component decides WHAT once mounted. This also
 * means `InspectorRail`'s own route-specific screen hooks (`useProjectsScreen`) never fire on a
 * route where their content would not be shown anyway — no wasted query on `/`, `/api-keys`,
 * `/settings/*`, or an unselected `/projects`.
 *
 * The owner's locked layout contract (2026-08-30 restatement): "Right rail shall be there... and
 * be resizable by drag" — `railWidth`/`onRailWidthChange` (`use-rail-width.ts`, a per-viewer
 * `localStorage` preference) is the persistence half; `RailResizer` (inside `ConsoleShell`) is the
 * drag/keyboard affordance.
 *
 * Below `lg`, `ConsoleShell` never renders the rail column at all (`INSPECTOR_RAIL_CLASS`'s own
 * `hidden lg:flex`) — the SAME selection-driven content instead opens as a `BottomSheet` from each
 * route's own centre (`projects-centre.tsx`).
 *
 * Four dialogs mount here, alongside the shell, for the identical reason each time: two or more
 * structurally separate subtrees need to open the SAME instance, which only a layout-level mount
 * makes possible (`use-create-account-dialog.ts`'s own doc comment is the canonical explanation;
 * `use-rename-account-dialog.ts` and `use-create-project-dialog.ts` follow it for their own verbs
 * — account rename and project creation, each reachable from more than one screen). Budget refill
 * is NOT a fifth: IA v3 phase 3 deletes `RequestRefillDialog` outright — every refill trigger now
 * navigates to its own page, `/accounts/<id>/refill`, rather than opening a shared dialog instance.
 *
 * Auth routes live OUTSIDE this group (`app/auth/*`) and get no shell at all — that is the whole
 * reason the group exists.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const palette = useConsolePalette();
  const createAccount = useCreateAccountDialog();
  const createProject = useCreateProjectDialog();
  const renameAccount = useRenameAccountDialog();
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
  // `/accounts/<id>/projects` selection match (IA v3 phase 1). IA v3 phase 3 removes the
  // `overview` clause that used to stand the quick-settings panel on `/accounts/<id>/overview` at
  // all times — that panel (`InspectorSettingsPanel`) is deleted outright (owner: "account
  // mutations/creation/refill on the Overview rail makes no sense"), so the rail is now ONLY ever
  // a selected project's detail, the same "selection-driven, never a standing default" rule
  // `/settings/*` already followed.
  const accountScopedSegment = pathname.match(/^\/accounts\/[^/]+\/([^/]+)/)?.[1];
  const showRail = accountScopedSegment === 'projects' && Boolean(searchParams.get('row'));

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
    </>
  );
}
