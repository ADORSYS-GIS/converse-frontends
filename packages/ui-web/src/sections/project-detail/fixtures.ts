// The rows `DetailSheet` shows for a selected project — moved here from the deleted
// `manage-selection-rail/fixtures.ts`.

import { projectsFixture } from '../projects-ledger/fixtures';
import type { ProjectRow } from '../projects-ledger/types';

export const selectedProjectFixture: ProjectRow = projectsFixture[0];

/** A suspended project with no quota tier assigned — its spend/tier are `null`, so the section
 * shows em dashes. */
export const suspendedProjectFixture: ProjectRow = projectsFixture[10];
