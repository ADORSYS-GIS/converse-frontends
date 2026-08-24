import React from 'react';

import { cn } from '../../cn';
import type { InlineStatusProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (states) / §6 — a single mono line above
// the content: "23 active · 4 revoked · 1 expires in 6 days". This is the empty-state primitive
// too: the table header / chart axes it sits above must stay rendered by the consumer.
export function InlineStatus({ children, action, className }: InlineStatusProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-soft',
        className,
      )}
    >
      <span>{children}</span>
      {action}
    </div>
  );
}
