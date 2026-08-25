import React, { Fragment } from 'react';

import { cn } from '../../cn';
import type { RowActionGroupProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — lifecycle actions separated by DIAGONAL
// hairlines (ADR 0001), e.g. `Rotate ╱ Revoke ╱ Del`. Reveal-on-hover is the container's concern.
//
// ADR 0010 Decision 4 judgement call: daisy's `join` is NOT adopted — it collapses adjacent items
// into one bordered, radius-merged strip, the opposite of a plain rotated hairline with real gap
// on both sides and no borders/fills to merge. No consumer overflows past 3 actions (checked:
// `api-keys-ledger`), so PRIMITIVES.md's Base UI Menu overflow row isn't wired here. `cva()` is
// dropped for a plain object map (single `emphasis` axis, no multi-axis set survives the shrink
// policy).
const EMPHASIS_CLASS: Record<'strong' | 'default' | 'muted', string> = {
  strong: 'text-ink',
  default: 'text-soft',
  muted: 'text-subtle',
};

const ACTION_CLASS =
  'font-mono text-[11px] transition-colors duration-150 ease-out hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50';

export function RowActionGroup({
  actions,
  'aria-label': ariaLabel = 'Row actions',
  className,
}: RowActionGroupProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex items-center', className)}>
      {actions.map((action, index) => (
        <Fragment key={action.key}>
          {index > 0 ? (
            <span
              aria-hidden="true"
              className="mx-2 inline-block h-3.5 w-px shrink-0 bg-border"
              style={{ transform: 'rotate(20deg)' }}
            />
          ) : null}
          <button
            type="button"
            disabled={action.disabled}
            onClick={action.onClick}
            className={cn(ACTION_CLASS, EMPHASIS_CLASS[action.emphasis ?? 'default'])}>
            {action.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
