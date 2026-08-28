import type { CreateProjectInput } from '@lightbridge/authz-rpc';

/**
 * Builds the real `CreateProjectInput` (`authz.cstack:187-282`) from what the create-project
 * dialog actually collects.
 *
 * The generated input type is much wider than the dialog's three fields. `@readonly` on the
 * schema does **not** remove a field from the generated `Create*Input` — it only makes the server
 * ignore whatever value arrives for it (verified empirically, converse-frontends#194, the same
 * finding `allowedModels`'s own schema comment documents). `allowedModels`/`modelPolicy`/
 * `projectQuota`/`isDefault`/`status` below are exactly that: inert placeholders required only to
 * satisfy the generated type, never read by the server. `id` is genuinely required and the
 * generic `model.Project.create` verb has no server-side id generation (unlike the hand-written
 * `createAccount`/`createApiKey` procedures), so the caller supplies one via `createId()`
 * (`@paralleldrive/cuid2`, re-exported from `@lightbridge/authz-rpc`).
 *
 * `defaultLimits` is the one field here that is genuinely NOT `@readonly` and has no dedicated
 * post-creation setter in the schema — there is also no product surface (mockup or ADR) defining
 * what a caller-configured value would mean yet, so this sends `{}` ("no per-key limits
 * configured"), matching the "absent means no limit" convention `BillingPlanLimits` already
 * establishes elsewhere in this codebase, rather than inventing a shape nothing consumes.
 */
export function buildCreateProjectInput(params: {
  id: string;
  accountId: string;
  name: string;
  billingIdentity: string;
  billingPlan: string;
}): CreateProjectInput {
  return {
    id: params.id,
    accountId: params.accountId,
    name: params.name,
    billingIdentity: params.billingIdentity,
    billingPlan: params.billingPlan,
    // Inert on the server (see the module doc comment above) — present only because the
    // generated type still requires them.
    allowedModels: null,
    modelPolicy: 'allow_all',
    defaultLimits: {},
    projectQuota: null,
    isDefault: false,
    status: 'active',
  };
}
