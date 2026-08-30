'use client';

import { CreateProjectDialog } from '@lightbridge/ui-web/src/components/create-project-dialog';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SelectionSheet } from '@lightbridge/ui-web/src/components/selection-sheet';
import {
  MANAGE_FILTERS_RAIL_LABEL,
  ManageFiltersRail,
} from '@lightbridge/ui-web/src/sections/manage-filters-rail';
import { ManageProjectsLedger } from '@lightbridge/ui-web/src/sections/manage-projects-ledger';
import {
  MANAGE_REPORT_RAIL_LABEL,
  ManageReportRail,
} from '@lightbridge/ui-web/src/sections/manage-report-rail';
import {
  MANAGE_SELECTION_RAIL_LABEL,
  ManageSelectionRail,
} from '@lightbridge/ui-web/src/sections/manage-selection-rail';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { ManageRail } from './manage-rail';
import { ManageScopeSlot } from './manage-scope-slot';
import { UrlSectionSheetTrigger } from './url-section-sheet-trigger';
import { useManageScreen } from './use-manage-screen';

/**
 * `/manage` — the centre column. The shell is mounted once, in `app/(console)/layout.tsx`.
 *
 * SELECTION has no trigger: it is selection-driven, so below `lg` it opens through
 * `SelectionSheet` the moment a row is picked. That component is gated by `useIsBelowLg`, which
 * is what stops a selection at `lg` from opening an invisible-but-modal dialog.
 *
 * **No account panel.** `AccountPanel` and `AccountNameDialog` used to mount here, directly above
 * this screen's own filters — a core account mutation on the screen you filter from (owner,
 * 2026-08-29: "We cannot modify account core information on the same page we're filtering"). They
 * moved to `/settings` intact, along with their `?account-name=` param and both procedures. Manage
 * is now purely a filtering and browsing surface: everything it mounts is about finding a project,
 * and `+ New project` is the one write left, because creating a project IS what this ledger is a
 * list of.
 *
 * Shell revamp phase 2: `ManageRail` (report/filters/selection) used to render through the
 * deleted `@rail` parallel-route slot; it now renders inline as a right-hand `<aside>` at `lg`,
 * beside the ledger, matching what the shell's own `rightRail` prop used to give it for free.
 * `// phase-3 removes` — a real right-rail replacement is designed in phase 3. Below `lg` the same
 * sections stay reachable through the existing `UrlSectionSheetTrigger`/`SelectionSheet` pattern,
 * which was already tier-gated (`lg:hidden`) independently of the shell's own rail slot.
 */
export function ManageCentre() {
  const screen = useManageScreen(<ManageScopeSlot />);
  const subtitle = screen.scopeLabel ? `${screen.scopeLabel} · browse and filter projects` : undefined;

  return (
    <>
      <div className="flex gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <PageHeader title="Projects" subtitle={subtitle} />

          <InlineStatus>{screen.spendPendingMessage}</InlineStatus>

          <CreateProjectDialog {...screen.createProjectDialog} />

          <ManageProjectsLedger
            projects={screen.rows}
            loading={screen.loading}
            loadingRowCount={8}
            error={screen.errorMessage}
            onRetry={screen.retry}
            emptyMessage="No projects in this account yet."
            totals={screen.totals}
            search={screen.search}
            onSearchChange={screen.setSearch}
            onNewProject={screen.newProject}
            newProjectDisabled={!screen.createProjectEligible}
            newProjectReason={screen.createProjectReason}
            selectedRowKeys={screen.selectedProject ? [screen.selectedProject.id] : []}
            onSelectRow={screen.selectRow}
            pagination={screen.pagination}
            toolbarActions={
              <UrlSectionSheetTrigger
                id="filters"
                icon="filter"
                triggerLabel="Open filters"
                label={MANAGE_FILTERS_RAIL_LABEL}>
                <ManageFiltersRail {...screen.filters} />
              </UrlSectionSheetTrigger>
            }
            reportTrigger={
              <UrlSectionSheetTrigger
                id="report"
                icon="report"
                triggerLabel="Open monthly report"
                label={MANAGE_REPORT_RAIL_LABEL}>
                <ManageReportRail {...screen.report} />
              </UrlSectionSheetTrigger>
            }
          />
        </div>

        {/* phase-3 removes */}
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <ManageRail />
        </aside>
      </div>

      <SelectionSheet
        selectionKey={screen.selectedProject?.id ?? null}
        label={MANAGE_SELECTION_RAIL_LABEL}>
        <ManageSelectionRail project={screen.selectedProject} />
      </SelectionSheet>
    </>
  );
}
