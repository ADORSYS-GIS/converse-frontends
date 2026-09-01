export interface AccountBadgeOption {
  id: string;
  /** The account's human name, when it has one. */
  label?: string | null;
}

export interface AccountBadgeProps {
  /**
   * The active account's human name, when it has one. Omit and the badge falls back to a short
   * form of `accountId` — never the raw 36-character UUID.
   */
  name?: string | null;
  /** The active account's canonical id. Shown short; the full value is on hover and on copy. */
  accountId: string;
  /**
   * Every account the signed-in user can reach. With 0 or 1 entries the badge is not a switcher
   * at all — there is nothing to switch to, and a dropdown that opens onto a single option is a
   * control pretending to be one. Pass `onSelectAccount` alongside this to make it live.
   */
  accounts?: AccountBadgeOption[];
  onSelectAccount?: (accountId: string) => void;
  /**
   * Copies `accountId` to the clipboard. Available as a menu entry when the badge is a switcher,
   * and as the badge's own click when it is not. Omit entirely and the full id is still reachable
   * via the `title` tooltip, so there is never a dead end.
   */
  onCopyId?: (accountId: string) => void;
  /**
   * Opens the create-account dialog — the switcher's trailing `+ New account` row (ADR-0026,
   * lightbridge-authz#564: one identity may own several accounts). On its own it is also enough to
   * make the badge a real switcher: with as few as one account, there is still something to DO
   * here even though there is nothing yet to switch BETWEEN.
   */
  onCreateAccount?: () => void;
  /**
   * `inline` (default) — the compact identity-row chip this component has always rendered, sized
   * for the mobile top bar. `sidebar` — a full-width `workspace-switcher-row` with a leading
   * initials chip, for `ConsoleSidebar`'s workspace switcher slot (shell brief 2026-08-30, "the
   * existing `AccountBadge` behaviour relocated").
   */
  variant?: 'inline' | 'sidebar';
  /** Initials for the `sidebar` variant's avatar chip, e.g. `"AG"`. Ignored at `inline`. Omit and
   *  the sidebar variant renders with no chip rather than a guessed one. */
  initials?: string;
  className?: string;
}
