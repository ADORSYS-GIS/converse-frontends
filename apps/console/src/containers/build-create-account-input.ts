import type { CreateAccountInput, UpdateAccountNameInput } from '@lightbridge/authz-rpc';

/**
 * Normalises a typed display name to what the backend stores.
 *
 * `NULL` is the single representation of "unnamed": `accounts.name` carries
 * `CHECK (name IS NULL OR btrim(name) <> '')` (`migrations/20260829000001_accounts_add_name.sql`)
 * and the procedure layer normalises blank/whitespace-only input to `NULL` before it ever reaches
 * that constraint. This function is the client agreeing with that contract rather than inventing
 * a stricter one: it never *rejects* a blank name, it converts it — so `''` and `'   '` create (or
 * leave) an unnamed account instead of round-tripping an empty string the schema forbids.
 */
export function normalizeAccountName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Builds `procedure.createAccount`'s input (`authz.cstack`) from what the account dialog collects.
 *
 * **No `id`.** This is the load-bearing difference from `buildCreateProjectInput` next door, which
 * has to mint one with `createId()`: `accounts.id` IS the caller's JWT `sub` (ADR-0006), read
 * straight off the bearer token inside the procedure and never trusted from the request body.
 * `CreateAccountInput` has no `id` field at all, so there is nothing here to supply and nothing
 * for the form to ask for. Under ADR-0039 the subject is also not ours to mint or reshape.
 *
 * **`defaultQuota: null`.** It IS on the input type, but it is a governance tier validated at
 * write time against an operator-configured catalogue that no RPC procedure exposes — there is no
 * quota-tier twin of `listBillingPlans`/`listModelCatalog`. Sending a guessed tier id would be the
 * hardcoded-catalogue-value mistake this codebase already refuses to make for plans and models, so
 * the console sends "not assigned" and leaves `procedure.updateAccountDefaultQuota` as the path
 * once a catalogue endpoint exists. `null` is already the column's established "not assigned yet".
 */
export function buildCreateAccountInput(params: { name: string }): CreateAccountInput {
  return {
    name: normalizeAccountName(params.name),
    defaultQuota: null,
  };
}

/**
 * Builds `procedure.updateAccountName`'s input.
 *
 * `accountId` is explicit even though only a self-update can ever succeed — the procedure enforces
 * `id = accountId AND id = auth().id` in its own SQL, so a mismatch is an indistinguishable
 * `NotFound` rather than a probe. This is a **set, not a PATCH**: a normalised `null` clears the
 * name back to unnamed, which is exactly what the dialog's "leave blank to clear the name" copy
 * promises.
 */
export function buildUpdateAccountNameInput(params: {
  accountId: string;
  name: string;
}): UpdateAccountNameInput {
  return {
    accountId: params.accountId,
    name: normalizeAccountName(params.name),
  };
}
