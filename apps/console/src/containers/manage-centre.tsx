'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { CreateProjectDialog } from '@lightbridge/ui-web/src/components/create-project-dialog';
import { DetailSheet } from '@lightbridge/ui-web/src/components/detail-sheet';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { ReportExportDialog } from '@lightbridge/ui-web/src/components/report-export-dialog';
import { ManageControls } from '@lightbridge/ui-web/src/sections/manage-controls';
import { ManageProjectsLedger } from '@lightbridge/ui-web/src/sections/manage-projects-ledger';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { ProjectDetail } from '@lightbridge/ui-web/src/sections/project-detail';

import { ManageScopeSlot } from './manage-scope-slot';
import { useManageScreen } from './use-manage-screen';

/**
 * `/manage` — the centre column. The shell is mounted once, in `app/(console)/layout.tsx`.
 *
 * SELECTION has no trigger: it is selection-driven, so a row pick opens `DetailSheet` directly,
 * at every tier — no separate compact-tier sheet, because `DetailSheet` already is the one way
 * this content is reached now.
 *
 * **No account panel.** `AccountPanel` and `AccountNameDialog` used to mount here, directly above
 * this screen's own filters — a core account mutation on the screen you filter from (owner,
 * 2026-08-29: "We cannot modify account core information on the same page we're filtering"). They
 * moved to `/settings` intact, along with their `?account-name=` param and both procedures. Manage
 * is now purely a filtering and browsing surface: everything it mounts is about finding a project,
 * and `+ New project` is the one write left, because creating a project IS what this ledger is a
 * list of.
 *
 * Shell revamp phase 3 (right rail out): the temporary right-hand `<aside>` (`ManageRail`,
 * phase 2) is gone. FILTERS (account · status · budget state · search) is `ManageControls` in
 * `PageHeader.controls`; MONTHLY REPORT is a secondary `PageHeader.action` button that opens
 * `ReportExportDialog`; SELECTION is `DetailSheet` hosting `ProjectDetail`. All three now render
 * identically at every breakpoint — nothing in this screen is tier-gated any more.
 */
export function ManageCentre() {
  const screen = useManageScreen(<ManageScopeSlot />);
  const subtitle = screen.scopeLabel ? `${screen.scopeLabel} · browse and filter projects` : undefined;

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Projects"
          subtitle={subtitle}
          controls={
            <ManageControls
              {...screen.filters}
              search={screen.search}
              onSearchChange={screen.setSearch}
            />
          }
          action={
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => screen.report.onOpenChange(true)}>
                Monthly report
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!screen.createProjectEligible}
                title={screen.createProjectReason}
                onClick={screen.newProject}>
                + New project
              </Button>
            </>
          }
        />

        <InlineStatus>{screen.spendPendingMessage}</InlineStatus>

        <CreateProjectDialog {...screen.createProjectDialog} />

        <ReportExportDialog {...screen.report} />

        <ManageProjectsLedger
          projects={screen.rows}
          loading={screen.loading}
          loadingRowCount={8}
          error={screen.errorMessage}
          onRetry={screen.retry}
          emptyMessage="No projects in this account yet."
          totals={screen.totals}
          selectedRowKeys={screen.selectedProject ? [screen.selectedProject.id] : []}
          onSelectRow={screen.selectRow}
          pagination={screen.pagination}
        />
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
