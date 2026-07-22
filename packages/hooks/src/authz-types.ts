import type {
  Account as GeneratedAccount,
  ApiKey as GeneratedApiKey,
  Project as GeneratedProject,
} from '@lightbridge/authz-rpc';

/**
 * `@lightbridge/authz-rpc` is generated with `--full-selection`, so every scalar field on
 * `Account`/`Project`/`ApiKey` already matches the schema's own nullability (no more
 * partial-projection optionality to narrow here). Relation fields (`projects`, `apiKeys`,
 * `account`, `memberships`) stay required on the generated type regardless of `--full-selection`
 * (cratestack's model interface always projects relations) but are only actually populated on the
 * wire when the caller passes `include` — this app never does, so they're dropped here rather
 * than trusted.
 */
export type Account = Omit<GeneratedAccount, 'projects' | 'memberships'>;
export type Project = Omit<GeneratedProject, 'account' | 'apiKeys'>;
export type ApiKey = Omit<GeneratedApiKey, 'project'>;
