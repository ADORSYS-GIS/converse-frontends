'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { CreateProjectDialog } from '@lightbridge/ui-web/src/components/create-project-dialog';
import { DetailSheet } from '@lightbridge/ui-web/src/components/detail-sheet';
import { EmptyState } from '@lightbridge/ui-web/src/components/empty-state';
import { ReportExportDialog } from '@lightbridge/ui-web/src/components/report-export-dialog';
import { ManageControls } from '@lightbridge/ui-web/src/sections/manage-controls';
import { ProjectsLedger } from '@lightbridge/ui-web/src/sections/projects-ledger';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ProjectDetail } from '@lightbridge/ui-web/src/sections/project-detail';

import { ManageScopeSlot } from './manage-scope-slot';
import { useProjectsScreen } from './use-projects-screen';

/**
 * `/projects` (renamed from `/manage`, 2026-08-30 revamp brief) — the centre column. The shell is
 * mounted once, in `app/(console)/layout.tsx`.
 *
 * SELECTION has no trigger: it is selection-driven, so a row pick opens `DetailSheet` directly,
 * at every tier — no separate compact-tier sheet, because `DetailSheet` already is the one way
 * this content is reached now.
 *
 * **No account panel.** `AccountPanel` and `AccountNameDialog` used to mount here, directly above
 * this screen's own filters — a core account mutation on the screen you filter from (owner,
 * 2026-08-29: "We cannot modify account core information on the same page we're filtering"). They
 * moved to `/settings` intact, along with their `?account-name=` param and both procedures.
 * Projects is now purely a filtering and browsing surface: everything it mounts is about finding
 * a project, and `+ New project` is the one write left, because creating a project IS what this
 * ledger is a list of.
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

  const newProjectButton = (
    <Button
      type="button"
      variant="primary"
      disabled={!screen.createProjectEligible}
      title={screen.createProjectReason}
      onClick={screen.newProject}>
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

        <CreateProjectDialog {...screen.createProjectDialog} />

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

      <DetailSheet
        open={screen.selectedProject !== null}
        onOpenChange={(open) => {
          if (!open) screen.clearSelection();
        }}
        title={screen.selectedProject?.name ?? ''}
        subtitle={screen.selectedProject?.account}>
        {screen.selectedProject ? <ProjectDetail project={screen.selectedProject} /> : null}
      </DetailSheet>
    </>
  );
}
