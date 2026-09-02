import type { UsageQueryResponse } from '@lightbridge/api-rest';
import type { ActorLabels } from '@lightbridge/authz-rpc';

import { sentinelLabel } from '../containers/sentinel-labels';
import { UNASSIGNED_KEY } from '../containers/overview-usage';
import type { DashboardLens } from './dashboard-spec';

/**
 * Actor identity for the declarative dashboards (converse-frontends#448, story C5; backend lane
 * A2's `resolveActorLabels`).
 *
 * A usage response carries IDS — `user_id`, `account_id`, `project_id` — and nothing else. Until
 * this module, every panel that ranked actors printed the raw cuid, which is unusable: an operator
 * cannot act on `usr_01j…`. `resolveActorLabels` is the batch lookup that turns those into names,
 * and this file is the PURE half of using it: which ids a page needs, and how one resolves to a
 * label. The React half (`use-actor-labels.ts`) is one `useQuery` over the whole page's ids.
 *
 * Three rules, all of them honesty rules rather than preferences:
 *
 *  - **Never fabricate an identity.** An id the backend returned no row for keeps its own
 *    `sentinelLabel` — the same labeller every other screen in this console uses — and the row is
 *    KEPT (an explicit AC). A dropped row is a spend figure that silently stops being counted.
 *  - **A user is a name AND an email** (owner-confirmed shape, Q9). Both are surfaced; the email is
 *    the secondary line, and it is what disambiguates two people with the same display name.
 *  - **An account/project carries its parent.** An account shows its owner, a project its account,
 *    because "Production" is not a distinguishing name on an estate-wide page.
 */

export type ActorKind = DashboardLens;

export interface ResolvedActorLabel {
  /** The primary line — a real name, or the sentinel for an id nothing resolved. */
  label: string;
  /** The second line: a user's email, an account's owner, a project's account. Absent when the
   *  backend had nothing to say, never filled with a placeholder. */
  secondary?: string;
  /** De-emphasized rendering, straight from `sentinelLabel` — an unresolved id is real data, just
   *  not a human-chosen name. */
  subtle: boolean;
}

/** Every actor id one page needs resolving, split by kind. All three lists are required by the
 *  procedure and may be empty (cratestack has no optional-list arity). */
export interface ActorIds {
  users: string[];
  accounts: string[];
  projects: string[];
}

export const EMPTY_ACTOR_IDS: ActorIds = { users: [], accounts: [], projects: [] };

/**
 * `resolveActorLabels` caps each list at 200 and REJECTS a longer batch outright rather than
 * truncating it (the procedure's own contract: "a truncated result is indistinguishable from
 * 'those ids do not exist'"). So the cap is applied HERE, deliberately and visibly: the ids are
 * already in descending-spend order by the time they reach this module, so the 200 that survive are
 * the 200 that matter, and everything past them renders its sentinel rather than taking the whole
 * lookup down with a 400.
 */
export const ACTOR_ID_BATCH_CAP = 200;

/** Which `UsageSeriesPoint` field each kind reads. Stated once, beside the labels themselves. */
const KIND_FIELD: Record<ActorKind, string> = {
  user: 'user_id',
  account: 'account_id',
  project: 'project_id',
};

/**
 * Every actor id present in a page's responses, in DESCENDING order of the requests they carry, so
 * the batch cap above keeps the ids an operator is most likely to be looking at.
 *
 * Walks the raw responses rather than the panel views because the ids have to be collected BEFORE
 * any panel renders — one lookup for the page, not one per panel, which is the whole point (an AC).
 * `UNASSIGNED_KEY` and empty values are skipped: there is no identity to resolve for spend the
 * backend attributed to nobody, and asking for one would waste a slot under the cap.
 */
export function collectActorIds(responses: readonly (UsageQueryResponse | undefined)[]): ActorIds {
  const weights: Record<ActorKind, Map<string, number>> = {
    user: new Map(),
    account: new Map(),
    project: new Map(),
  };

  for (const response of responses) {
    if (!response) continue;
    for (const point of response.points) {
      const row = point as unknown as Record<string, unknown>;
      const requests = Number.isFinite(point.requests) && point.requests > 0 ? point.requests : 0;
      for (const kind of Object.keys(weights) as ActorKind[]) {
        const value = row[KIND_FIELD[kind]];
        if (typeof value !== 'string' || value.length === 0 || value === UNASSIGNED_KEY) continue;
        const bucket = weights[kind];
        bucket.set(value, (bucket.get(value) ?? 0) + requests);
      }
    }
  }

  const top = (kind: ActorKind) =>
    Array.from(weights[kind].entries())
      .sort(([aKey, a], [bKey, b]) => b - a || aKey.localeCompare(bKey))
      .slice(0, ACTOR_ID_BATCH_CAP)
      .map(([key]) => key);

  return { users: top('user'), accounts: top('account'), projects: top('project') };
}

