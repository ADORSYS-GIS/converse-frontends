import type { AccountPanelProps } from '../account-panel/types';

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
   * `accounts.id` — the caller's opaque JWT `sub` (lightbridge-authz ADR-0006), and the only way
   * to address an account. Long, opaque and frequently needed in a ticket or a support thread,
   * which is the entire reason this row carries a copy affordance.
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
  /**
   * `AccountPanel`'s own props, passed straight through.
   *
   * Composed rather than reimplemented: the panel already distinguishes the three states that
   * matter — no account at all, an account whose `name` is `null`, and a genuinely failed fetch —
   * and those distinctions are the contract documented in `../account-panel/types.ts`. This
   * section adds facts around it; it does not restate them.
   */
  panel: AccountPanelProps;
  /**
   * `null` whenever there is nothing truthful to show: no account, still loading, or a failed
   * fetch. The panel above already says which of the three it is, so the rows simply do not
   * render rather than printing em dashes that would read as "the account has no status".
   */
  details: AccountSettingsDetails | null;
  /**
   * Copies the account id. Optional — omitted, the row renders without the affordance rather than
   * with a dead button, the same contract `AccountBadge.onCopyId` uses. The clipboard write itself
   * belongs to the app (`navigator.clipboard` is undefined on insecure origins, and this package
   * does no I/O).
   */
  onCopyId?: (accountId: string) => void;
  className?: string;
}
