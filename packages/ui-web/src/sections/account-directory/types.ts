/**
 * One row of the identity's account family — `/settings/accounts` (IA v3 phase E). The SAME data
 * the workspace switcher already reads (`useConsoleScope().allAccounts`), reshaped to an
 * already-resolved display `label` rather than a raw `name`/`id` pair: this section stays
 * presentational, so the "real name, else `acct_<first8>`" fallback (`accountScopeLabel`,
 * `apps/console`) is resolved by the caller once, the same split `ScopeOption` already draws
 * between `use-console-scope.ts` and `AccountBadge`.
 */
export type AccountDirectoryRow = {
  /** `accounts.id` — the only stable way to address an account; never rendered directly (the
   *  row shows `label` instead, per the console-ui skill's "never a raw account UUID as a
   *  visible label"). */
  id: string;
  /** `accountScopeLabel(account)` — a real name, or `acct_<first8>` for an unnamed account. */
  label: string;
  /** `Account.status` — rendered as text, never a pill. */
  status: string;
  /** `Account.defaultQuota` — a governance tier id, or `null` when none is assigned. */
  defaultQuotaTier: string | null;
};

export interface AccountDirectoryProps {
  accounts: AccountDirectoryRow[];
  loading?: boolean;
  /** How many skeleton blocks to render while loading. */
  loadingRowCount?: number;
  /** A genuine failed fetch, distinct from "the fetch succeeded and there are no accounts". */
  error?: string;
  onRetry?: () => void;

  /** Opens the shared, cross-route `AccountNameDialog` (create mode) — the SAME dialog the
   *  workspace switcher's own `+ New account` row opens, mounted once in `app/(console)/
   *  layout.tsx`. Only ever called from this section's own `EmptyState` action; a non-empty list
   *  carries its `+ New account` trigger in the caller's own `PageHeader`, not in here. */
  onCreate: () => void;
  createDisabled?: boolean;
  /** Stated beside the disabled create control; `undefined` exactly when it is enabled. */
  createReason?: string;

  /** A row's own click — the caller navigates to `/settings/accounts/<id>`; this section holds
   *  no routing concept of its own. */
  onSelectAccount: (accountId: string) => void;
  className?: string;
}
