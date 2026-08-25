import type { HTMLAttributes, ReactNode } from 'react';

export interface RailPanelProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Optional 10px uppercase tracked heading rendered in `--muted` (spec §2.1/§4 `RailPanel`).
   * Omit for panels that carry their own heading treatment (e.g. `NavSpine`'s active item).
   */
  label?: string;
  /**
   * A rail *section* — 16px inset only, no background/radius/shadow of its own (owner revision
   * 2026-08-25, console-ui skill "Rails are flush…"). Render one or more inside a `bg-surface
   * divide-y divide-raised` rail column so sections separate with a hairline, not a gap.
   */
  children: ReactNode;
}
