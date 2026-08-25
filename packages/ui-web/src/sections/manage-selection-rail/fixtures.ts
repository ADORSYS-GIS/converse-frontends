// The selected row shown in manage-projects.svg's SELECTION panel.

import { manageProjectsFixture } from '../manage-projects-ledger/fixtures';
import type { ProjectRow } from '../manage-projects-ledger/types';

export const selectedProjectFixture: ProjectRow = manageProjectsFixture[0];

/** An archived project — its spend/ceiling are `null`, so the section shows em dashes. */
export const archivedProjectFixture: ProjectRow = manageProjectsFixture[10];
