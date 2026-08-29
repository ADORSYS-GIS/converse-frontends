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
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';

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
 */
export function ManageCentre() {
  const screen = useManageScreen(<ManageScopeSlot />);

  return (
    <>
      <div className="flex flex-col gap-6">
        <ScreenHeading title="Projects" />

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

      <SelectionSheet
        selectionKey={screen.selectedProject?.id ?? null}
        label={MANAGE_SELECTION_RAIL_LABEL}>
        <ManageSelectionRail project={screen.selectedProject} />
      </SelectionSheet>
    </>
  );
}
