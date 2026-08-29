/**
 * What the console renders for a governance quota tier of `null`.
 *
 * One definition because the same `null` appears on three columns that share one catalogue —
 * `Account.defaultQuota`, `Project.projectQuota` and `ProjectMember.quotaTier` — and it means the
 * same thing on all three: **no tier is assigned**, which is emphatically not "a ceiling of zero"
 * and not "unlimited". An em dash would read as the first; a `0` would assert the second.
 *
 * It is also the ordinary case, not an edge one: a project starts with `projectQuota = NULL` and
 * can only be given a tier afterwards through `setProjectQuota`, and every account this console
 * creates sends `defaultQuota: null` because no RPC procedure exposes the tier catalogue for a
 * picker to read from.
 */
export const NO_QUOTA_TIER_LABEL = 'Not assigned';
