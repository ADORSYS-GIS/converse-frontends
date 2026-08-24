import React, { forwardRef } from 'react';

import { cn } from '../../cn';
import type { RailPanelProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 (shell) — `#191919` surface, radius 2,
// no border, no shadow, 16px inset. Panels stack with 8–12px gaps; the gap is the consumer's
// concern (the left/right rail containers apply it), not this component's.
export const RailPanel = forwardRef<HTMLDivElement, RailPanelProps>(function RailPanel(
  { className, label, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn('rounded-[2px] bg-surface p-4', className)} {...props}>
      {label ? (
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[.09em] text-subtle">
          {label}
        </div>
      ) : null}
      {children}
    </div>
  );
});
