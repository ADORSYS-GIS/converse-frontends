export interface InspectorSettingsPanelAccount {
  /** The scoped account's display label (`accountScopeLabel` — a real name, or a named absence
   *  like `acct_9f3a2b1c`, never a raw 36-character uuid). Doubles as the panel's own title. */
  label: string;
  /** `true` once the account has a real name — mirrors `AccountSettings`' own `named` split, so
   *  the row's action reads "Rename" vs "Name this account" the same way on both surfaces. */
  named: boolean;
  id: string;
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
