import type { ReactNode } from 'react';

export interface ConsoleHeaderProps {
  /** Config-driven logo image (ADR 0008 Decision 8). Omit to fall back to the wordmark. */
  logoSrc?: string;
  logoAlt?: string;
  /** Wordmark rendered when `logoSrc` is unset. Defaults to `LIGHTBRIDGE`. */
  wordmark?: string;
  /** Org/account switcher slot, rendered beside the logo behind a divider rule. */
  orgSwitcher?: ReactNode;
  /**
   * `⌘K` command-palette trigger slot, rendered just left of `identity`
   * (`docs/design/console-redesign/PRIMITIVES.md` `console-header` row: "Gains
   * ... the ⌘K palette trigger (phase 3)"). Typically a `CommandPaletteTrigger`.
   */
  paletteTrigger?: ReactNode;
  /** Right-side identity slot (account menu, avatar). */
  identity?: ReactNode;
  className?: string;
}