/**
 * The page's OWN subject ids, folded in ahead of everything the responses carried
 * (converse-frontends#449, story C6).
 *
 * `/admin/usage/actors/<id>` has to resolve one identity before any panel does: the id in its own
 * path, which is what its header states. Seeding it into the same batch — rather than firing a
 * second `resolveActorLabels` from the header — is what keeps "ONE lookup per page" true for a
 * parameterised page too, and it is why the seed goes FIRST: it is the one id whose absence would
 * leave the page titled after a cuid, so it must never be the one the cap drops.
 *
 * Order is otherwise preserved (the collected ids are already in descending-request order) and
 * duplicates are folded, so seeding an id the responses also carried costs nothing.
 */
export function withSeedActorIds(seed: ActorIds | undefined, collected: ActorIds): ActorIds {
  if (!seed) return collected;
  const merge = (first: readonly string[], rest: readonly string[]) =>
    Array.from(new Set([...first, ...rest])).slice(0, ACTOR_ID_BATCH_CAP);
  return {
    users: merge(seed.users, collected.users),
    accounts: merge(seed.accounts, collected.accounts),
    projects: merge(seed.projects, collected.projects),
  };
}

/** The `ActorIds` naming exactly one actor — what an actor-scoped page seeds its page batch with. */
export function actorIdsOf(kind: ActorKind, id: string): ActorIds {
  return {
    users: kind === 'user' ? [id] : [],
    accounts: kind === 'account' ? [id] : [],
    projects: kind === 'project' ? [id] : [],
  };
}

/** Stable, order-independent cache key for one batch — sorted so two renders that discovered the
 *  same ids in a different order share one request instead of re-fetching (an explicit AC). */
export function actorIdsKey(ids: ActorIds): string {
  return [
    [...ids.users].sort().join(','),
    [...ids.accounts].sort().join(','),
    [...ids.projects].sort().join(','),
  ].join('|');
}

export function hasActorIds(ids: ActorIds): boolean {
  return ids.users.length > 0 || ids.accounts.length > 0 || ids.projects.length > 0;
}

/** `labelFor(kind, id)` — the adapter every ranked/table/donut/series renderer resolves a group
 *  key through. */
export type LabelFor = (kind: ActorKind, id: string) => ResolvedActorLabel;

/**
 * Builds the `labelFor` adapter from one `resolveActorLabels` response (or from nothing at all,
 * while the lookup is still in flight or after it failed — in both cases every id falls through to
 * its sentinel and the page stays readable rather than blank).
 */
export function buildLabelFor(labels: ActorLabels | undefined): LabelFor {
  const users = new Map((labels?.users ?? []).map((user) => [user.userId, user]));
  const accounts = new Map((labels?.accounts ?? []).map((account) => [account.accountId, account]));
  const projects = new Map((labels?.projects ?? []).map((project) => [project.projectId, project]));

  const accountName = (accountId: string): string | undefined =>
    accounts.get(accountId)?.name ?? undefined;

  return (kind, id) => {
    if (kind === 'user') {
      const user = users.get(id);
      // The display name is the label; the email is the second line. With ONLY an email, the email
      // becomes the label rather than being hidden under a raw cuid — an email is a real identity.
      const primary = user?.displayName ?? user?.email ?? null;
      const resolved = sentinelLabel(id, primary);
      return {
        ...resolved,
        secondary: user?.email && user.email !== resolved.label ? user.email : undefined,
      };
    }

    if (kind === 'account') {
      const account = accounts.get(id);
      const resolved = sentinelLabel(id, account?.name ?? null);
      return {
        ...resolved,
        // The owner is what distinguishes two accounts that are both called "Production".
        secondary: account ? `Owner ${account.ownerUserId}` : undefined,
      };
    }

    const project = projects.get(id);
    const resolved = sentinelLabel(id, project?.name ?? null);
    const parent = project ? (accountName(project.accountId) ?? project.accountId) : undefined;
    return { ...resolved, secondary: parent ? `in ${parent}` : undefined };
  };
}

/** The neutral adapter — used before any lookup has resolved, and by every non-actor dimension
 *  (model, azp, billing_plan), which have no identity to resolve at all. */
export const IDENTITY_LABEL_FOR: LabelFor = (_kind, id) => ({ ...sentinelLabel(id) });
