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
  className?: string;
}
