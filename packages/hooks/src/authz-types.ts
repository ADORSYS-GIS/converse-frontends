import type {
  Account as GeneratedAccount,
  ApiKey as GeneratedApiKey,
  Project as GeneratedProject,
} from '@lightbridge/authz-rpc';

/**
 * The generated `Account`/`Project`/`ApiKey` model types mark every scalar field optional,
 * because cratestack's `fields`/`include` list-query params can return a partial projection of a
 * row. This app never requests a partial projection — every read here is a full-object fetch — so
 * these narrow the always-present fields back to required, matching what the screens/views were
 * written against. Relation fields (`projects`, `apiKeys`, `account`, `memberships`) stay absent:
 * we never request `include` either, so they're never populated.
 */
export type Account = Required<
  Pick<GeneratedAccount, 'id' | 'billingIdentity' | 'status' | 'createdAt' | 'updatedAt'>
>;

export type Project = Required<
  Pick<
    GeneratedProject,
    | 'id'
    | 'accountId'
    | 'name'
    | 'billingPlan'
    | 'status'
    | 'defaultLimits'
    | 'createdAt'
    | 'updatedAt'
  >
> &
  Pick<GeneratedProject, 'allowedModels'>;

export type ApiKey = Required<
  Pick<
    GeneratedApiKey,
    'id' | 'projectId' | 'name' | 'keyPrefix' | 'status' | 'billingPlan' | 'createdAt' | 'updatedAt'
  >
> &
  Pick<GeneratedApiKey, 'expiresAt' | 'lastUsedAt' | 'lastIp' | 'revokedAt' | 'deletedAt'>;

/** Narrows a full-object RPC response to its always-present-field shape. See module doc above. */
export function asFull<T>(value: object): T {
  return value as T;
}
