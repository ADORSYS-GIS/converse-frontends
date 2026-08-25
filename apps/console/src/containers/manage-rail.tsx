'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import {
  MANAGE_FILTERS_RAIL_LABEL,
  ManageFiltersRail,
} from '@lightbridge/ui-web/src/sections/manage-filters-rail';
import {
  MANAGE_REPORT_RAIL_LABEL,
  ManageReportRail,
} from '@lightbridge/ui-web/src/sections/manage-report-rail';
import {
  MANAGE_SELECTION_RAIL_LABEL,
  ManageSelectionRail,
} from '@lightbridge/ui-web/src/sections/manage-selection-rail';

import { ManageScopeSlot } from './manage-scope-slot';
import { useManageScreen } from './use-manage-screen';

/** `/manage` — the right rail, delivered through the `@rail` parallel-route slot. */
export function ManageRail() {
  const screen = useManageScreen(<ManageScopeSlot />);

  return (
    <>
      <RailPanel label={MANAGE_REPORT_RAIL_LABEL}>
        <ManageReportRail {...screen.report} />
      </RailPanel>
      <RailPanel label={MANAGE_FILTERS_RAIL_LABEL}>
        <ManageFiltersRail {...screen.filters} />
      </RailPanel>
      <RailPanel label={MANAGE_SELECTION_RAIL_LABEL}>
        <ManageSelectionRail project={screen.selectedProject} />
      </RailPanel>
    </>
  );
}
