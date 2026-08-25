import React from 'react';

import { cn } from '../../cn';
import type { ScopeRailProps } from './types';

/** Heading for whichever host mounts this section — see `OVERVIEW_VIEW_RAIL_LABEL`'s note. */
export const SCOPE_RAIL_LABEL = 'SCOPE';

// Contract: docs/design/console-redesign/README.md §3/§5.2 — the LEFT rail's read-only scope
// echo, stacked under the nav spine. Interactive scope selection lives in the right rail
// (`ScopeSelect`); this exists purely so the active account/project is never ambiguous while the
// user is reading the centre column.
export function ScopeRail({ accountLabel, projectLabel, className }: ScopeRailProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div>
        <div className="font-mono text-[10px] text-subtle">Account</div>
        <div className="font-mono text-xs text-ink">{accountLabel}</div>
      </div>
      <div>
        <div className="font-mono text-[10px] text-subtle">Project</div>
        <div className="font-mono text-xs text-ink">{projectLabel}</div>
      </div>
    </div>
  );
}
