import React from 'react';

import { cn } from '../../cn';
import { formatMoney } from '../../lib/money';
import type { ManageSelectionRailProps } from './types';

/** Heading for whichever host mounts this section — see `OVERVIEW_VIEW_RAIL_LABEL`'s note. */
export const MANAGE_SELECTION_RAIL_LABEL = 'Selection';

function money(value: number | null): string {
  return value === null ? '—' : formatMoney(value);
}

// Contract: docs/design/console-redesign/README.md §5.3 (manage-projects.svg) — the right rail's
// SELECTION section, retargeted to whichever ledger row the user picked. Its empty state is an
// inline mono status line, never a centered placard (console-ui skill §states).
//
// Selection-driven, so below `lg` it is reached through `SelectionSheet` rather than a trigger.
export function ManageSelectionRail({ project, className }: ManageSelectionRailProps) {
  if (!project) {
    return (
      <p className={cn('font-sans text-[11px] text-subtle', className)}>No rows selected.</p>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="font-mono text-sm text-ink">{project.name}</span>
      <span className="font-mono text-[11px] text-subtle">{project.account}</span>
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
        <span className="font-mono text-[11px] text-subtle">Spend MTD</span>
        <span className="font-mono text-xs text-soft">{money(project.spendMtd)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] text-subtle">Ceiling</span>
        <span className="font-mono text-xs text-soft">{money(project.ceiling)}</span>
      </div>
    </div>
  );
}
