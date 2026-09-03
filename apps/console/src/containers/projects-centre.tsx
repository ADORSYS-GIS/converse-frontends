'use client';

import { BottomSheet } from '@lightbridge/ui-web/src/components/bottom-sheet';
import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { EmptyState } from '@lightbridge/ui-web/src/components/empty-state';
import { ProjectNameDialog } from '@lightbridge/ui-web/src/components/project-name-dialog';
import { ReportExportDialog } from '@lightbridge/ui-web/src/components/report-export-dialog';
import { ManageControls } from '@lightbridge/ui-web/src/sections/manage-controls';
import { ProjectsLedger } from '@lightbridge/ui-web/src/sections/projects-ledger';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ProjectDetail } from '@lightbridge/ui-web/src/sections/project-detail';
import { useEffect } from 'react';

import { useProjectsEntryParams } from '../client/url-state';
import { AccountDetailSubNav } from './account-detail-sub-nav';
import { ManageScopeSlot } from './manage-scope-slot';
import { useOpenCreateProjectDialog } from './use-create-project-dialog';
import { useProjectRename } from './use-project-rename';
import { useProjectsScreen } from './use-projects-screen';

/**
 * `/settings/accounts/<id>/projects` (renamed from `/manage`, moved off `/accounts/<id>/projects`
 * by IA v3 phase E — the old path 308s here verbatim) — the centre column. The shell is mounted
 * once, in `app/(console)/layout.tsx`.
 *
 * **No right rail — ever.** `/settings/*` has no inspector rail at any tier (ADR 0013 D2), so the
 * selected project's detail is `BottomSheet` at EVERY tier now, not only below `lg` — the same
 * surface `/admin/refills-queue`'s own `ReviewDetailPanel` uses, for the identical reason.
 * `useProjectRename(project)` — the FULL controller, dialog and mutation both — mounts directly
 * here rather than splitting across a rail-and-sheet pair the way `/accounts/<id>/projects` used
 * to (see `use-project-rename.ts`'s own doc comment for the "one detail surface now, not two"
 * argument).
 *
 * **`?create=true` opens the create-project dialog on load** (task directive: "project creation
 * would be inside /settings/accounts/<account-id>/projects?create=true"): a one-shot mount effect
 * reads the flag, opens the SAME shared, cross-route `CreateProjectDialog` instance every other
 * trigger opens (`use-create-project-dialog.ts`), and clears the flag immediately —
 * `useProjectsEntryParams`'s own doc comment has the full param split.
 *
 * **No account panel.** `AccountPanel`/`AccountSettings` used to mount here, directly above this
 * screen's own filters (owner, 2026-08-29: "We cannot modify account core information on the same
 * page we're filtering"). They now live at `/settings/accounts/<id>` instead (IA v3 phase E) —
 * this screen is purely a filtering and browsing surface, and `+ New project` is the one write
 * left, shared cross-route the same way account creation is.
 *
 * The table + its toolbar (search left, the account/status/budget-state filter cluster right) +
 * pager all live inside ONE `Card` — `ProjectsLedger` supplies the toolbar/table/pager, this file
 * supplies the card, the same split `OverviewCentre` established for its own dashboard zones.
 */
export function ProjectsCentre() {
  const screen = useProjectsScreen(<ManageScopeSlot />);
  const subtitle = screen.scopeLabel
    ? `${screen.scopeLabel} · browse and filter projects`
    : undefined;
  const createProject = useOpenCreateProjectDialog();
  const rename = useProjectRename(screen.selectedProject);
  const [entry, setEntry] = useProjectsEntryParams();

  useEffect(() => {
    if (!entry.create) return;
    createProject.open();
    void setEntry({ create: false });
    // Fires once per genuine `?create=true` landing — `createProject.open`/`setEntry` are stable
    // (nuqs setters, and the trigger hook only ever wraps one) and re-running this on their
    // identity would be a no-op regardless, since `entry.create` is already cleared by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.create]);

  const newProjectButton = (
    <Button
      type="button"
      variant="primary"
      disabled={!createProject.eligible}
      title={createProject.reason}
      onClick={createProject.open}>
      + New project
    </Button>
  );

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Projects"
          subtitle={subtitle}
          action={
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => screen.report.onOpenChange(true)}>
                Monthly report
              </Button>
              {newProjectButton}
            </>
          }
        />

        <AccountDetailSubNav accountId={screen.accountId} />

        <ReportExportDialog {...screen.report} />

        <Card>
          <ProjectsLedger
            projects={screen.rows}
            loading={screen.loading}
            loadingRowCount={8}
            error={screen.errorMessage}
            onRetry={screen.retry}
            search={screen.search}
            onSearchChange={screen.setSearch}
            filters={<ManageControls {...screen.filters} />}
            emptyState={
              screen.filtersActive ? undefined : (
                <EmptyState
                  headline="No projects yet"
                  explainer="Create a project to start issuing API keys and tracking spend."
                  action={newProjectButton}
                />
              )
            }
            filteredEmptyMessage={
              screen.filtersActive ? 'No projects match these filters.' : undefined
            }
            sort={screen.sort}
            onSortChange={screen.onSortChange}
            selectedRowKeys={screen.selectedProject ? [screen.selectedProject.id] : []}
            onSelectRow={screen.selectRow}
            pagination={screen.pagination}
          />
        </Card>
      </div>

      {/* The ONE detail surface, at every tier — settings has no rail to hand this off to at
          `lg`+ (see this file's own doc comment). `headerAction` opens the SAME rename flow this
          file's own `useProjectRename` controller drives. */}
      <BottomSheet
        open={screen.selectedProject !== null}
        onOpenChange={(open) => {
          if (!open) screen.clearSelection();
        }}
        title={screen.selectedProject?.name ?? ''}
        subtitle={
          screen.selectedProject
            ? `${screen.selectedProject.account} · ${screen.selectedProject.statusLabel}`
            : undefined
        }
        headerAction={
          <Button type="button" variant="secondary" size="sm" onClick={rename.open}>
            Rename
          </Button>
        }>
        {screen.selectedProject ? <ProjectDetail project={screen.selectedProject} /> : null}
      </BottomSheet>

      <ProjectNameDialog {...rename.dialog} />
    </>
  );
}
