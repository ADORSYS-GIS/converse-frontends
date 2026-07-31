import type {
  Account as GeneratedAccount,
  ApiKey as GeneratedApiKey,
  LightbridgeAuthzRpcClient,
  Project as GeneratedProject,
} from '@lightbridge/authz-rpc';

/**
 * `@lightbridge/authz-rpc` is generated with `--full-selection`, so every scalar field on
 * `Account`/`Project`/`ApiKey` already matches the schema's own nullability (no more
 * partial-projection optionality to narrow here). Relation fields (`projects`, `apiKeys`,
 * `account`, `members`) stay required on the generated type regardless of `--full-selection`
 * (cratestack's model interface always projects relations) but are only actually populated on the
 * wire when the caller passes `include` — this app never does, so they're dropped here rather
 * than trusted.
 *
 * `Account` no longer has a `memberships` relation: lightbridge-authz ADR-0006 removed
 * account-level membership entirely. `Project` gained `members`, the project roster.
 */
export type Account = Omit<GeneratedAccount, 'projects'>;
export type Project = Omit<GeneratedProject, 'account' | 'apiKeys' | 'members'>;
export type ApiKey = Omit<GeneratedApiKey, 'project'>;
/**
 * Derived from the procedure's own return type rather than imported as a named model.
 *
 * `ProjectMember` is not exported from the generated models barrel: it is policy-traversal-only
 * server-side, its generic `model.ProjectMember.*` verbs are fail-closed, and its `id` is
 * synthetic (`project_members` is keyed `(project_id, account_id)` with no `id` column). So the
 * only way to obtain a roster row is `procedures.listProjectRoster`, and taking the element type
 * of what that actually returns is both available and strictly more accurate than restating the
 * shape by hand — it cannot drift from the wire contract.
 */
export type ProjectMember = Awaited<
  ReturnType<LightbridgeAuthzRpcClient['procedures']['listProjectRoster']>
>[number];
