export interface InspectorSettingsPanelAccount {
  /** The scoped account's display label (`accountScopeLabel` — a real name, or a named absence
   *  like `acct_9f3a2b1c`, never a raw 36-character uuid). Doubles as the panel's own title. */
  label: string;
  /** `true` once the account has a real name — mirrors `AccountSettings`' own `named` split, so
   *  the row's action reads "Rename" vs "Name this account" the same way on both surfaces. */
  named: boolean;
  id: string;
  /**
   * `Account.status` — text, never a pill (console-ui skill § States). Added IA v3 phase 2 ("the
   * settings area"): `AccountSettings`' own fuller Status row is gone along with
   * `/settings/account` (its content folded into `/settings/policies`, which shows OTHER
   * accounts' settings, not the currently scoped one this panel already covers) — this panel is
   * now the ONE place the scoped account's status is visible day-to-day, so it can no longer stay
   * the deliberately status-less "compact echo" its own doc comment used to describe.
   */
  status: string;
  quotaTier: string | null;
}

export interface InspectorSettingsPanelProps {
  /**
   * The scoped account, or `null` when the signed-in identity has none yet — the empty-account
   * dead end `AccountSettings` already answers on `/settings/account`; this panel gives the same
   * "+ New account" way out from wherever the rail happens to be showing.
   */
  account: InspectorSettingsPanelAccount | null;
  loading: boolean;
  /** A genuine failed accounts fetch — distinct from `account: null`, which is "fetched, and
   *  there genuinely is none yet." */
  error?: string;
  onRetry?: () => void;
  onRename: () => void;
  onCopyId?: (accountId: string) => void;
  onNewAccount: () => void;
  onNewProject: () => void;
  onRequestRefill: () => void;
  className?: string;
}
