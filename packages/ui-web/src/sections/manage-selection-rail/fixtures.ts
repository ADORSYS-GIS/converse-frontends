// The selected row shown in manage-projects.svg's SELECTION panel.

import { manageProjectsFixture } from '../manage-projects-ledger/fixtures';
import type { ProjectRow } from '../manage-projects-ledger/types';

export const selectedProjectFixture: ProjectRow = manageProjectsFixture[0];

/** A suspended project with no quota tier assigned — its spend/tier are `null`, so the section
 * shows em dashes. */
export const suspendedProjectFixture: ProjectRow = manageProjectsFixture[10];
