import type { ReactNode } from 'react';

export interface ConsoleTopBarProps {
  /** Logo + wordmark. */
  brand: ReactNode;
  /** The compact account/workspace switcher — typically `AccountBadge` at its default `inline`
   *  variant. */
  workspaceSwitcher: ReactNode;
  /** `⌘K` command-palette trigger slot — typically `CommandPaletteTrigger`. */
  paletteTrigger?: ReactNode;
  /** The identity avatar — typically `AccountMenu` (its email span is already `hidden md:inline`,
   *  so reusing the same instance here shows the avatar alone, which is what this bar wants). */
  identity: ReactNode;
  className?: string;
}
