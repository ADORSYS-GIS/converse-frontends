import React, { Fragment } from 'react';

import { cn } from '../../cn';
import { rowActionVariants } from './cva';
import type { RowActionGroupProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (data display) — lifecycle actions
// separated by DIAGONAL hairlines (ADR 0001), e.g. `Rotate ╱ Revoke ╱ Del`. Reveal-on-hover is
// the container's concern (e.g. LedgerTable's row wrapper); this component only renders the
// action list and its separators.
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
            className={rowActionVariants({ emphasis: action.emphasis })}
          >
            {action.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
