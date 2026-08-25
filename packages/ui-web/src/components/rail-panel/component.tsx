import React, { forwardRef } from 'react';

import { cn } from '../../cn';
import type { RailPanelProps } from './types';

// Contract (revised, owner 2026-08-25 — console-ui skill "Rails are flush, aligned, full-height
// columns", supersedes the earlier "floating card" reading of README §4): `RailPanel` is a rail
// *section*, not a self-panelled card. It owns only the 16px inset and the optional uppercase
// `label` heading — no background, no radius, no shadow of its own. The `#191919` surface fill
// and the edge-to-edge geometry belong to the rail *column* that hosts one or more sections
// (`ConsoleShell`'s left/right rail wrappers, `BottomSheet`'s content area): that column applies
// `bg-surface` plus `divide-y divide-raised` so consecutive sections separate with a single
// hairline rule automatically, without this component rendering its own top/bottom border (which
// would double the line where two sections meet).
export const RailPanel = forwardRef<HTMLDivElement, RailPanelProps>(function RailPanel(
  { className, label, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn('p-4', className)} {...props}>
      {label ? (
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[.09em] text-subtle">
          {label}
        </div>
      ) : null}
      {children}
    </div>
  );
});
