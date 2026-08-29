import React from 'react';

import { cn } from '../../cn';
import { INLINE_ROW_CLASS } from '../../lib/inline-row';
import { ROW_SIGNAL_CLASS } from '../../lib/type-roles';
import { Button } from '../button';
import type { ErrorLineProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (states) / §6 — a `--signal` mono line in
// place of the value, with a `Retry` ghost button on the same line.
//
// NO UPSTREAM for the line itself (daisy `alert` is rejected — bordered, iconed, rounded), but
// the Retry IS daisy: it comes through `Button`, which is `btn btn-ghost`. What remains is the
// shared inline-row geometry and the shared `row` role in the signal colour, so this component
// now declares no class of its own.
export function ErrorLine({ message, onRetry, retryLabel = 'Retry', className }: ErrorLineProps) {
  return (
    <div role="alert" className={cn(INLINE_ROW_CLASS, ROW_SIGNAL_CLASS, className)}>
      <span>{message}</span>
      {onRetry ? (
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
