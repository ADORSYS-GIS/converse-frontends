import React from 'react';

import { cn } from '../../cn';
import { useCopy } from '../../lib/copy';
import { INLINE_ROW_CLASS } from '../../lib/inline-row';
import { ERROR_TEXT_CLASS } from '../../lib/type-roles';
import { Button } from '../button';
import type { ErrorLineProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (states) / §6 — a `--signal` mono line in
// place of the value, with a `Retry` ghost button on the same line.
//
// NO UPSTREAM for the line itself (daisy `alert` is rejected — bordered, iconed, rounded), but
// the Retry IS daisy: it comes through `Button`, which is `btn btn-ghost`. What remains is the
// shared inline-row geometry and the shared `row` role in the signal colour, so this component
// now declares no class of its own.
export function ErrorLine({ message, onRetry, retryLabel, className }: ErrorLineProps) {
  // The default retry word comes from the copy context (ADR 0017's ui-web contract), which is
  // English unless a consumer overrides it — an explicit `retryLabel` prop still wins, since a
  // caller that names the action ("Try the usage backend again") means that specific wording.
  const copy = useCopy();
  const label = retryLabel ?? copy.retry;
  return (
    <div role="alert" className={cn(INLINE_ROW_CLASS, ERROR_TEXT_CLASS, className)}>
      <span>{message}</span>
      {onRetry ? (
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
          {label}
        </Button>
      ) : null}
    </div>
  );
}
