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
   * `inline` (default) — the top bar's compact trigger, email hidden below `md`. `sidebar`
   * (phase 9) — the sidebar footer's full-width identity row: the SAME `sidebar-footer-row`
   * grid every other footer row uses (chip in the icon column, email at the label x), and the
   * email always shows (the sidebar only ever renders at `md`+, so there is no narrow tier to
   * hide it from — see `AccountBadge`'s identical `sidebar` variant for the precedent).
   */
  variant?: 'inline' | 'sidebar';
  /**
   * Storybook-only escape hatch for the design-review radius comparison (owner ask, 2026-08-31:
   * "ship 2/6/10px corner variants so I can pick from a screenshot") -- an extra class merged
   * onto the popup ONLY, so a story can override its corner radius without touching the shared
   * `OVERLAY_CLASS` contract every other overlay in the console still renders at (`CommandPalette`
   * carries the identical seam as `panelClassName`, same reasoning). Left unset, the popup
   * renders at today's contract radius exactly as before. Not read by `apps/console`.
   */
  popupClassName?: string;
}
