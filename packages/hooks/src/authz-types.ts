import type {
  Account as GeneratedAccount,
  ApiKey as GeneratedApiKey,
  Project as GeneratedProject,
  ProjectMember as GeneratedProjectMember,
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
export type ProjectMember = Omit<GeneratedProjectMember, 'project' | 'account'>;
