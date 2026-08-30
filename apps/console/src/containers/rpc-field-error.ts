/**
 * Best-effort routing of a real RPC failure message (from `getApiErrorMessage`, already unwrapped
 * to the server's own decoded text — see `use-shared-mutation.ts`) onto the specific form field
 * the server named, or onto a general line when it named none.
 *
 * One module for every form that needs this, not one per form. `classifyCreateAccountError` below
 * exists because `AccountNameDialog` needs the same field-vs-general split `CreateProjectDialog`
 * already needed; it shares `mentions()` rather than re-deriving its own substring matching, so a
 * change to how these messages are matched happens once.
 *
 * These are substring matches against whatever text the backend actually sends, not a fabricated
 * mapping — a message that names no known field still renders (as `error`) rather than being
 * silently dropped.
 */

function mentions(message: string, ...needles: string[]): boolean {
  const lower = message.toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

export type CreateProjectFieldErrors = {
  nameError?: string;
  billingIdentityError?: string;
  error?: string;
};

/**
 * `Project.billingIdentity` is `@unique` (`authz.cstack`) and `Project.name` has no uniqueness
 * constraint in the schema itself but is the other realistic target of a server-side rejection.
 */
export function classifyCreateProjectError(message: string): CreateProjectFieldErrors {
  if (mentions(message, 'billing_identity', 'billing identity')) {
    return { billingIdentityError: message };
  }
  if (mentions(message, 'name')) {
    return { nameError: message };
  }
  return { error: message };
}

export type AccountNameFieldErrors = {
  nameError?: string;
  error?: string;
};

/**
 * Routes a `createAccount` / `updateAccountName` failure onto the dialog's single field, or onto
 * the general line.
 *
 * The realistic general failure is `createAccount`'s `Error::Conflict` — "account already exists
 * for this subject": one JWT subject holds at most one account (ADR-0006), and a second call is a
 * conflict rather than an upsert. That message mentions "account", not "name", so it must NOT be
 * routed to the field — pinning that is the point of the `account`-before-`name` ordering here.
 */
export function classifyCreateAccountError(message: string): AccountNameFieldErrors {
  if (mentions(message, 'already exists', 'conflict')) {
    return { error: message };
  }
  if (mentions(message, 'name')) {
    return { nameError: message };
  }
  return { error: message };
}

export type ProjectNameFieldErrors = {
  nameError?: string;
  error?: string;
};

/**
 * Routes a `model.Project.update` rename failure onto the dialog's single field, or onto the
 * general line.
 *
 * The realistic general failures name neither the field nor a value: an authorization refusal
 * (`model.Project.update`'s `@@allow` is owner-or-member, and the console can only *mirror* that
 * gate — see `use-project-settings-screen.ts`'s `renameEligible`) and cratestack's own "update input must
 * contain at least one changed column" 422. Both must stay on the general line: attaching
 * "permission denied" to the name input would tell the user to retype a name that was never the
 * problem. Hence the permission check runs BEFORE the `name` substring match, the same ordering
 * `classifyCreateAccountError` uses for its conflict case.
 */
export function classifyProjectNameError(message: string): ProjectNameFieldErrors {
  if (mentions(message, 'permission', 'denied', 'forbidden', 'unauthorized', 'not allowed')) {
    return { error: message };
  }
  if (mentions(message, 'name')) {
    return { nameError: message };
  }
  return { error: message };
}
