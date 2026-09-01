import type { ReactNode } from 'react';

export interface ConsoleTopBarProps {
  /** Logo + wordmark. */
  brand: ReactNode;
  /** The compact account/workspace switcher — typically `AccountBadge` at its default `inline`
   *  variant. */
  workspaceSwitcher: ReactNode;
  /** `⌘K` command-palette trigger slot — typically `CommandPaletteTrigger`. */
  paletteTrigger?: ReactNode;
  /**
   * The band's trailing slot — `apps/console` renders `ThemeToggle` alone here. Used to also
   * carry `AccountMenu`'s `inline` variant (the identity avatar); that variant is deleted outright
   * (owner ruling, 2026-08-31, issue #368: "We don't need a drop down for the connected user,
   * since it's in the left rail"), so this band carries no identity affordance of its own any
   * more — sign out stays reachable everywhere via the `⌘K` command palette's own action.
   */
  trailing: ReactNode;
  className?: string;
}
