import React from 'react';

import { ReportExportPanel } from '../../components/report-export-panel';
import type { ManageReportRailProps } from './types';

/** Heading for whichever host mounts this section — see `OVERVIEW_VIEW_RAIL_LABEL`'s note. */
export const MANAGE_REPORT_RAIL_LABEL = 'MONTHLY REPORT';

// Contract: docs/design/console-redesign/README.md §5.3 (manage-projects.svg) — the right rail's
// MONTHLY REPORT section. `ReportExportPanel` already owns the whole parameter set (period,
// scope slot, group-by, include toggles, format, the Generate action and LAST EXPORTS), so this
// section composes it rather than duplicating it; what it adds is the rail identity that the
// persistent rail and the compact-tier sheet both read from one place.
export function ManageReportRail(props: ManageReportRailProps) {
  return <ReportExportPanel {...props} />;
}
