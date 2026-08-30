'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
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

/**
 * `/manage`'s right-hand parameter stack — report, filters, and the selected project's detail.
 *
 * Shell revamp phase 2: rendered inline inside `ManageCentre`'s own `<aside>` at `lg` (the `@rail`
 * parallel-route slot this used to fill is deleted along with `RailPanel`; `Card` is the console's
 * one generic panel now — see `manage-centre.tsx`). // phase-3 removes: the whole right-hand aside
 * pattern is temporary — a real right-rail replacement is designed in phase 3.
 */
export function ManageRail() {
  const screen = useManageScreen(<ManageScopeSlot />);

  return (
    <div className="flex flex-col gap-3">
      <Card title={MANAGE_REPORT_RAIL_LABEL}>
        <ManageReportRail {...screen.report} />
      </Card>
      <Card title={MANAGE_FILTERS_RAIL_LABEL}>
        <ManageFiltersRail {...screen.filters} />
      </Card>
      <Card title={MANAGE_SELECTION_RAIL_LABEL}>
        <ManageSelectionRail project={screen.selectedProject} />
      </Card>
    </div>
  );
}
