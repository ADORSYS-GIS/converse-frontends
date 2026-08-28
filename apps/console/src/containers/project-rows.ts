import type { Project } from '@lightbridge/authz-rpc';
import type { ManageTotals, ProjectRow, ProjectStatus } from '@lightbridge/ui-web';

/**
 * Pure adapters from the generated `Project` model to the Manage ledger's row shape.
 *
 * Two honesty fixes live here together because they were the same category error
 * (`authz.cstack:243-244,274-277,699-700` — the schema, re-verified against the repo at the time
 * of this change):
 *
 * 1. `Project.status` is `@readonly String`, and the only two values the backend ever writes are
 *    `active` and `suspended` (`disableProject`/`enableProject`, `authz.cstack:698-700`). A value
 *    outside that pair is not a third lifecycle state — it means the client and the backend have
 *    drifted, so it renders as `unknown` rather than being coerced into either real state.
 * 2. `Project.projectQuota` is a governance **tier id** (e.g. `growth`) drawn from an
 *    operator-configured catalog, not a currency amount — there is no numeric ceiling anywhere in
 *    this contract to coerce it into. It is carried through as the tier id, never `Number()`-ed.
 *
 * Spend figures deliberately map to `null`, which the Manage ledger renders as an em dash: spend
 * lives in the usage backend (`/api/usage/*`), which has no live client yet (Epic 4) — inventing a
 * number here would be worse than an honest dash.
 */

export function projectStatus(project: Project): ProjectStatus {
  if (project.status === 'active') return 'active';
  if (project.status === 'suspended') return 'suspended';
  return 'unknown';
}

export function toProjectRow(project: Project): ProjectRow {
  const status = projectStatus(project);
  return {
    id: project.id,
    name: project.name,
    account: project.accountId,
    spendMtd: null,
    quotaTier: project.projectQuota ?? null,
    status,
    statusLabel: status,
  };
}

export function toProjectRows(projects: Project[]): ProjectRow[] {
  return projects.map(toProjectRow);
}

/**
 * Totals across the rows currently shown. `spendMtd` stays `null` — every row's own spend cell is
 * already an honest dash (spend has no live source yet), so a footer that summed them into a
 * fabricated `$0.00` would contradict the rows directly above it. There is no ceiling/used total:
 * `quotaTier` is categorical, and summing or averaging tier ids is not a real number either.
 */
export function manageTotals(rows: ProjectRow[], total: number): ManageTotals {
  return {
    shownLabel: `${rows.length} of ${total}`,
    spendMtd: null,
  };
}
