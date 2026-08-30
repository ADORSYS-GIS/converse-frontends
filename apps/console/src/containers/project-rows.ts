import type { Project } from '@lightbridge/authz-rpc';
import type { UsageQueryResponse } from '@lightbridge/api-rest';
import type { ProjectRow, ProjectStatus } from '@lightbridge/ui-web';

import { toSpendShareSegments } from './overview-usage';

/**
 * Pure adapters from the generated `Project` model to the Projects ledger's row shape.
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
 * `spendMtd` maps to `null` HERE (this file only ever sees the `projects` resource, which the
 * backend never returns spend on) — `applyProjectSpend`, below, is the second pass that overlays
 * the real figure from the account's per-project consumption query
 * (`use-projects-screen.ts`, mirroring `use-overview-screen.ts`'s admin budget-pressure zone).
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
 * Overlays the account's per-project consumption query (`buildBudgetConsumptionByProjectRequest`
 * + `queryUsage`, current billing period) onto already-mapped rows.
 *
 * `status` is a tri-state rather than trusting `response` alone: a `useQuery` sitting in
 * `'loading'`/`'error'` can still be holding STALE `data` from a previously-resolved, different
 * account/period — reading `response` alone would print last month's (or the last account's)
 * figures under this screen's heading. Anything but `'ready'` leaves every row exactly as
 * `toProjectRow` produced it (`spendMtd: null`, the ledger's em dash).
 *
 * Once `'ready'`, a project ABSENT from the response is a real, honest `0` — the request is
 * scoped to the whole account for the whole period (`buildBudgetConsumptionByProjectRequest`'s
 * own doc comment), so absence means no usage was recorded, not "unknown." Never re-collapsed
 * back to `null`: a null after a successful, complete query would be a fabricated "we don't know"
 * about a project the query actually accounted for.
 */
export function applyProjectSpend(
  rows: ProjectRow[],
  response: UsageQueryResponse | undefined,
  status: 'loading' | 'ready' | 'error'
): ProjectRow[] {
  if (status !== 'ready' || !response) return rows;
  const spendByProjectId = new Map(
    toSpendShareSegments(response, 'project_id').map((segment) => [segment.key, segment.value])
  );
  return rows.map((row) => ({
    ...row,
    spendMtd: spendByProjectId.get(row.id) ?? 0,
  }));
}

/**
 * Client-side sort over the CURRENT page's rows. Both columns the ledger offers are sortable
 * (`ProjectsLedger`'s Name/Spend MTD), but only one of the two is a real backend column — `name`
 * is a `Project` field the `projects` resource could sort server-side, while `spendMtd` comes
 * from a wholly separate usage-backend query the resource has no slot for. Sorting both the same
 * way (client-side, over the page already fetched) keeps ONE mechanism rather than two that could
 * disagree about tie-breaking, at the cost of only sorting within a page rather than across the
 * whole account — an accepted trade for a 25-row page.
 *
 * A row still loading its spend (`null`) sorts as the lowest value in either direction, so an
 * ascending sort does not visually jump once real figures land.
 */
export function sortProjectRows(
  rows: ProjectRow[],
  sort: { key: string; direction: 'asc' | 'desc' }
): ProjectRow[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort.key === 'spendMtd') {
      const av = a.spendMtd ?? -1;
      const bv = b.spendMtd ?? -1;
      return (av - bv) * sign;
    }
    return a.name.localeCompare(b.name) * sign;
  });
}
