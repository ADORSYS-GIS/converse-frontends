'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { ProjectNameDialog } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { ReviewDetailPanel } from '@lightbridge/ui-web/src/components/review-detail-panel';
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
import { useAdminScreen } from './use-admin-screen';

/**
 * `ConsoleShell.rail`'s content resolver — mounted exactly once, from `app/(console)/layout.tsx`,
 * beside the shell itself (console-ui skill "Composition — chrome mounted once").
 *
 * **Content policy, the owner's final word on it (2026-08-30, two rounds on the same day):**
 * round one asked for a rail that is "never empty by construction"; round two corrected that to
 * "the right rail was empty depending on the situation. Solution: hide it if empty. Simple." —
 * this resolver follows the SECOND, more specific instruction, which is stricter, not the first:
 *
 *  - `/projects` — the selected project's detail, ONLY while a row is selected. No selection, no
 *    rail (returns `undefined`, which collapses `ConsoleShell`'s rail column entirely — see its
 *    own doc comment).
 *  - `/admin` — the selected request's review panel, ONLY while a request is selected. Same "no
 *    selection, no rail" rule.
 *  - `/` (Overview) — the scope quick-settings panel, ALWAYS. This is the one STANDING case: the
 *    owner explicitly wanted account settings visible in the rail, and on the dashboard it has a
 *    real job beside the Budget card (account identity, `+ New account`/`+ New project`, and
 *    `Request refill` — the same dialog the Budget card's own actions open).
 *  - every other route (`/api-keys`, `/settings/*`) — no rail. `/settings/*` already IS the
 *    account/project settings surface as its centre content; echoing it in a rail beside itself
 *    would be pure noise.
 *
 * Below `lg`, none of this renders at all — `ConsoleShell` only mounts the `rail` slot inside its
 * `lg:flex` column, so this component's own output is simply never placed on screen there; the
 * SAME selection-driven content instead opens as a `BottomSheet` from each route's own centre
 * (`projects-centre.tsx`, `admin-centre.tsx`).
 *
 * Reuses the FULL screen hooks (`useProjectsScreen`, `useAdminScreen`) rather than a narrower
 * selection-only query — the same "two zones, one shared outcome" shape `use-admin-screen.ts`'s
 * own `DECIDE_MUTATION_KEY` doc comment anticipated when it wrote "the rail at `lg`, the centre's
 * selection sheet below it" before this rail existed. Both hooks' underlying `useList`/`useQuery`
 * calls are deduped against the SAME centre's own instance by TanStack Query's cache (identical
 * resource/pagination/filters produce the identical query key), so this costs no extra network
 * traffic — the two React hook instances share one cache entry, not two independent fetches.
 */
export function InspectorRail() {
  const pathname = usePathname();

  if (pathname === '/projects') return <ProjectsRail />;
  if (pathname === '/admin') return <AdminRail />;
  if (pathname === '/') return <OverviewRail />;
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
          <div className="truncate font-sans text-[15px] font-medium text-ink">{project.name}</div>
          <div className="truncate font-sans text-[12px] text-subtle">
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

function AdminRail() {
  const screen = useAdminScreen();

  if (screen.reviewDetail === null) return undefined;

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="min-w-0">
        <div className="truncate font-sans text-[15px] font-medium text-ink">
          {screen.reviewDetail.projectLabel}
        </div>
        <div className="truncate font-sans text-[12px] text-subtle">
          {screen.reviewDetail.accountLabel}
        </div>
      </div>
      <ReviewDetailPanel key={screen.selectedRequestId} {...screen.reviewDetail} />
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
