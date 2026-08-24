import type { HTMLAttributes, ReactNode } from 'react';

export interface RailPanelProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Optional 10px uppercase tracked heading rendered in `--muted` (spec §2.1/§4 `RailPanel`).
   * Omit for panels that carry their own heading treatment (e.g. `NavSpine`'s active item).
   */
  label?: string;
  children: ReactNode;
}
