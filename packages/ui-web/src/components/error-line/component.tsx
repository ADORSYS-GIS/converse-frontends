import React from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import type { ErrorLineProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (states) / §6 — a `--signal` mono line in
// place of the value, with a `Retry` ghost button on the same line.
export function ErrorLine({ message, onRetry, retryLabel = 'Retry', className }: ErrorLineProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-wrap items-center gap-3 font-mono text-xs text-primary', className)}
    >
      <span>{message}</span>
      {onRetry ? (
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
