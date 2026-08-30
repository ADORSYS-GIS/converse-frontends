'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { ProjectNameDialog } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { InspectorSettingsPanel } from '@lightbridge/ui-web/src/sections/inspector-settings-panel';
import { ProjectDetail } from '@lightbridge/ui-web/src/sections/project-detail';
import { usePathname } from 'next/navigation';

import { accountScopeLabel } from './account-label';
import { useConsoleScope } from '../client/use-console-scope';
import { useOpenCreateAccountDialog } from './use-create-account-dialog';
import { useOpenCreateProjectDialog } from './use-create-project-dialog';
import { useOpenRenameAccountDialog } from './use-rename-account-dialog';
import { useOpenRequestRefillDialog } from './use-request-refill-dialog';
import { useProjectRename } from './use-project-rename';
import { useProjectsScreen } from './use-projects-screen';

/**
 * `ConsoleShell.rail`'s content resolver — mounted exactly once, from `app/(console)/layout.tsx`,
 * beside the shell itself (console-ui skill "Composition — chrome mounted once").
 *
 * **Content policy, the owner's final word on it (2026-08-30, two rounds on the same day):**
 * round one asked for a rail that is "never empty by construction"; round two corrected that to
 * "the right rail was empty depending on the situation. Solution: hide it if empty. Simple." —
 * this resolver follows the SECOND, more specific instruction, which is stricter, not the first:
 *
 *  - `/accounts/<id>/projects` — the selected project's detail, ONLY while a row is selected. No
 *    selection, no rail (returns `undefined`, which collapses `ConsoleShell`'s rail column
 *    entirely — see its own doc comment).
 *  - `/accounts/<id>/overview` — the scope quick-settings panel, ALWAYS. This is the one STANDING
 *    case: the owner explicitly wanted account settings visible in the rail, and on the dashboard
 *    it has a real job beside the Budget card (account identity, `+ New account`/`+ New project`,
 *    and `Request refill` — the same dialog the Budget card's own actions open).
 *  - every other route (`/`, `/accounts/<id>/api-keys`, `/settings/*`) — no rail. `/settings/*`
 *    (IA v3 phase 2, "the settings area") never shows a rail at any tier or on any selection at
 *    all — the deliverable is explicit ("no right rail anywhere in settings"), which is also why
 *    `/admin`'s old rail branch is gone outright rather than translated to
 *    `/settings/refills-queue`: that screen's review detail is now ALWAYS a `BottomSheet`
 *    (`refills-queue-centre.tsx`), with no `lg:hidden` gate to hand off to a rail that no longer
 *    exists for it. `/` (the account resolver, IA v3 phase 1) has no scoped account settled yet
 *    to show one for either.
 *
 * Below `lg`, none of this renders at all — `ConsoleShell` only mounts the `rail` slot inside its
 * `lg:flex` column, so this component's own output is simply never placed on screen there; the
 * SAME selection-driven content instead opens as a `BottomSheet` from each route's own centre
 * (`projects-centre.tsx`).
 *
 * Reuses the FULL screen hook (`useProjectsScreen`) rather than a narrower selection-only query —
 * its underlying `useList` call is deduped against the SAME centre's own instance by TanStack
 * Query's cache (identical resource/pagination/filters produce the identical query key), so this
 * costs no extra network traffic — the two React hook instances share one cache entry, not two
 * independent fetches.
 */
/** The account-scoped route's own trailing segment (`overview`/`projects`/`api-keys`) — `null`
 *  off `/accounts/[accountId]/*` entirely. Mirrors `console-chrome.tsx`'s identical match, kept
 *  as its own copy rather than a shared import: the two modules read the pathname for unrelated
 *  reasons (which rail to show vs. which nav row is active) and neither depends on the other. */
function accountScopedSegment(pathname: string): string | undefined {
  return pathname.match(/^\/accounts\/[^/]+\/([^/]+)/)?.[1];
}

export function InspectorRail() {
  const pathname = usePathname();
  const segment = accountScopedSegment(pathname);

  if (segment === 'projects') return <ProjectsRail />;
  if (segment === 'overview') return <OverviewRail />;
  return undefined;
}

function ProjectsRail() {
  const screen = useProjectsScreen(null);
  const project = screen.selectedProject;
  const rename = useProjectRename(project);

  if (project === null) return undefined;

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-ink truncate font-sans text-[15px] font-medium">{project.name}</div>
          <div className="text-subtle truncate font-sans text-[12px]">
            {project.account} · {project.statusLabel}
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={rename.open}>
          Rename
        </Button>
      </div>
      <ProjectDetail project={project} />
      <ProjectNameDialog {...rename.dialog} />
    </div>
  );
}

function OverviewRail() {
  const scope = useConsoleScope();
  const openRenameAccount = useOpenRenameAccountDialog();
  const openCreateAccount = useOpenCreateAccountDialog();
  const createProject = useOpenCreateProjectDialog();
  const openRequestRefill = useOpenRequestRefillDialog();

  const scopedAccount =
    scope.allAccounts.find((account) => account.id === scope.value.accountId) ?? null;

  return (
    <InspectorSettingsPanel
      className="p-5"
      account={
        scopedAccount === null
          ? null
          : {
              label: accountScopeLabel(scopedAccount),
              named: scopedAccount.name != null,
              id: scopedAccount.id,
              status: scopedAccount.status,
              quotaTier: scopedAccount.defaultQuota ?? null,
            }
      }
      loading={scope.loading}
      error={scope.error ? 'Could not load your account.' : undefined}
      onRetry={() => scope.refetch()}
      onRename={openRenameAccount}
      onCopyId={(accountId) => {
        void navigator.clipboard?.writeText?.(accountId).catch(() => undefined);
      }}
      onNewAccount={openCreateAccount}
      // Addition C.1/C.4 (2026-08-30, owner: "I create account in settings or in a raw dropdown,
      // but project only in projects?") — opens the SAME shared `CreateProjectDialog` instance
      // `/projects`' and `/settings/projects`' own `PageHeader` actions open, in place, mounted
      // once in the layout (`use-create-project-dialog.ts`).
      onNewProject={createProject.open}
      onRequestRefill={openRequestRefill}
    />
  );
}
