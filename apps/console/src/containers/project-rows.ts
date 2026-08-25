import type { Project } from '@lightbridge/authz-rpc';
import type { ManageTotals, ProjectRow, ProjectStatus } from '@lightbridge/ui-web';

/**
 * Pure adapters from the generated `Project` model to the Manage ledger's row shape.
 *
 * Spend figures deliberately map to `null`, which the Manage ledger renders as an em dash:
 * the generated schema carries a project's *quota*, not its consumption. Consumption lives in the
 * usage backend (`/api/usage/*`), which has no live client yet — inventing a number here would be
 * worse than an honest dash.
 */

/** Fraction of the quota at which a project reads as `near ceiling`. */
export const NEAR_CEILING_FRACTION = 0.9;

export function parseQuota(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function projectStatus(
  project: Project,
  spendMtd: number | null,
  ceiling: number | null
): ProjectStatus {
  if (project.status === 'archived' || project.status === 'disabled') return 'archived';
  if (spendMtd !== null && ceiling !== null && ceiling > 0) {
    if (spendMtd / ceiling >= NEAR_CEILING_FRACTION) return 'near ceiling';
  }
  return 'active';
}

export function toProjectRow(project: Project): ProjectRow {
  const ceiling = parseQuota(project.projectQuota);
  const spendMtd = null;
  const status = projectStatus(project, spendMtd, ceiling);
  return {
    id: project.id,
    name: project.name,
    account: project.accountId,
    members: project.members?.length ?? 0,
    keys: project.apiKeys?.length ?? 0,
    spendMtd,
    ceiling,
    usedPercent: null,
    status,
    statusLabel: status,
  };
}

export function toProjectRows(projects: Project[]): ProjectRow[] {
  return projects.map(toProjectRow);
}

/** Totals across the rows currently shown. Only the ceiling is real; spend stays at zero. */
export function manageTotals(rows: ProjectRow[], total: number): ManageTotals {
  const ceiling = rows.reduce((sum, row) => sum + (row.ceiling ?? 0), 0);
  const spendMtd = rows.reduce((sum, row) => sum + (row.spendMtd ?? 0), 0);
  return {
    shownLabel: `${rows.length} of ${total}`,
    spendMtd,
    ceiling,
    usedPercent: ceiling > 0 ? Math.round((spendMtd / ceiling) * 100) : 0,
  };
}
