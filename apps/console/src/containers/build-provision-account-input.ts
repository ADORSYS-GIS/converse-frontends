import type { ProvisionAccountInput } from '@lightbridge/authz-rpc';

import { normalizeAccountName } from './build-create-account-input';

/**
 * Builds `procedure.provisionAccount`'s input (`authz.cstack`, lightbridge-authz#720) from what
 * the admin-provision-account form collects.
 *
 * Unlike `buildCreateAccountInput` next door, `subject` and `email` ARE caller-supplied here —
 * that is the whole point of this procedure: it mints an account for an OPERATOR-NAMED Keycloak
 * subject who cannot self-provision one, not for the caller's own identity. Only trimmed, not
 * further validated: the backend rejects a blank `email` itself (`Error::BadRequest` — it becomes
 * the default project's `NOT NULL` `billing_identity`) and per ADR-0039 an id/subject is never
 * shape-validated client-side either, so there is no stricter rule for this form to invent.
 *
 * `name` reuses `normalizeAccountName`'s blank-to-`null` contract — same field, same backend
 * normalization, as `createAccount`'s own `name`.
 */
export function buildProvisionAccountInput(params: {
  subject: string;
  email: string;
  name: string;
}): ProvisionAccountInput {
  return {
    subject: params.subject.trim(),
    email: params.email.trim(),
    name: normalizeAccountName(params.name),
  };
}
