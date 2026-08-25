export interface AccountMenuProps {
  /** Signed-in user's display name -- the first identity line inside the menu. */
  name?: string;
  /** Signed-in user's email -- shown beside the trigger avatar (>=`md`) and as the second
   * identity line inside the menu. */
  email?: string;
  /** Two-letter avatar glyph. Callers compute this (e.g. from name/email) -- no name-parsing
   * logic belongs in `ui-web` (console-ui skill: pure, callback-driven components). */
  initials: string;
  /** Fires when "Sign out" is activated. No navigation logic lives in `ui-web` -- the consumer
   * (`apps/console`) decides what a sign-out means (full-page navigation to `/auth/logout`). */
  onSignOut: () => void;
  /** Accessible name for the trigger button. Defaults to "Account menu" plus the identity label. */
  triggerLabel?: string;
  className?: string;
}
