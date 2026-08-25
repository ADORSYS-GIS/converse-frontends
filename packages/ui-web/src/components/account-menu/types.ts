/** ADR 0010 Decision 5: `'system'` means "no stored preference -- follow `prefers-color-scheme`". */
export type AccountMenuTheme = 'black' | 'wireframe' | 'system';

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
  /**
   * The active theme preference (ADR 0010 Decision 5). The theme section (Dark / Light / System)
   * only renders when both `theme` and `onThemeChange` are supplied -- `ui-web` owns no
   * `localStorage`/DOM side effects itself (console-ui skill: data via typed props, callbacks are
   * props); the consumer (`apps/console`) persists the choice and writes `data-theme`.
   */
  theme?: AccountMenuTheme;
  /** Fires when a theme option is activated. */
  onThemeChange?: (theme: AccountMenuTheme) => void;
}
