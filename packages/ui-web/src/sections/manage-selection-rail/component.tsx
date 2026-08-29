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
    return <p className={cn('text-subtle font-sans text-[11px]', className)}>No rows selected.</p>;
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-ink font-mono text-sm">{project.name}</span>
      <span className="text-subtle font-mono text-[11px]">{project.account}</span>
      <div className="border-border flex items-baseline justify-between gap-3 border-t pt-2">
        <span className="text-subtle font-mono text-[11px]">Spend MTD</span>
        <span className="text-soft font-mono text-xs">{money(project.spendMtd)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-subtle font-mono text-[11px]">Quota tier</span>
        <span className="text-soft font-mono text-xs">{project.quotaTier ?? '—'}</span>
      </div>
    </div>
  );
}
