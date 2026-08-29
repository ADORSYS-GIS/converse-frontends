export type AccountPanelAccount = {
  /** `accounts.id` — the caller's JWT `sub` (lightbridge-authz ADR-0006). The only identifier an
   *  account has; a name is never one. */
  id: string;
  /**
   * `null` means **never named**, and is NOT interchangeable with `''`.
   *
   * `Account.name` is nullable on purpose (lightbridge-authz#551): there was no truthful value to
   * backfill pre-existing accounts with, and backfilling the id would have made "the user named
   * their account `9f3a-…`" indistinguishable from "nobody has named it yet". Every account that
   * existed before that migration reads back `null` today, so this is the ordinary case, not an
   * edge case — the panel renders it as a named absence with its own verb, never as an empty
   * string and never by silently substituting the id.
   */
  name: string | null;
};

export interface AccountPanelProps {
  /**
   * The signed-in principal's own account, or `null` when they do not have one yet.
   *
   * `null` is the state the production report ("I cannot create an account on the console") was
   * about: with no account there is nothing to scope by, so every other screen is empty and the
   * console offers no way out. This panel is that way out.
   */
  account: AccountPanelAccount | null;
  loading: boolean;
  /** A genuine failed accounts fetch — distinct from "the fetch succeeded and there is no
   *  account", which is `account: null` with `error` unset. Never conflate the two: one is
   *  unknown, the other is known-absent. */
  error?: string;
  onRetry?: () => void;

  onCreate: () => void;
  createDisabled?: boolean;
  /** Stated beside the disabled create control; `undefined` exactly when it is enabled. */
  createReason?: string;

  onRename: () => void;
  className?: string;
}
