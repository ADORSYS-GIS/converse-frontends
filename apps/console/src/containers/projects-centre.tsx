'use client';

import { BottomSheet } from '@lightbridge/ui-web/src/components/bottom-sheet';
import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { EmptyState } from '@lightbridge/ui-web/src/components/empty-state';
import { ReportExportDialog } from '@lightbridge/ui-web/src/components/report-export-dialog';
import { ManageControls } from '@lightbridge/ui-web/src/sections/manage-controls';
import { ProjectsLedger } from '@lightbridge/ui-web/src/sections/projects-ledger';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ProjectDetail } from '@lightbridge/ui-web/src/sections/project-detail';

import { ManageScopeSlot } from './manage-scope-slot';
import { useOpenCreateProjectDialog } from './use-create-project-dialog';
import { useOpenProjectRename } from './use-project-rename';
import { useProjectsScreen } from './use-projects-screen';

/**
 * `/projects` (renamed from `/manage`, 2026-08-30 revamp brief) — the centre column. The shell is
 * mounted once, in `app/(console)/layout.tsx`.
 *
 * SELECTION has no trigger: it is selection-driven. At `lg`+ the inspector rail
 * (`containers/inspector-rail.tsx`) is the detail surface for it; below `lg`, where the rail is
 * absent, the SAME selection opens the `BottomSheet` below instead — `portalClassName="lg:hidden"`
 * is what keeps the two from ever being simultaneously interactive (owner's locked layout
 * contract, 2026-08-30 restatement: "Right rail on large screens, bottom sheet on medium and
 * small").
 *
 * **No account panel.** `AccountPanel` and `AccountNameDialog` used to mount here, directly above
 * this screen's own filters — a core account mutation on the screen you filter from (owner,
 * 2026-08-29: "We cannot modify account core information on the same page we're filtering"). They
 * moved to `/settings` intact, along with their `?account-name=` param and both procedures.
 * Projects is now purely a filtering and browsing surface: everything it mounts is about finding
 * a project, and `+ New project` is the one write left — that dialog itself is shared cross-route
 * now (Addition C.1/C.4, 2026-08-30: `use-create-project-dialog.ts`, mounted once in
 * `app/(console)/layout.tsx`), so this screen only calls its trigger, same as `Rename` below.
 *
 * The permanent "spend is unwired" banner is gone (2026-08-30): Spend MTD is a real, sortable
 * column now (`use-projects-screen.ts`'s `applyProjectSpend`), so the disclaimer would be a false
 * claim about the very screen it sat on.
 *
 * The table + its toolbar (search left, the account/status/budget-state filter cluster right) +
 * pager all live inside ONE `Card` now — `ProjectsLedger` supplies the toolbar/table/pager, this
 * file supplies the card, the same split `OverviewCentre` established for its own dashboard zones.
 */
export function ProjectsCentre() {
  const screen = useProjectsScreen(<ManageScopeSlot />);
  const subtitle = screen.scopeLabel ? `${screen.scopeLabel} · browse and filter projects` : undefined;
  const openRename = useOpenProjectRename();
  const createProject = useOpenCreateProjectDialog();

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

      {/* Below `lg` only — the inspector rail is the detail surface at `lg`+ (`portalClassName`
          is the tier hook here, not a wrapper class: see `BottomSheetProps.portalClassName`'s
          own doc comment for why). `headerAction` opens the SAME rename flow the rail's own
          header offers — `containers/inspector-rail.tsx` renders the one `ProjectNameDialog`
          instance both trigger (`use-project-rename.ts`'s own doc comment). */}
      <BottomSheet
        open={screen.selectedProject !== null}
        onOpenChange={(open) => {
          if (!open) screen.clearSelection();
        }}
        title={screen.selectedProject?.name ?? ''}
        subtitle={screen.selectedProject ? `${screen.selectedProject.account} · ${screen.selectedProject.statusLabel}` : undefined}
        headerAction={
          <Button type="button" variant="secondary" size="sm" onClick={openRename}>
            Rename
          </Button>
        }
        portalClassName="lg:hidden">
        {screen.selectedProject ? <ProjectDetail project={screen.selectedProject} /> : null}
      </BottomSheet>
    </>
  );
}
