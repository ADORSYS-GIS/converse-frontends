export type AccountSettingsAccount = {
  /**
   * `accounts.id` — the only identifier an account has; a name is never one. Equal to the
   * caller's opaque JWT `sub` (lightbridge-authz ADR-0006) for a person's first ("home") account
   * only; a second or later account (ADR-0026 — one identity may own several) gets its own
   * server-minted id instead, while staying owned by the same identity (`Account.userId`).
   */
  id: string;
  /**
   * `null` means **never named**, and is NOT interchangeable with `''`.
   *
   * `Account.name` is nullable on purpose (lightbridge-authz#551): there was no truthful value to
   * backfill pre-existing accounts with, and backfilling the id would have made "the user named
   * their account `9f3a-…`" indistinguishable from "nobody has named it yet". Every account that
   * existed before that migration reads back `null` today, so this is the ordinary case, not an
   * edge case.
   */
  name: string | null;
};

export interface AccountSettingsPanel {
  /**
   * The currently SCOPED account (ADR-0026 — one identity may own several, so "the" account is
   * whichever the workspace switcher has selected, not necessarily a "home"/first one), or `null`
   * when there is none: either the signed-in identity has no account at all yet, or nothing is
   * scoped.
   *
   * `null` is also the state the production report ("I cannot create an account on the console")
   * was about: with no account there is nothing to scope by, so every other screen is empty. This
   * section is the way out.
   */
  account: AccountSettingsAccount | null;
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
}

/**
 * The read-only half of the account: what the account *is*, as opposed to what it is called.
 *
 * Every field here is `@readonly` in `packages/authz-rpc/schema/authz.cstack` and has no generic
 * update verb at all — `model.Account.update` was removed outright (lightbridge-authz#398) once
 * `@readonly` left it with zero settable columns. So these are rows, not controls, and that is a
 * property of the contract rather than a decision this section made.
 */
export type AccountSettingsDetails = {
  /**
   * `accounts.id` — the only way to address an account (see `AccountSettingsAccount.id`'s own
   * comment on when this does, and does not, equal the caller's JWT `sub`). Long, opaque and
   * frequently needed in a ticket or a support thread, which is the entire reason this row
   * carries a copy affordance.
   */
  id: string;
  /**
   * `Account.status` — server-managed lifecycle state, written only by the disable/enable
   * procedures and the DB's own `DEFAULT 'active'`. Rendered as text, never as a pill
   * (console-ui skill § States).
   */
  status: string;
  /**
   * `Account.defaultQuota` — a governance **tier id** from an operator-configured catalogue (e.g.
   * `growth`), never a currency amount or a numeric ceiling, and scoped to usage under this
   * account's own default project. `null` means no tier is assigned, which is what every account
   * created through this console carries today: `buildCreateAccountInput` sends `null` on purpose,
   * because no RPC procedure exposes the tier catalogue for a picker to read.
   */
  defaultQuotaTier: string | null;
};

export interface AccountSettingsProps {
  panel: AccountSettingsPanel;
  /**
   * `null` whenever there is nothing truthful to show: no account, still loading, or a failed
   * fetch. `panel` above already says which of the three it is, so the rows simply do not render
   * rather than printing em dashes that would read as "the account has no status".
   */
  details: AccountSettingsDetails | null;
  /**
   * Copies the account id. Optional — omitted, the row renders without the affordance rather than
   * with a dead button. The clipboard write itself belongs to the app (`navigator.clipboard` is
   * undefined on insecure origins, and this package does no I/O).
   */
  onCopyId?: (accountId: string) => void;
  className?: string;
}
