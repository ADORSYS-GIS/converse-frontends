/**
 * Which of the two `Account` name writes this dialog is driving.
 *
 * One component, two procedures, because the FORM is identical: a single optional free-text
 * field. `procedure.createAccount` (`authz.cstack`) takes `{ defaultQuota?, name? }` and
 * `procedure.updateAccountName` takes `{ accountId, name? }` — the only caller-typed value in
 * either is the same `name?: string | null`. Splitting that into two components would duplicate
 * every state, every class and every test to vary four strings.
 */
export type AccountNameDialogMode = 'create' | 'rename';

export interface AccountNameDialogProps {
  open: boolean;
  mode: AccountNameDialogMode;
  /**
   * The identity this write is attributed to, rendered as read-only context.
   *
   * In `create` mode this is the **signed-in subject**, which OWNS the new account
   * (`Account.userId`, lightbridge-authz ADR-0026) but is only ever also its `id` for that
   * identity's first account (ADR-0006's original rule) — a second or later account gets a
   * server-minted id instead. `createAccount`'s input carries no `id` field either way, so the
   * form must never offer one; echoing the owning identity here is what makes that visible
   * instead of mysterious, without asserting an id the new account may not actually get. Unlike
   * `CreateProjectDialog` one row over, there is no `createId()` anywhere in this flow.
   */
  subjectLabel: string;
  /**
   * `rename` mode only: whether the account currently HAS a name.
   *
   * `Account.name` is nullable and every account that predates lightbridge-authz#551 reads back
   * `null`, so "has never been named" is the common case in production today, not an edge case.
   * The dialog's verb changes accordingly — "Name this account" is not a rename — and the blank
   * hint changes with it (blank means "stay unnamed" vs "clear the name you have").
   */
  currentlyNamed?: boolean;

  name: string;
  onNameChange: (name: string) => void;
  /**
   * A server-side rejection this caller could attribute to `name` specifically, rendered on the
   * field. Field-level rather than general because the console adds **no client-side name rule of
   * its own**: the server normalises blank/whitespace-only input to `NULL` and the `accounts`
   * table's only constraint is `CHECK (name IS NULL OR btrim(name) <> '')`, so a stricter
   * client-side rule would reject input the backend accepts. Anything the server does refuse
   * therefore arrives here, after the fact — see `classifyAccountNameError` in `apps/console`.
   */
  nameError?: string;

  submitting: boolean;
  /** A submit-time failure not attributable to `name` — e.g. `createAccount`'s `Conflict` for a
   *  subject that already holds an account. Kept inline; the dialog stays open. */
  error?: string;
  /**
   * `create`: true whenever a submit is possible at all — a blank name is legal (it creates an
   * unnamed account), so this is not a "did you fill the field in" gate.
   * `rename`: false when the trimmed value already equals what the account is called, so the
   * dialog cannot fire a write that changes nothing.
   */
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}
