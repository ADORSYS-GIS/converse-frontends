import React from 'react';

import { cn } from '../../cn';
import type { RowActionGroupProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — lifecycle actions separated by DIAGONAL
// hairlines (ADR 0001), e.g. `Rotate ╱ Revoke ╱ Del`. Reveal-on-hover is the container's concern.
//
// The paint, the hairline and the reason daisy join is rejected all live in theme.css's
// `row-action-group` / `row-action` pair. Two things follow from that which matter here:
//
//  - the tick is drawn by the GROUP, as a pseudo-element on every button after the first, so
//    this file no longer threads an index through to decide which button wears a separator;
//  - the group is where the shrink went. Adopting daisy classes at the call site had pushed this
//    component from 22 hand-written utilities to 35, all of them corrections.
//
// Base UI **Menu** for overflow is still not wired: no consumer exceeds 3 actions (checked:
// the API-keys and manage-projects ledgers). `cva()` is dropped for a plain object map (single
// `emphasis` axis, no multi-axis set survives the shrink policy).
const EMPHASIS_CLASS: Record<'strong' | 'default' | 'muted', string> = {
  strong: 'text-ink',
  default: 'text-soft',
  muted: 'text-subtle',
};

export function RowActionGroup({
  actions,
  'aria-label': ariaLabel = 'Row actions',
  className,
}: RowActionGroupProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('row-action-group', className)}>
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
          className={cn('row-action', EMPHASIS_CLASS[action.emphasis ?? 'default'])}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
