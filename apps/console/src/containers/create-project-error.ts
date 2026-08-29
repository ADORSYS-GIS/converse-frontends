/**
 * Best-effort routing of a real `createProject` failure message (from `getApiErrorMessage`,
 * already unwrapped to the server's own decoded text — see `use-shared-mutation.ts`) onto the
 * create-project dialog's `name`/`billingIdentity` fields, or a general line when neither field
 * is nameable from the text.
 *
 * `Project.billingIdentity` is `@unique` (`authz.cstack:242`) and `Project.name` has no uniqueness
 * constraint in the schema itself but is the other realistic target of a server-side rejection —
 * these are substring matches against whatever text the backend actually sends, not a fabricated
 * mapping, so an error this cannot attribute to either field still renders (as `error`) rather
 * than being silently dropped.
 */
export type CreateProjectFieldErrors = {
  nameError?: string;
  billingIdentityError?: string;
  error?: string;
};

export function classifyCreateProjectError(message: string): CreateProjectFieldErrors {
  const lower = message.toLowerCase();
  if (lower.includes('billing_identity') || lower.includes('billing identity')) {
    return { billingIdentityError: message };
  }
  if (lower.includes('name')) {
    return { nameError: message };
  }
  return { error: message };
}
