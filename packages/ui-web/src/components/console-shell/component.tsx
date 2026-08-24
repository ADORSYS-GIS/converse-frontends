import React from 'react';

import { cn } from '../../cn';
import type { ConsoleShellProps } from './types';

// Contract: docs/design/console-redesign/README.md §3 (shell and grid) — three-zone layout on
// the `--floor`. Gutters are 16/24/24/16 (px-4 outer margin, gap-6 between zones — Tailwind's
// 4/6 spacing steps are exactly 16px/24px). The left rail is a *stack* of panels (the consumer
// supplies that stack as `leftRail`); this component only owns the grid, never panel chrome.
export function ConsoleShell({
  tier,
  header,
  leftRail,
  rightRail,
  children,
  className,
}: ConsoleShellProps) {
  const showLeftRail = tier !== 'guard' && Boolean(leftRail);
  const showRightRail = tier === 'full' && Boolean(rightRail);

  return (
    <div className={cn('flex min-h-screen flex-col bg-muted', className)}>
      {header}
      <div className="flex flex-1 gap-6 px-4 py-6">
        {showLeftRail ? (
          <div
            className={cn(
              'flex flex-shrink-0 flex-col gap-2',
              tier === 'compact' ? 'w-[168px]' : 'w-52',
            )}
          >
            {leftRail}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
        {showRightRail ? <div className="w-[280px] flex-shrink-0">{rightRail}</div> : null}
      </div>
    </div>
  );
}
