import React from 'react';

import { cn } from '../../cn';
import type { RowActionGroupProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — lifecycle actions separated by DIAGONAL
// hairlines (ADR 0001), e.g. `Rotate ╱ Revoke ╱ Del`. Reveal-on-hover is the container's concern.
//
// DOCTRINE, RESOLVED (PRIMITIVES.md row `row-action-group` was corrected to match this, 2026-08-29
// — the doc and this file used to contradict each other, so every row-action PR re-litigated it):
// **daisy `join`/`join-item` is rejected here.** The audit that mandated it assumed `join` "only
// sets `--join-*` radii", which at `--radius-field: 0.125rem` would indeed be inert. Reading the
// shipped CSS (`daisyui@5.7.22/utilities/join.css`) says otherwise: `.join-item` declares
// `border-style: solid; border-width: var(--border, 1px)` plus a negative inline margin, i.e. it
// draws a real 1px border on every item and collapses them into one bordered strip. `--border` is
// `1px` in both our theme blocks, so this is not inert at all — it is the opposite of ADR 0001's
// borderless actions parted by a diagonal tick, and it contradicts the console-ui skill's "no
// borders except form controls, table hairlines and the chart baseline". Only `.join` itself (an
// `inline-flex` plus radius custom properties) is inert, and that buys nothing over `flex`.
//
// The hairline is a `::before` on every row after the first rather than its own `<span>`: it is
// pure decoration, so it belongs in CSS, not in the DOM — and a ledger renders this group once
// per row, so the node it saves is per row, not per page. It is deliberately NOT Base UI
// `Separator`: that primitive's whole contribution is `role="separator"` semantics, which would
// announce two extra separators on every single ledger row for a purely visual tick. daisy
// `divider` is likewise wrong — a full-width rule with its own margins and an optional text slot.
//
// Base UI **Menu** for overflow is still not wired: no consumer exceeds 3 actions (checked:
// `api-keys-ledger`, `manage-projects-ledger`). `cva()` is dropped for a plain object map (single
// `emphasis` axis, no multi-axis set survives the shrink policy).
const EMPHASIS_CLASS: Record<'strong' | 'default' | 'muted', string> = {
  strong: 'text-ink',
  default: 'text-soft',
  muted: 'text-subtle',
};

const ACTION_CLASS =
  'font-mono text-[11px] transition-colors duration-150 ease-out hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50';

// The diagonal hairline, centred in the group's own 16px gap (`-left-2` = half of `gap-4`).
// `pointer-events-none` keeps the 1px tick out of the neighbouring button's hit target.
const SEPARATOR_CLASS =
  "relative before:pointer-events-none before:absolute before:-left-2 before:top-1/2 before:h-3.5 before:w-px before:-translate-y-1/2 before:rotate-[20deg] before:bg-border before:content-['']";

export function RowActionGroup({
  actions,
  'aria-label': ariaLabel = 'Row actions',
  className,
}: RowActionGroupProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex items-center gap-4', className)}>
      {actions.map((action, index) => (
        <button
          key={action.key}
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
          className={cn(
            ACTION_CLASS,
            EMPHASIS_CLASS[action.emphasis ?? 'default'],
            index > 0 && SEPARATOR_CLASS
          )}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
